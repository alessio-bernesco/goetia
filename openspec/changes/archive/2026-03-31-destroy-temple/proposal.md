## Why

I templi possono essere creati ma non distrutti. Se il mago vuole eliminare un tempio — con tutto il suo grimoire, i demoni, le essenze e le cronache — non ha modo di farlo. Serve un'operazione di distruzione irreversibile, protetta da conferma biometrica, che cancelli in modo sicuro tutto il contenuto del tempio dal filesystem locale e dal mirror iCloud.

## What Changes

- **Comando `destroy_temple`**: nuovo comando Tauri che accetta un `temple_id`, richiede conferma Touch ID, esegue secure wipe di tutta la directory del tempio, rimuove l'entry dal registro, e cancella il mirror iCloud
- **Funzione `remove_temple` nel registry**: rimozione dell'entry dal `temples.json.enc`
- **UI di distruzione nel TempleGate**: opzione per distruggere un tempio dalla schermata di selezione, con conferma visiva prima dell'azione
- **Vincolo: non distruggere il tempio attivo** — la distruzione può avvenire solo dalla schermata di selezione, mai dall'interno di un tempio
- **Vincolo: almeno un tempio deve esistere** — se c'è un solo tempio, la distruzione non è permessa (l'app richiede almeno un tempio per funzionare)

## Capabilities

### New Capabilities

### Modified Capabilities
- `temple-management`: aggiunta della capacità di distruggere un tempio esistente con secure wipe, conferma biometrica, e rimozione dal registro e da iCloud

## Impact

- **Backend Rust**: `commands/temple_commands.rs` (nuovo comando `destroy_temple`), `storage/temples.rs` (funzione `remove_temple`), riutilizzo pattern secure wipe da `demons/banishment.rs`
- **Frontend React**: `ui/TempleGate.tsx` (bottone distruggi con conferma)
- **Sync**: rimozione directory tempio dal mirror iCloud via `sync/trigger.rs`
- **Dipendenze**: nessuna nuova dipendenza
