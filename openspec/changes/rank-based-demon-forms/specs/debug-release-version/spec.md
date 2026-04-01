## ADDED Requirements

### Requirement: Release version display in debug panel
Il DebugPanel MUST visualizzare la versione corrente dell'applicazione nella sezione SISTEMA.

#### Scenario: Version visible
- **WHEN** il DebugPanel è aperto
- **THEN** la sezione SISTEMA mostra la versione (es. "v0.2.0")

### Requirement: Version sourced from build
La versione MUST provenire dalla configurazione di build (Cargo.toml / tauri.conf.json), non hardcoded nel frontend.

#### Scenario: Version matches Cargo.toml
- **WHEN** la versione in `tauri.conf.json` è "0.2.0"
- **THEN** il debug panel mostra "v0.2.0"

### Requirement: Version bump to 0.2.0
Tutti i file di versione (`package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`) MUST essere aggiornati a `0.2.0`.

#### Scenario: Consistent version
- **WHEN** si verifica la versione nei tre file
- **THEN** tutti riportano `0.2.0`
