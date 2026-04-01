## Why

Il vincolo "almeno un tempio deve esistere" è troppo restrittivo. Il mago deve poter distruggere anche l'ultimo tempio — l'app tornerà alla schermata di creazione tempio, come al primo avvio.

## What Changes

- Rimozione del check `temples.len() <= 1` nel comando `destroy_temple`
- Il bottone distruggi è visibile anche con un solo tempio
- Dopo distruzione dell'ultimo tempio, il TempleGate mostra solo l'opzione di creare un nuovo tempio

## Capabilities

### New Capabilities

### Modified Capabilities
- `temple-management`: rimozione del vincolo che impedisce la distruzione dell'ultimo tempio

## Impact

- **Backend Rust**: `commands/temple_commands.rs` (rimozione check)
- **Frontend React**: `ui/TempleGate.tsx` (rimozione condizione `canDestroy`)
