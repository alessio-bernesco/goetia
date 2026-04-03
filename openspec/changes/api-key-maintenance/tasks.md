## 1. Backend — Validazione API key

- [x] 1.1 Aggiungere funzione `validate_key(api_key: &str) -> Result<bool>` in `src-tauri/src/api/client.rs` — `GET /v1/models` con header `x-api-key` e `anthropic-version`, restituisce `true` per 200, `false` per 401, errore per il resto
- [x] 1.2 Rimuovere `#[allow(dead_code)]` da `delete_secret` in `keychain.rs`

## 2. Backend — Nuovi comandi Tauri

- [x] 2.1 Aggiungere comando `validate_api_key(key: String) -> Result<bool, String>` (async) in `auth_commands.rs` — chiama `validate_key`
- [x] 2.2 Aggiungere comando `delete_api_key() -> Result<(), String>` in `auth_commands.rs` — chiama `keychain::delete_secret(API_KEY_ACCOUNT)`
- [x] 2.3 Aggiungere comando `update_api_key(key: String) -> Result<(), String>` (async) in `auth_commands.rs` — valida, poi delete + store. Errore se validazione fallisce
- [x] 2.4 Aggiungere comando `verify_stored_api_key() -> Result<bool, String>` (async) in `auth_commands.rs` — recupera key dal Keychain e la valida
- [x] 2.5 Registrare i nuovi comandi in `lib.rs` nel builder Tauri

## 3. Backend — Error typing per 401

- [x] 3.1 Modificare la gestione errori HTTP in `api/client.rs` per prefissare gli errori 401 con `AUTH_ERROR:` così il frontend possa distinguerli

## 4. Frontend — Validazione nel SetupFlow

- [x] 4.1 Modificare `SetupFlow.tsx`: il click su "SALVA" chiama prima `validate_api_key`, poi `store_api_key` solo se valida
- [x] 4.2 Aggiungere loading state durante la validazione (spinner o indicatore)
- [x] 4.3 Aggiungere messaggio d'errore inline per key invalida con possibilità di riprovare

## 5. Frontend — Sezione DebugPanel

- [x] 5.1 Aggiungere sezione "API KEY" nel DebugPanel nella zona SISTEMA con stato (indicatore colorato), timestamp ultima verifica
- [x] 5.2 Implementare pulsante "VERIFICA ORA" — chiama `verify_stored_api_key`, aggiorna stato e timestamp
- [x] 5.3 Implementare flusso "SOSTITUISCI KEY" — input nuova key, chiama `update_api_key`, feedback visivo
- [x] 5.4 Implementare pulsante "ELIMINA KEY" con conferma — chiama `delete_api_key`, resetta `hasApiKey` nello state, torna al setup flow

## 6. Frontend — Recovery su 401

- [x] 6.1 Intercettare errori `AUTH_ERROR:` nel flusso di evocazione e genesis
- [x] 6.2 Creare dialog modale di recovery: messaggio + input nuova key + validazione + sostituzione
- [x] 6.3 Dopo recovery riuscito, permettere al mago di ritentare l'operazione
