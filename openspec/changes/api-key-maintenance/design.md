## Context

La API key Anthropic viene oggi salvata nel Keychain macOS al primo avvio tramite `SetupFlow` e recuperata ad ogni evocazione/genesis. Non esiste validazione, aggiornamento, eliminazione o recovery. Le primitive Keychain (`store_secret`, `retrieve_secret`, `delete_secret`, `has_secret`) sono già tutte implementate in `src-tauri/src/auth/keychain.rs` — `delete_secret` è dead code.

Il client API (`src-tauri/src/api/client.rs`) usa solo `POST /v1/messages`. L'endpoint `GET /v1/models` di Anthropic è gratuito e ideale per validare una key senza consumare token.

## Goals / Non-Goals

**Goals:**
- Validare la key con `GET /v1/models` prima di salvarla (setup iniziale e sostituzione)
- Esporre nel DebugPanel: verifica, sostituzione, eliminazione della key
- Intercettare errori 401 dall'API e offrire un flusso di recovery inline
- Mantenere l'atomicità: la key esistente non viene toccata se la nuova non è valida

**Non-Goals:**
- Rotazione automatica della key (non supportata da Anthropic)
- Gestione di key multiple o per-temple
- Monitoraggio dello stato della key in background (polling periodico)
- Modifica al flusso Touch ID o alla master key

## Decisions

### 1. Validazione via `GET /v1/models`

**Scelta**: chiamata `GET https://api.anthropic.com/v1/models` con header `x-api-key` e `anthropic-version`.

**Alternative considerate**:
- Chiamata a Haiku con un prompt minimale → costa token, anche se pochi
- Validazione solo del formato `sk-ant-*` → non verifica che la key sia attiva

**Rationale**: endpoint gratuito, restituisce 200 se la key è valida, 401 se non lo è. Nessun costo, risposta veloce.

### 2. Nuovi comandi Tauri

Tre nuovi comandi in `auth_commands.rs`:

| Comando | Firma | Logica |
|---------|-------|--------|
| `validate_api_key` | `(key: String) → Result<bool>` | `GET /v1/models` con la key fornita. `true` se 200, `false` se 401. Errore per altri status/network. |
| `delete_api_key` | `() → Result<()>` | Chiama `keychain::delete_secret(API_KEY_ACCOUNT)`. Rimuove `#[allow(dead_code)]` da `delete_secret`. |
| `update_api_key` | `(key: String) → Result<()>` | 1) `validate_api_key(&key)` 2) se valida: `delete_api_key()` + `store_api_key(&key)`. Se validazione fallisce, errore senza toccare la key esistente. |

**Nota**: `validate_api_key` è `async` perché fa una chiamata HTTP. Questo richiede che il comando Tauri sia async. Gli altri due restano sync.

### 3. Funzione di validazione nel client API

Aggiungere a `AnthropicClient` un metodo statico (non serve un'istanza completa):

```rust
pub async fn validate_key(api_key: &str) -> anyhow::Result<bool>
```

Usa `reqwest::Client` one-shot con gli header standard. Restituisce `true` per 200, `false` per 401, `Err` per tutto il resto.

In alternativa, una funzione libera in `api/client.rs` senza bisogno di istanziare `AnthropicClient`. Preferibile per semplicità — la validazione non ha bisogno dello stato del client.

### 4. Validazione nel SetupFlow

Il flusso attuale in `SetupFlow.tsx`:
1. Input key → click "SALVA NEL KEYCHAIN" → `invoke('store_api_key')` → avanti

Nuovo flusso:
1. Input key → click "VERIFICA E SALVA" → `invoke('validate_api_key')` → se valida: `invoke('store_api_key')` → avanti
2. Se non valida: messaggio d'errore inline, il mago può correggere e riprovare
3. Loading state durante la validazione (la chiamata HTTP può prendere 1-2s)

### 5. Sezione API KEY nel DebugPanel

Nuova sezione nel DebugPanel (`Ctrl+Shift+D`), posizionata in fondo nella zona SISTEMA:

- **Stato**: indicatore visivo (●) verde/rosso/grigio (valida/invalida/non verificata)
- **Ultima verifica**: timestamp locale
- **[VERIFICA ORA]**: chiama `validate_api_key` con la key dal Keychain (`get_api_key` → `validate_api_key`)
- **[SOSTITUISCI KEY]**: input per nuova key → `update_api_key` → feedback
- **[ELIMINA KEY]**: `delete_api_key` con conferma. Dopo l'eliminazione l'app torna allo stato di setup

### 6. Recovery su errore 401

Quando `create_message` riceve un 401 dall'API Anthropic:

- Il backend restituisce un errore tipizzato distinguibile (es. stringa che inizia con `AUTH_ERROR:` o un campo dedicato)
- Il frontend intercetta questo errore specifico nel flusso di evocazione/genesis
- Mostra un dialog modale: "La tua API key non è più valida" con input per nuova key
- Il dialog usa lo stesso flusso di `update_api_key` (valida → sostituisci)
- Dopo il successo, il mago può ritentare l'evocazione

**Scelta**: errore stringa con prefisso `AUTH_ERROR:` piuttosto che un enum Rust serializzato — più semplice, il frontend fa un `startsWith` check. Il protocollo errori potrà evolvere in futuro se necessario.

## Risks / Trade-offs

**[`GET /v1/models` potrebbe cambiare o richiedere billing]** → Rischio basso. È un endpoint documentato. Se cambia, la validazione fallisce gracefully e il salvataggio procede senza validazione con un warning.

**[Race condition su update: validate → delete → store]** → Non è un problema reale: operazione single-user, single-thread dal punto di vista dell'UI. Il Keychain è atomico per operazione singola.

**[Eliminazione key lascia l'app in stato inutilizzabile]** → By design: dopo `delete_api_key`, l'app deve tornare al flusso di setup. Il frontend resetta `hasApiKey` nello state.

**[Latenza della validazione nell'onboarding]** → 1-2 secondi per la chiamata HTTP. Accettabile con un loading indicator. Molto meglio che scoprire la key invalida alla prima evocazione.
