## Why

GOETIA attualmente opera in un singolo spazio dati globale. Tutti i demoni, il grimoire e le cronache coesistono in un'unica directory. Il mago non ha modo di separare contesti operativi diversi — esperimenti, pratiche distinte, o semplicemente partizioni della propria volontà. Inoltre, il meccanismo di sincronizzazione iCloud, già parzialmente implementato a livello infrastrutturale, non è mai stato cablato nel flusso operativo dell'applicazione, lasciando i dati confinati a un singolo dispositivo.

## What Changes

- **Struttura a templi**: il dato viene riorganizzato in partizioni isolate (templi), ciascuna con il proprio grimoire, demoni e cronache. Ogni tempio è un subfolder UUID nella directory principale.
- **Registro templi**: un file cifrato `temples.json.enc` nella root traccia UUID, nome e data di creazione di ogni tempio.
- **Naming cerimoniale**: il nome di ogni tempio viene generato da Claude Opus tramite un prompt cablato nell'applicazione, con estetica crypto-gibsoniana. La creazione è un momento contemplativo con cerimonia visiva.
- **Selezione tempio al boot**: dopo Touch ID, l'app presenta la lista dei templi esistenti e l'opzione di erigerne uno nuovo. Per cambiare tempio bisogna chiudere e riaprire l'app.
- **Attivazione sync iCloud**: il mirror asincrono locale→iCloud viene cablato su tutti gli eventi di scrittura (genesis, fine sessione, banishment, deploy grimoire, creazione tempio). Force sync alla chiusura dell'app. Pull da iCloud al primo avvio su un nuovo dispositivo.
- **`paths.rs` temple-aware**: tutte le funzioni di risoluzione path diventano parametriche rispetto al tempio attivo.

## Capabilities

### New Capabilities
- `temple-management`: selezione, creazione e registrazione dei templi, naming cerimoniale via Opus, cerimonia visiva di creazione
- `icloud-sync`: attivazione del mirror asincrono locale↔iCloud, pull al primo avvio, force sync alla chiusura, lock globale distribuito

### Modified Capabilities

## Impact

- **Backend Rust**: `storage/paths.rs` (tutte le funzioni diventano temple-aware), `storage/mod.rs`, `commands/` (nuovo stato `active_temple` in `AppState`), `sync/` (cablaggio effettivo di `icloud.rs`, `force_sync.rs`, `heartbeat.rs`)
- **Frontend React**: nuovo flusso pre-grimoire per selezione/creazione tempio, cerimonia visiva Three.js per la genesi del tempio, aggiornamento di tutti i componenti che invocano comandi Tauri (passaggio temple context)
- **API Anthropic**: una singola chiamata Opus per la generazione del nome tempio (prompt cablato)
- **Filesystem**: migrazione della struttura dati esistente (singolo spazio → primo tempio)
- **Dipendenze**: nessuna nuova dipendenza
