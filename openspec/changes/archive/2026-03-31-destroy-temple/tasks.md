## 1. Backend: storage/temples.rs

- [x] 1.1 Aggiungere funzione `remove_temple(master_key, temple_id)` che rimuove l'entry dal registro `temples.json.enc`

## 2. Backend: comando destroy_temple

- [x] 2.1 Creare comando `destroy_temple(temple_id)` in `commands/temple_commands.rs` — conferma Touch ID, verifica che non sia l'ultimo tempio, esegue secure wipe della directory, rimuove dal registro, rimuove mirror iCloud
- [x] 2.2 Estrarre `wipe_directory_recursive` da `demons/banishment.rs` in un modulo condiviso `crypto/wipe.rs` (o riutilizzare direttamente da banishment)
- [x] 2.3 Registrare `destroy_temple` in `lib.rs`

## 3. Backend: sync iCloud

- [x] 3.1 Aggiungere funzione `remove_temple_from_icloud(temple_id)` in `sync/trigger.rs` che rimuove asincronamente la directory del tempio dal container iCloud
- [x] 3.2 Cablare il sync del registro aggiornato dopo distruzione (`sync_registry_to_icloud`)

## 4. Frontend: UI distruzione nel TempleGate

- [x] 4.1 Aggiungere opzione "DISTRUGGI" per ogni tempio nel `TempleGate`, visibile solo se esistono 2+ templi
- [x] 4.2 Implementare stato di conferma: click su distruggi → mostra conferma → `invoke('destroy_temple', { templeId })` → tempio rimosso dalla lista
- [x] 4.3 Gestire errore (Touch ID annullato, errore wipe) — tornare allo stato normale con messaggio errore
