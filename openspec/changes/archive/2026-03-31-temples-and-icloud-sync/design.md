## Context

GOETIA opera oggi con una struttura dati piatta: `~/Library/Application Support/Goetia/` contiene direttamente `grimoire/` e `demons/`. Tutti i path in `storage/paths.rs` sono hardcoded a questa struttura. L'`AppState` non ha nozione di "tempio attivo".

Il modulo `sync/` contiene già l'infrastruttura iCloud (copy file, sync directory, force sync via NSFileCoordinator, lock distribuito con heartbeat/TTL), ma nessuna di queste funzioni è cablata nel flusso operativo — i moduli `icloud.rs` e `heartbeat.rs` sono `#[allow(dead_code)]`.

Il container iCloud è dichiarato in `paths.rs` come `~/Library/Mobile Documents/iCloud~com~goetia~app/`.

## Goals / Non-Goals

**Goals:**
- Permettere al mago di operare in templi isolati, ciascuno con grimoire e demoni propri
- Attivare il mirror asincrono locale→iCloud su ogni operazione di scrittura
- Supportare il primo avvio su un nuovo dispositivo (pull da iCloud)
- Cerimonia visiva di creazione tempio con naming generato da Opus
- Migrazione trasparente dei dati esistenti nel primo tempio

**Non-Goals:**
- Conflict resolution bidirezionale (il lock globale lo rende non necessario)
- Sync selettivo per-tempio (si sincronizza tutto)
- Operare in più templi simultaneamente
- Cambio tempio senza riavvio dell'app
- UI per rinominare o eliminare templi (futuro)

## Decisions

### 1. Struttura filesystem: UUID subfolder per tempio

Ogni tempio è un subfolder con nome UUID v4 nella root di Goetia. Un file `temples.json.enc` nella root mappa UUID → nome + metadati.

```
~/Library/Application Support/Goetia/
├── temples.json.enc
├── device_id
├── lock.pid
├── a3f1b2c4-.../
│   ├── grimoire/
│   └── demons/
└── e7d9f0a1-.../
    ├── grimoire/
    └── demons/
```

**Alternativa considerata**: nome tempio come folder name. Scartata perché i nomi contengono caratteri non-standard (∞, Ø, //) incompatibili col filesystem.

### 2. paths.rs diventa temple-aware

Tutte le funzioni di path (`grimoire_dir()`, `demons_dir()`, etc.) ricevono un parametro `temple_id: &str` (UUID). Il `local_data_dir()` resta invariato come root.

```rust
pub fn temple_dir(temple_id: &str) -> Result<PathBuf> {
    Ok(local_data_dir()?.join(temple_id))
}
pub fn grimoire_dir(temple_id: &str) -> Result<PathBuf> {
    Ok(temple_dir(temple_id)?.join("grimoire"))
}
// etc.
```

Lo stesso pattern si applica ai path iCloud.

**Alternativa considerata**: mantenere le funzioni senza parametro e usare una variabile globale per il tempio attivo. Scartata perché introduce stato implicito e rende il testing difficile.

### 3. AppState esteso con temple attivo

```rust
pub struct AppState {
    pub master_key: Mutex<Option<[u8; 32]>>,
    pub active_temple: Mutex<Option<String>>,  // UUID del tempio attivo
    pub genesis_session: tokio::sync::Mutex<Option<GenesisSession>>,
    pub evocation_session: tokio::sync::Mutex<Option<EvocationSession>>,
    pub model: Mutex<String>,
}
```

Il campo `active_temple` viene settato dopo la selezione e non cambia mai durante la sessione. Tutti i comandi che operano su file leggono il tempio attivo dall'`AppState`.

### 4. Registro templi cifrato

`temples.json.enc` è cifrato con AES-256-GCM usando la master key. Struttura interna:

```json
[
  {
    "id": "a3f1b2c4-...",
    "name": "TESSIER//ASHPOOL-7",
    "created_at": "2026-03-31T14:00:00Z"
  }
]
```

Il file viene letto dopo l'autenticazione Touch ID e prima della selezione tempio.

### 5. Sync asincrono con tokio::spawn

Ogni operazione di scrittura (genesis, end_session, banishment, deploy grimoire, creazione tempio) fa `tokio::spawn` di un task che copia i file modificati nel container iCloud. Il task è fire-and-forget — non blocca il comando principale.

Alla chiusura dell'app, `force_sync_to_icloud()` viene chiamato in modo sincrono prima di `release_locks()`, garantendo che l'ultimo stato sia sincronizzato.

**Alternativa considerata**: sync sincrono su ogni operazione. Scartata perché aggiunge latenza percepibile senza beneficio reale (il force sync alla chiusura copre il caso edge).

### 6. Pull da iCloud al primo avvio

Sequenza al boot:
1. Touch ID → master key disponibile
2. Controlla se `temples.json.enc` esiste in locale
3. Se non esiste ma esiste in iCloud → copia l'intero container iCloud in locale
4. Se non esiste da nessuna parte → primo uso assoluto, nessun tempio
5. Decifra `temples.json.enc` → mostra lista templi

Il pull è una copia ricorsiva una tantum. Non è un sync bidirezionale continuo.

### 7. Naming via Opus: singola API call

Il prompt di naming è hardcoded nel backend Rust. Alla creazione di un tempio:
1. Il frontend invia `invoke('create_temple')`
2. Il backend fa una singola chiamata ad Opus con il prompt cablato
3. Opus risponde con il nome
4. Il backend crea la directory UUID, aggiorna `temples.json.enc`, sync
5. Il frontend riceve `{ id, name }` e lo mostra

Il prompt è una costante Rust, non configurabile.

### 8. Lock globale nella root

Il lock resta nella root (`lock.pid` locale + `lock.json` iCloud), non per-tempio. Un solo dispositivo può operare in GOETIA alla volta, indipendentemente dal tempio.

### 9. Migrazione dati esistenti

Al primo avvio dopo l'aggiornamento, se esistono `grimoire/` e `demons/` direttamente nella root (struttura pre-templi):
1. Genera un UUID per il primo tempio
2. Genera un nome via Opus
3. Sposta `grimoire/` e `demons/` dentro il nuovo subfolder UUID
4. Crea `temples.json.enc` con il singolo tempio
5. Sync verso iCloud

La migrazione è automatica e trasparente.

## Risks / Trade-offs

**[Latenza naming]** → La chiamata Opus per il nome aggiunge 2-5 secondi alla creazione. Mitigato dalla cerimonia visiva che trasforma l'attesa in esperienza.

**[iCloud container non disponibile]** → L'utente potrebbe non avere iCloud abilitato o spazio sufficiente. Mitigato: il sync è best-effort, il locale è sempre la source of truth. L'app funziona perfettamente senza iCloud.

**[Pull iCloud incompleto]** → Se i file non sono ancora stati scaricati da iCloud (file "evicted"), la copia potrebbe essere parziale. Mitigato: usare NSFileCoordinator per forzare il download prima della copia.

**[Migrazione su dati corrotti]** → Se i file esistenti non sono decifrabili, la migrazione fallisce. Mitigato: la migrazione verifica la decifrabilità di `meta.json.enc` prima di procedere; se fallisce, tratta come primo uso.

**[Race condition sync]** → Un `tokio::spawn` potrebbe essere ancora in corso quando l'app si chiude. Mitigato: `force_sync` alla chiusura riscrive tutto, rendendo irrilevante l'eventuale sync parziale precedente.
