## ADDED Requirements

### Requirement: Debug form simulator section
Il DebugPanel MUST avere una sezione "DEMON FORM SIMULATOR" che permette di visualizzare forme demone per rank, sia con generazione random che con selezione manuale.

#### Scenario: Simulator visible
- **WHEN** il DebugPanel è aperto
- **THEN** la sezione DEMON FORM SIMULATOR è presente con selettore rank e preview 3D

### Requirement: Random generation by rank
Il simulatore MUST avere un bottone "Random" per ogni rank che invoca il backend per generare un manifest completo con l'algoritmo di generazione reale (stessa logica della genesi, ma senza persistere nel registry).

#### Scenario: Random minor
- **WHEN** l'utente clicca "Random" con rank minor selezionato
- **THEN** il backend genera un manifest minor random e il preview mostra la forma risultante

#### Scenario: Random prince
- **WHEN** l'utente clicca "Random" con rank prince selezionato
- **THEN** il backend genera un manifest prince composite e il preview mostra la composizione multi-corpo

### Requirement: Manual form selection
Il simulatore MUST permettere la selezione manuale della forma (catalogo minor per minor, major per major), del pattern (per prince), e del numero di corpi (per prince).

#### Scenario: Manual minor form
- **WHEN** l'utente seleziona rank minor e forma `octahedron`
- **THEN** il preview mostra un ottaedro

#### Scenario: Manual prince pattern
- **WHEN** l'utente seleziona rank prince e pattern `orbital`
- **THEN** il preview mostra una composizione con pattern orbitale

### Requirement: Debug command for manifest generation
Il backend MUST esporre un comando Tauri `debug_generate_manifest(rank)` che genera un manifest random senza persistere nel registry. Questo comando è usato solo dal simulatore debug.

#### Scenario: Command returns valid manifest
- **WHEN** `debug_generate_manifest("prince")` viene invocato
- **THEN** ritorna un DemonManifest valido con geometry composite

### Requirement: Existing debug features preserved
Le funzionalità debug esistenti (voice synth test, soundscape controls, waiting/speaking toggle, session monitor, prompt log) MUST restare invariate.

#### Scenario: Voice test still works
- **WHEN** l'utente usa i bottoni voice synth nel debug
- **THEN** le voci di test funzionano come prima
