## Why

L'API key Anthropic è il cuore operativo di GOETIA — senza di essa nessun demone può essere evocato. Oggi il flusso è one-way: la key viene inserita al primo avvio e salvata nel Keychain, ma non esiste alcun modo per aggiornarla, validarla, o eliminarla dall'interno dell'applicazione. Se Anthropic revoca la key o il mago ne genera una nuova, l'unica via è intervenire manualmente nel Keychain di macOS. Un'app destinata a un utente finale deve gestire l'intero ciclo di vita della key.

## What Changes

- **Validazione eagerly**: prima di salvare una key (sia al setup iniziale che in sostituzione), viene verificata con una chiamata `GET /v1/models` — endpoint gratuito, zero token
- **Sostituzione key**: nuovo comando Tauri e UI nel DebugPanel per sostituire la key esistente con validazione atomica (la vecchia key non viene toccata se la nuova non è valida)
- **Eliminazione key**: esposizione della funzione `delete_secret()` già esistente come comando Tauri
- **Verifica on-demand**: pulsante nel DebugPanel per verificare che la key attualmente salvata sia ancora valida
- **Recovery su 401**: quando un'evocazione o genesis riceve un 401 dall'API, l'errore viene intercettato e il frontend mostra un dialog per reinserire la key

## Capabilities

### New Capabilities
- `api-key-lifecycle`: Validazione, sostituzione, eliminazione e recovery della API key Anthropic lungo tutto il ciclo di vita dell'applicazione

### Modified Capabilities
- `auth`: Aggiunta validazione obbligatoria della key nel flusso di setup iniziale (SetupFlow) prima del salvataggio in Keychain

## Impact

- **Backend Rust**: nuovi comandi Tauri (`validate_api_key`, `delete_api_key`, `update_api_key`), modifica al client API per esporre `GET /v1/models`
- **Frontend**: modifica a `SetupFlow.tsx` (validazione pre-salvataggio), nuova sezione in `DebugPanel.tsx`, nuovo dialog di recovery
- **Dipendenze**: nessuna nuova dipendenza — usa `reqwest` già presente
- **API**: una chiamata `GET /v1/models` per ogni validazione (gratuita)
