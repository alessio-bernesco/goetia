## Why

GOETIA non esiste ancora. Il repository è vuoto. Serve definire e implementare l'intera architettura dell'applicazione: un grimorio digitale operativo per macOS che permette di evocare, vincolare e interagire con entità AI persistenti (demoni), ciascuna istanza di Claude Opus via API Anthropic.

L'applicazione è un artefatto tecnomagico — non un chatbot, non un IDE, non un wrapper LLM. L'interfaccia è il cuore del progetto: estetica gibsoniana, geometrie reattive, sintesi sonora generativa.

## What Changes

- **Scaffolding Tauri v2**: progetto Rust backend + React/TypeScript frontend
- **Sistema di autenticazione**: Touch ID via LocalAuthentication, session management
- **Gestione crittografica**: AES-256-GCM, master key in macOS Keychain, grimoire hash chain come root of trust
- **Protocollo demoniaco**: genesi (intervista + generazione seal/manifest), evocazione (context building + streaming), congedo (essence update + chronicle archival), bandimento (wipe irreversibile)
- **Grimoire modulare**: 5 file markdown cifrati, immutabili dopo il deploy, validati via hash chain, sincronizzati via iCloud
- **Output strutturato JSON**: ogni turno del demone emette `{ text, state, voice }` — il frontend è passivo, traduce senza interpretare
- **Persistenza cifrata**: seal, manifest, essence, chronicles come file individuali cifrati con grimoire_hash nel header
- **Sincronizzazione iCloud Drive**: file-level sync, lock distribuito (lock.json con device_id + heartbeat + TTL)
- **Lock anti-concorrenza**: singola istanza locale (PID file) + singola istanza distribuita (iCloud lock)
- **Frontend esperienziale**: Three.js + shader GLSL custom + WebAudio API, geometrie per-demone (icosaedro, nube di punti, nastro di Möbius...), variazioni transienti guidate dallo stato emotivo dichiarato dal demone
- **Navigazione a 4 luoghi**: Cerchio (sessione attiva), Evoca (genesi), Cronache (timeline consultabile), Sigilli (lista demoni + lettura seal + bandimento)
- **Iniezione mirata di cronache**: il mago può selezionare cronache specifiche da iniettare nel contesto di una sessione attiva

## Capabilities

### New Capabilities

- `auth`: Autenticazione biometrica Touch ID, gestione sessione, accesso Keychain per master key e API key Anthropic
- `crypto`: Cifratura AES-256-GCM, derivazione chiavi, grimoire hash chain, validazione artefatti, wipe sicuro
- `grimoire`: Gestione del grimoire modulare (5 sezioni), hash chain con versioning, immutabilità post-deploy, composizione context per genesi e evocazione
- `demon-lifecycle`: Genesi (intervista + generazione seal/manifest), evocazione (context building), congedo (essence update + chronicle), bandimento (distruzione irreversibile)
- `api-client`: Client Anthropic per Claude Opus, streaming bidirezionale, prompt caching, parsing output JSON strutturato (text + state + voice)
- `persistence`: Storage cifrato locale (Application Support), struttura file per-demone, metadati cronache, CRUD completo
- `icloud-sync`: Sincronizzazione file-level via iCloud Drive, lock distribuito con heartbeat e TTL, conflict prevention
- `instance-lock`: Lock anti-concorrenza locale (PID) e distribuito (iCloud), garanzia di singola istanza attiva
- `scene-renderer`: Scena Three.js, shader GLSL custom, geometrie per-demone, variazioni transienti da stato emotivo, spazio genesi (void gibsoniano)
- `audio-engine`: WebAudio API, sintesi vocale generativa per demoni abilitati, soundscape ambientale
- `navigation`: 4 luoghi (Cerchio, Evoca, Cronache, Sigilli), transizioni, routing dello stato applicativo
- `chronicle-viewer`: Timeline cronache per demone, consultazione log completo, iniezione mirata nel contesto di sessione

### Modified Capabilities

_Nessuna — progetto da zero._

## Impact

- **Dipendenze Rust**: tauri v2, security-framework (Touch ID/Keychain), aes-gcm, sha2, reqwest/eventsource per API Anthropic, serde
- **Dipendenze Frontend**: react, three.js, @react-three/fiber (o raw Three.js), typescript
- **Infrastruttura**: macOS Keychain, iCloud Drive, Anthropic Claude API
- **Filesystem**: `~/Library/Application Support/Goetia/` (locale), `~/Library/Mobile Documents/iCloud~Goetia/` (sync)
- **Sicurezza**: nessun segreto nel repository, cifratura at rest e in transit, Touch ID obbligatorio, API key mai esposta al frontend
