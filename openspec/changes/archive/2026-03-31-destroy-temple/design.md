## Context

I templi sono directory UUID sotto `~/Library/Application Support/Goetia/` contenenti `grimoire/` e `demons/`. Il registro `temples.json.enc` nella root tiene traccia di tutti i templi. Il pattern di distruzione sicura esiste già in `demons/banishment.rs` — sovrascrittura con dati random prima della cancellazione. La distruzione avviene dalla schermata `TempleGate`, mai dall'interno di un tempio attivo.

## Goals / Non-Goals

**Goals:**
- Permettere la distruzione irreversibile di un tempio con secure wipe
- Proteggere l'operazione con conferma biometrica Touch ID
- Rimuovere il tempio dal registro e dal mirror iCloud
- Impedire la distruzione dell'ultimo tempio rimasto

**Non-Goals:**
- Soft delete o archiviazione (la distruzione è definitiva)
- Conferma tramite prompt testuale (Touch ID è sufficiente)
- Backup automatico prima della distruzione

## Decisions

### 1. Riutilizzo pattern secure wipe da banishment

La funzione `wipe_directory_recursive` in `banishment.rs` sovrascrive ogni file con dati random prima di cancellarlo. Lo stesso pattern viene riutilizzato per la distruzione del tempio, applicato all'intera directory del tempio.

**Alternativa considerata**: semplice `fs::remove_dir_all`. Scartata perché i dati sono sensibili (sigilli, essenze, cronache) e devono essere cancellati in modo sicuro.

### 2. Distruzione solo dal TempleGate

La distruzione è disponibile solo dalla schermata di selezione templi, mai dall'interno di un tempio. Questo perché: (a) il tempio attivo non può essere distrutto mentre è in uso, (b) la distruzione è un'operazione di gestione, non operativa.

### 3. Conferma con Touch ID

Come il banishment dei demoni, la distruzione del tempio richiede una conferma biometrica fresca. Il messaggio Touch ID è specifico ("Conferma distruzione del tempio").

### 4. Vincolo: almeno un tempio

Se il registro contiene un solo tempio, il bottone di distruzione non è disponibile. L'app richiede almeno un tempio per funzionare — senza templi non c'è nulla da fare.

### 5. Flusso nel frontend

Il `TempleGate` mostra un indicatore discreto per ogni tempio (es. icona × o testo "DISTRUGGI"). Al click: stato di conferma visivo → Touch ID → se confermato, il tempio scompare dalla lista. Non è necessaria una cerimonia elaborata — la gravità dell'azione è comunicata dal Touch ID.

## Risks / Trade-offs

**[Distruzione accidentale]** → Mitigato da Touch ID obbligatorio. Non è possibile distruggere un tempio senza conferma biometrica.

**[Tempio con sessione attiva]** → La distruzione avviene dal TempleGate, dove nessun tempio è attivo. Non c'è rischio di distruggere un tempio in uso.

**[Latenza wipe su templi grandi]** → Un tempio con molti demoni e cronache può richiedere secondi per il wipe. Il frontend mostra un indicatore di caricamento durante l'operazione.
