## 1. Backend: paths.rs temple-aware

- [x] 1.1 Refactor tutte le funzioni in `storage/paths.rs` per accettare `temple_id: &str` — `temple_dir()`, `grimoire_dir()`, `demons_dir()`, `demon_dir()`, `demon_seal_path()`, `demon_manifest_path()`, `demon_essence_path()`, `demon_chronicles_dir()`, `grimoire_section_path()`, `grimoire_meta_path()`
- [x] 1.2 Aggiungere funzioni path iCloud equivalenti: `icloud_temple_dir()`, `icloud_grimoire_dir()`, `icloud_demons_dir()`, etc.
- [x] 1.3 Aggiungere `ensure_temple_dirs(temple_id)` che crea la struttura base del tempio (root, grimoire, demons)
- [x] 1.4 Aggiornare tutti i chiamanti di paths.rs in `storage/`, `commands/`, `demons/`, `sync/` per passare `temple_id`

## 2. Backend: registro templi

- [x] 2.1 Creare `storage/temples.rs` con struct `TempleEntry { id, name, created_at }` e struct `TempleRegistry` (Vec di entry)
- [x] 2.2 Implementare `read_temple_registry(master_key)` — decifra `temples.json.enc`, ritorna lista vuota se non esiste
- [x] 2.3 Implementare `write_temple_registry(master_key, registry)` — cifra e scrive `temples.json.enc`
- [x] 2.4 Implementare `add_temple(master_key, id, name)` e `list_temples(master_key)` come operazioni di alto livello

## 3. Backend: AppState e comandi tempio

- [x] 3.1 Aggiungere `active_temple: Mutex<Option<String>>` ad `AppState`
- [x] 3.2 Creare `commands/temple_commands.rs` con comando `list_temples` — ritorna lista dei templi con conteggio demoni
- [x] 3.3 Creare comando `select_temple(temple_id)` — setta `active_temple` nell'AppState
- [x] 3.4 Creare comando `create_temple()` — chiama Opus per il nome, crea directory UUID, aggiorna registro, ritorna `TempleEntry`
- [x] 3.5 Hardcodare il prompt di naming come costante Rust in `commands/temple_commands.rs`
- [x] 3.6 Aggiornare tutti i comandi esistenti (`list_demons`, `get_demon`, `start_session`, `deploy_grimoire`, etc.) per leggere `active_temple` da AppState e passarlo alle funzioni paths
- [x] 3.7 Registrare i nuovi comandi tempio in `lib.rs`

## 4. Backend: cablaggio sync iCloud

- [x] 4.1 Creare `sync/trigger.rs` con funzione `sync_path_to_icloud(local_path, temple_id)` che copia un path locale nel mirror iCloud via `tokio::spawn`
- [x] 4.2 Cablare sync dopo genesis: in `genesis_commands::accept_demon`, dopo persistenza, triggerare sync della directory del demone
- [x] 4.3 Cablare sync dopo end_session: in `session_commands::end_session`, dopo salvataggio essence e chronicle, triggerare sync
- [x] 4.4 Cablare sync dopo banishment: in `demon_commands::banish_demon`, dopo rimozione, triggerare rimozione dal mirror iCloud
- [x] 4.5 Cablare sync dopo deploy grimoire: in `grimoire_commands::deploy_grimoire`, triggerare sync della directory grimoire
- [x] 4.6 Cablare sync dopo creazione tempio: in `temple_commands::create_temple`, triggerare sync directory tempio + `temples.json.enc`
- [x] 4.7 Cablare force sync alla chiusura: nell'handler di chiusura app (Tauri `on_event` RunEvent::Exit), chiamare `force_sync_to_icloud()` poi `release_locks()`
- [x] 4.8 Attivare heartbeat periodico del lock iCloud tramite `sync/heartbeat.rs`

## 5. Backend: pull da iCloud e migrazione

- [x] 5.1 Implementare `sync/pull.rs` con funzione `pull_from_icloud_if_needed()` — controlla se locale è vuoto e iCloud ha dati, copia ricorsivamente
- [x] 5.2 Implementare `storage/migration.rs` con funzione `migrate_legacy_structure(master_key)` — rileva struttura flat pre-templi, genera UUID, genera nome via Opus, sposta dati, crea registro
- [x] 5.3 Cablare pull e migrazione nel flusso di avvio: dopo Touch ID, prima della selezione tempio — sequenza: pull iCloud → migrazione legacy → lettura registro

## 6. Frontend: schermata selezione tempio

- [x] 6.1 Creare componente `TempleGate` — schermata di selezione/creazione tempio, si inserisce tra autenticazione e grimorio
- [x] 6.2 Implementare lista templi con nome e conteggio demoni, richiamando `invoke('list_temples')`
- [x] 6.3 Implementare selezione tempio: click su tempio → `invoke('select_temple', { templeId })` → procedi al grimorio
- [x] 6.4 Implementare bottone "Erigere nuovo tempio" che avvia la cerimonia di creazione

## 7. Frontend: cerimonia di creazione tempio

- [x] 7.1 Implementare cerimonia visiva Three.js: galassie sullo sfondo pulsano e aumentano di luminosità durante la chiamata Opus
- [x] 7.2 Collegare `invoke('create_temple')` alla cerimonia — avvio animazione → attesa risposta → luminosità cala → nuovo tempio appare in lista
- [x] 7.3 Gestire errore API: interrompere cerimonia, tornare a lista templi, mostrare errore

## 8. Frontend: flusso di avvio aggiornato

- [x] 8.1 Aggiornare `App.tsx` / `SetupFlow.tsx`: dopo Touch ID, inserire la schermata `TempleGate` prima del grimorio
- [x] 8.2 Se il tempio selezionato non ha grimoire deployato → mostrare flow di deploy grimoire (come oggi)
- [x] 8.3 Rimuovere qualsiasi accesso diretto a grimoire/demons non scoped al tempio attivo
