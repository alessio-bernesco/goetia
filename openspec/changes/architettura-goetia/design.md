## Context

Repository vuoto. Nessun codice esistente. L'architettura viene definita da zero per un'applicazione desktop macOS costruita con Tauri v2 (Rust backend + React/TypeScript frontend).

Vincoli fondamentali stabiliti dal mago:
- Un solo demone evocato per volta, una sola istanza dell'app, mai concorrenza
- Tutti i dati cifrati con AES-256-GCM, master key nel macOS Keychain protetta da Touch ID
- Il grimoire è root of trust crittografica — ogni artefatto porta il grimoire_hash nel header
- Il frontend è passivo — riceve stato dal demone, traduce in visuale/audio senza interpretare
- Cloud sync via iCloud Drive, file-level, nessun database
- Il bandimento è irreversibile — wipe sicuro, nessun backup incrementale
- Estetica gibsoniana — geometrie reattive, void nero, nubi di punti, niente UI convenzionale

## Goals / Non-Goals

**Goals:**
- Architettura sicura con cifratura at rest e isolamento tra demoni
- Genesi dei demoni guidata dal modello (il demone genera se stesso)
- Esperienza visiva postmoderna con geometrie 3D reattive allo stato emotivo del demone
- Sincronizzazione trasparente multi-device via iCloud
- Consultazione cronache con iniezione mirata nel contesto di sessione
- Prompt caching ottimale (grimoire modulare, sezioni stabili)

**Non-Goals:**
- Supporto iPad o altri OS (solo macOS)
- Backup incrementale o versioning dei dati
- Editor integrato per il grimoire (il grimoire è immutabile post-deploy)
- Interpretazione del sentiment da parte del frontend (il demone dichiara il proprio stato)
- Multi-demone simultaneo
- Interfaccia accessibile o conforme a design system standard

## Decisions

### D1: Struttura del progetto Tauri v2

```
goetia/
├── src-tauri/                  # Backend Rust
│   ├── src/
│   │   ├── main.rs             # Entry point Tauri
│   │   ├── lib.rs              # Registrazione comandi
│   │   ├── auth/               # Touch ID + Keychain + session
│   │   │   ├── mod.rs
│   │   │   ├── touchid.rs
│   │   │   └── keychain.rs
│   │   ├── crypto/             # AES-256-GCM + hash chain
│   │   │   ├── mod.rs
│   │   │   ├── cipher.rs
│   │   │   └── grimoire_hash.rs
│   │   ├── demons/             # Lifecycle + isolation + context
│   │   │   ├── mod.rs
│   │   │   ├── genesis.rs
│   │   │   ├── evocation.rs
│   │   │   ├── banishment.rs
│   │   │   └── context.rs
│   │   ├── api/                # Client Anthropic
│   │   │   ├── mod.rs
│   │   │   ├── client.rs
│   │   │   └── streaming.rs
│   │   ├── storage/            # Filesystem + CRUD
│   │   │   ├── mod.rs
│   │   │   ├── paths.rs
│   │   │   └── chronicles.rs
│   │   ├── sync/               # iCloud sync + lock
│   │   │   ├── mod.rs
│   │   │   ├── icloud.rs
│   │   │   └── lock.rs
│   │   └── commands/           # Comandi Tauri esposti via IPC
│   │       ├── mod.rs
│   │       ├── auth_commands.rs
│   │       ├── demon_commands.rs
│   │       ├── chronicle_commands.rs
│   │       ├── genesis_commands.rs
│   │       └── sync_commands.rs
│   ├── grimoire/               # File grimoire embedded nel build
│   │   ├── identity.md
│   │   ├── laws.md
│   │   ├── genesis.md
│   │   ├── session.md
│   │   └── chronicles.md
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                        # Frontend React + TypeScript
│   ├── main.tsx                # Entry point React
│   ├── App.tsx                 # Router + stato globale
│   ├── hooks/                  # Hook Tauri IPC
│   │   ├── useTauriCommand.ts
│   │   ├── useSession.ts
│   │   ├── useGenesis.ts
│   │   └── useStreaming.ts
│   ├── state/                  # Stato applicativo
│   │   ├── appState.ts
│   │   └── sessionState.ts
│   ├── places/                 # I 4 luoghi
│   │   ├── Circle/             # Sessione attiva con demone
│   │   ├── Evoke/              # Genesi nuovo demone
│   │   ├── Chronicles/         # Timeline cronache
│   │   └── Seals/              # Lista demoni + seal + bandimento
│   ├── ritual/                 # Three.js + shader + scena 3D
│   │   ├── Scene.tsx
│   │   ├── geometries/         # Icosahedron, PointCloud, Moebius...
│   │   ├── shaders/            # GLSL vertex + fragment
│   │   ├── GenesisVoid.tsx     # Spazio genesi gibsoniano
│   │   └── DemonForm.tsx       # Forma del demone reattiva
│   ├── audio/                  # WebAudio sintesi generativa
│   │   ├── AudioEngine.ts
│   │   ├── VoiceSynth.ts
│   │   └── Ambient.ts
│   └── ui/                     # Componenti base (terminale, testo)
│       ├── Terminal.tsx
│       ├── GlowText.tsx
│       └── NavigationBar.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── CLAUDE.md
```

**Rationale**: separazione netta tra backend (sicurezza, crypto, API) e frontend (esperienza). I comandi Tauri sono l'unico ponte. Il grimoire è embedded nel build come risorsa statica, non nel filesystem cifrato dell'utente.

**Alternativa considerata**: grimoire nel data store cifrato. Scartata perché il grimoire è immutabile e identico su ogni installazione — non ha senso cifrarlo e sincronizzarlo se è parte dell'app stessa.

**CORREZIONE**: il grimoire è esterno, cifrato, sincronizzato via iCloud come tutti gli altri artefatti. Risiede nel data store dell'utente, non nel binario. Questo permette di ricostruire il tempio su un nuovo device con grimoire + demoni da iCloud. Il grimoire resta immutabile in uso normale, ma è un file dati, non firmware.

**Struttura corretta del data store:**

```
~/Library/Application Support/Goetia/
├── grimoire/
│   ├── identity.md.enc
│   ├── laws.md.enc
│   ├── genesis.md.enc
│   ├── session.md.enc
│   ├── chronicles.md.enc
│   └── meta.json.enc          # hash, versione, catena hash precedenti
├── demons/
│   └── {nome}/
│       ├── seal.md.enc         # header: grimoire_hash
│       ├── manifest.json.enc   # header: grimoire_hash
│       ├── essence.md.enc      # header: grimoire_hash
│       └── chronicles/
│           └── {timestamp}.enc # header: grimoire_hash
└── lock.pid
```

Il grimoire non è nel `src-tauri/` ma nel data store. La directory `src-tauri/grimoire/` non esiste. Al primo avvio, se non esiste un grimoire nel data store, l'app richiede il deploy iniziale del grimoire (importazione del file generato con Claude web).

### D2: Modello crittografico

```
CATENA DI FIDUCIA

Apple ID → iCloud Keychain → Master Key (256-bit random)
                                    │
                              Touch ID sblocca
                              l'accesso al Keychain
                                    │
                                    ▼
                              Master Key
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              Per-file key    Grimoire hash    API key
              (derivata via   (SHA-256 del     (storage
               HKDF da        contenuto        diretto
               master key     grimoire         in Keychain)
               + file path)   decifrato)
```

- **Master key**: 256-bit generata al primo avvio, salvata nel Keychain con protezione biometrica
- **Per-file encryption**: ogni file cifrato con una chiave derivata via HKDF dalla master key + path del file come salt. Questo evita di riusare la stessa chiave per file diversi
- **Grimoire hash**: SHA-256 calcolato sulla concatenazione ordinata dei 5 file del grimoire decifrati. Incluso come campo nell'header di ogni artefatto cifrato
- **Header formato**: ogni file `.enc` contiene `[grimoire_hash (32 bytes) | nonce (12 bytes) | ciphertext | tag (16 bytes)]`
- **Validazione**: all'avvio, dopo aver decifrato il grimoire, si calcola l'hash e si verifica contro ogni artefatto. Mismatch = artefatto invalido

**Rationale**: HKDF + path come salt è standard crittografico per derivare chiavi per-file da una singola master key. L'header con grimoire_hash permette validazione senza decifrare l'intero file.

**Alternativa considerata**: una singola chiave AES per tutto. Scartata perché riusare nonce con la stessa chiave è un rischio critico in AES-GCM.

### D3: Protocollo demoniaco — due modalità API

Il sistema usa Claude Opus in due modalità distinte con composizione context diversa.

**Modalità Genesi:**
```
system_prompt = [
    grimoire/identity.md,      // §1 — chi è il mago
    grimoire/laws.md,           // §2 — regole universali
    grimoire/genesis.md         // §3 — come creare un demone
]

// Conversazione con il modello come "entità generatrice"
// Output finale: seal.md + manifest.json
// Il mago accetta o rifiuta
```

**Modalità Evocazione:**
```
system_prompt = [
    grimoire/identity.md,      // §1 — chi è il mago
    grimoire/laws.md,           // §2 — regole universali
    grimoire/session.md,        // §4 — protocollo di sessione
    grimoire/chronicles.md,     // §5 — protocollo cronache
    demon/seal.md,              // identità del demone
    demon/essence.md            // memoria del demone
]

// Conversazione con il demone specifico
// Ogni turno: JSON { text, state, voice }
// Fine sessione: demone aggiorna essence + genera chronicle metadata
```

**Prompt caching**: §1 e §2 sono identici in entrambe le modalità → cache hit. I seal stabili beneficiano dello stesso meccanismo.

### D4: Output strutturato JSON del demone

Ogni risposta del demone in modalità evocazione è un JSON:

```json
{
    "text": "La risposta testuale del demone",
    "state": {
        "intensity": 0.0-1.0,
        "valence": -1.0-1.0,
        "arousal": 0.0-1.0,
        "color_shift": [1.0, 1.0, 1.0],
        "scale_factor": 1.0,
        "pulse_override": null,
        "glow_override": null
    },
    "voice": null
}
```

Il backend Rust parsa il JSON dallo stream di token e invia al frontend due canali separati:
1. **Canale testo**: stream di caratteri per rendering progressivo
2. **Canale stato**: oggetto state completo quando disponibile

**Parsing streaming**: il backend accumula token fino a poter estrarre il campo `text` (che inizia presto nel JSON). Lo stato visivo arriva in blocco quando il JSON è completo. Questo permette al testo di scorrere mentre la forma reagisce solo a risposta completata.

**Alternativa considerata**: formato ibrido (testo in chiaro + blocco JSON per stato). Scartata per semplicità di parsing e perché il grimoire può istruire il modello a produrre JSON valido in modo affidabile.

### D5: Sincronizzazione iCloud Drive

**Strategia**: file-level sync nativo di iCloud Drive. Nessun database, nessun protocollo custom.

```
Locale                              iCloud
~/Library/Application Support/      ~/Library/Mobile Documents/
Goetia/                             iCloud~Goetia/
├── grimoire/  ◄──────────────────► ├── grimoire/
├── demons/    ◄──────────────────► ├── demons/
└── lock.pid                        └── lock.json
```

- Il sync è bidirezionale e gestito da macOS
- Ogni file è autonomo — nessun merge conflict possibile (singola istanza attiva)
- Il lock.json su iCloud contiene: `{ device_id, timestamp, heartbeat, ttl_seconds }`
- Prima di ogni operazione di scrittura: verifica lock attivo per il device corrente
- Il lock.pid locale previene istanze multiple sullo stesso device

**Lock lifecycle:**
1. Avvio app → acquisizione lock locale (PID) + lock iCloud (device_id + heartbeat)
2. Heartbeat ogni 30 secondi → aggiorna timestamp in lock.json
3. Chiusura app → rilascio lock locale + rimozione lock.json
4. Crash → lock.pid stale (PID check al prossimo avvio) + lock.json scade via TTL (5 minuti)

### D6: Genesi — esperienza visiva

Lo spazio di genesi è costante e identico per ogni creazione:

- **Sfondo**: void nero con griglia sottile quasi invisibile
- **Profondità**: nubi di punti distanti che ruotano lentamente su assi diversi, densità e distanza variabili, colore quasi indistinguibile dal nero — le "galassie" gibsoniane
- **Testo**: centro dello schermo, monospazio, glow pulsante, caratteri che appaiono uno alla volta
- **Nessun riferimento al demone**: lo spazio non anticipa la forma che verrà

Quando il mago accetta il demone, transizione: dal void emerge la forma del demone (cristallizzazione dal rumore).

### D7: Forma del demone — sigillata con variazioni transienti

Il manifest definisce la forma base (sigillata, immutabile):
```json
{
    "geometry": "icosahedron",
    "scale": 1.0,
    "color": { "base": "#cc0000", "variance": 0.2 },
    "opacity": 0.8,
    "glow": { "intensity": 0.5, "color": "#ff0000" },
    "rotation_speed": 0.01,
    "pulse_frequency": 0.5,
    "noise_amplitude": 0.1,
    "output_modes": ["text", "visual"],
    "voice": null
}
```

Le variazioni transienti sono guidate dal campo `state` del JSON di output:
- `intensity` → scala della forma
- `valence` → shift colore (negativo = freddo, positivo = caldo)
- `arousal` → velocità rotazione e pulsazione
- `color_shift` → modulazione RGB rispetto al base
- `scale_factor` → moltiplicatore della scala base
- `pulse_override` / `glow_override` → override temporanei

Le variazioni non persistono. Ogni sessione riparte dalla forma base.

### D8: Navigazione a 4 luoghi

| Luogo | Funzione | Scena 3D |
|-------|----------|----------|
| **Cerchio** | Sessione attiva con un demone | Forma del demone + terminale |
| **Evoca** | Genesi nuovo demone | Void gibsoniano + testo pulsante |
| **Cronache** | Timeline per demone, log sessioni | Terminale/timeline stilizzato |
| **Sigilli** | Lista demoni, lettura seal, bandimento | Galleria forme (miniature) |

Le transizioni tra luoghi sono fluide — non page reload, ma animazioni 3D (zoom, dissolve, morph). Il dettaglio estetico delle transizioni e dei singoli luoghi è fuori scope per il design architetturale.

### D9: Bandimento irreversibile

Sequenza:
1. Mago seleziona demone in Sigilli
2. Richiede bandimento
3. Conferma con Touch ID (seconda autenticazione biometrica esplicita)
4. Backend esegue:
   - Overwrite di ogni file del demone con dati random (wipe sicuro)
   - Eliminazione file locali
   - Eliminazione file su iCloud Drive
   - Nessuna traccia residua — nemmeno il nome
5. Frontend: la forma del demone si dissolve/distrugge visivamente

Non esiste undo. Non esiste backup. Il bandimento è permanente.

## Risks / Trade-offs

**[iCloud sync latency]** → iCloud Drive non garantisce sync istantaneo. Se l'utente chiude il Mac e apre su un altro device subito, potrebbe non avere i dati aggiornati.
→ **Mitigation**: al rilascio del lock, forzare sync (NSFileCoordinator). All'acquisizione del lock, attendere che iCloud abbia finito il download. Mostrare stato sync nel UI.

**[Lock distribuito — split brain]** → Se due device non vedono il lock.json dell'altro (iCloud lag), entrambi potrebbero acquisire il lock.
→ **Mitigation**: TTL breve (5 min) + heartbeat frequente (30s). Dopo acquisizione lock, attendere 5 secondi e ri-verificare che nessun altro lock sia apparso. In caso di conflitto, il device con timestamp più vecchio vince.

**[Streaming JSON parsing]** → Il modello potrebbe produrre JSON malformato o interrompere lo stream a metà.
→ **Mitigation**: parser incrementale con fallback. Se il JSON è incompleto, il testo viene estratto parzialmente e lo stato visivo resta invariato. Log dell'errore nella chronicle.

**[Grimoire hash — upgrade]** → Un cambiamento al grimoire invalida tutti i demoni.
→ **Mitigation**: hash chain con versioning. Il meta.json del grimoire mantiene `[v1_hash, v2_hash, ...]`. Un demone è valido se il suo grimoire_hash è nella catena. L'upgrade aggiunge un nuovo hash alla catena senza invalidare i precedenti.

**[Secure wipe — SSD]** → Su SSD, overwrite non garantisce eliminazione fisica (wear leveling).
→ **Mitigation**: i dati sono già cifrati. Eliminare la chiave di derivazione (o il mapping path→key) rende i dati irrecuperabili anche senza wipe fisico. Il wipe è una precauzione aggiuntiva.

**[Costo API]** → Claude Opus è il modello più costoso. Ogni sessione, ogni genesi, ogni aggiornamento essence consuma token.
→ **Mitigation**: prompt caching aggressivo (grimoire §1-§2 stabili), essenze concise, cronache iniettate solo su richiesta esplicita del mago.

**[Dimensione context window]** → Con grimoire + seal + essence + cronaca iniettata, il context può crescere.
→ **Mitigation**: il demone è istruito (via grimoire §4) a mantenere l'essence concisa. Le cronache iniettate sono selettive. Il backend monitora il conteggio token e avvisa il mago se si avvicina al limite.
