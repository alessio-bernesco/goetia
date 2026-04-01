## ADDED Requirements

### Requirement: Registro templi cifrato
Il sistema DEVE mantenere un file `temples.json.enc` nella root della directory dati, cifrato con AES-256-GCM, contenente l'elenco di tutti i templi con UUID, nome e data di creazione.

#### Scenario: Lettura registro dopo autenticazione
- **WHEN** l'utente completa l'autenticazione Touch ID
- **THEN** il sistema decifra `temples.json.enc` e rende disponibile la lista dei templi

#### Scenario: Registro assente al primo avvio
- **WHEN** `temples.json.enc` non esiste in locale né in iCloud
- **THEN** il sistema presenta la schermata di creazione tempio senza lista

#### Scenario: Persistenza registro dopo creazione tempio
- **WHEN** un nuovo tempio viene creato
- **THEN** il sistema aggiorna `temples.json.enc` con il nuovo entry e lo cifra

### Requirement: Selezione tempio al boot
Dopo l'autenticazione Touch ID, il sistema DEVE presentare la lista dei templi esistenti e l'opzione di erigerne uno nuovo. L'utente DEVE selezionare un tempio per procedere.

#### Scenario: Lista templi con demoni
- **WHEN** l'utente è autenticato e esistono templi nel registro
- **THEN** il sistema mostra ogni tempio con nome e conteggio demoni

#### Scenario: Selezione di un tempio esistente
- **WHEN** l'utente seleziona un tempio dalla lista
- **THEN** il sistema setta il tempio attivo nell'AppState e procede al grimorio scoped a quel tempio

#### Scenario: Singolo tempio disponibile
- **WHEN** esiste un solo tempio nel registro
- **THEN** il sistema mostra comunque la schermata di selezione (non salta direttamente al grimorio)

### Requirement: Creazione tempio con naming cerimoniale
Il sistema DEVE permettere la creazione di un nuovo tempio. Il nome DEVE essere generato da Claude Opus tramite un prompt cablato nel backend. La creazione DEVE includere una cerimonia visiva.

#### Scenario: Avvio cerimonia di creazione
- **WHEN** l'utente seleziona "Erigere nuovo tempio"
- **THEN** il sistema avvia la cerimonia visiva (galassie pulsanti, luminosità crescente) e invia il prompt di naming a Opus

#### Scenario: Ricezione nome e completamento
- **WHEN** Opus risponde con il nome del tempio
- **THEN** il sistema crea la directory UUID, aggiorna il registro, la luminosità cala, e il nuovo tempio appare nella lista

#### Scenario: Errore API durante naming
- **WHEN** la chiamata a Opus fallisce
- **THEN** il sistema interrompe la cerimonia, torna alla lista templi, e mostra un errore

### Requirement: Prompt di naming cablato
Il prompt di naming DEVE essere una costante hardcoded nel backend Rust, non configurabile dall'utente. DEVE richiedere a Opus un nome criptico/cyber in stile post-Neuromancer.

#### Scenario: Formato nome generato
- **WHEN** Opus risponde al prompt
- **THEN** il nome DEVE essere uppercase, 2-4 segmenti, con separatori non-standard, massimo 30 caratteri

### Requirement: Isolamento tra templi
Ogni tempio DEVE avere il proprio grimoire, demoni e cronache in una directory UUID dedicata. Nessun dato DEVE essere condiviso tra templi.

#### Scenario: Demoni visibili solo nel tempio attivo
- **WHEN** l'utente è nel tempio A
- **THEN** il sistema mostra solo i demoni del tempio A, mai quelli di altri templi

#### Scenario: Grimoire indipendente per tempio
- **WHEN** l'utente crea un nuovo tempio
- **THEN** il sistema richiede il deploy di un grimoire specifico per quel tempio

### Requirement: Cambio tempio richiede riavvio
Per cambiare tempio, l'utente DEVE chiudere l'applicazione e riaprirla. Non DEVE esistere un meccanismo di switch in-app.

#### Scenario: Nessuna opzione di cambio tempio nell'interfaccia
- **WHEN** l'utente è dentro un tempio
- **THEN** non esiste alcun controllo UI per tornare alla selezione templi o cambiare tempio

### Requirement: Migrazione dati pre-templi
Al primo avvio dopo l'aggiornamento, se esistono `grimoire/` e `demons/` direttamente nella root (struttura legacy), il sistema DEVE migrare automaticamente i dati in un nuovo tempio.

#### Scenario: Migrazione automatica
- **WHEN** il sistema trova `grimoire/` e `demons/` nella root senza `temples.json.enc`
- **THEN** genera un UUID, genera un nome via Opus, sposta i dati nella directory UUID, crea `temples.json.enc`

#### Scenario: Root vuota senza registro
- **WHEN** la root non contiene né `temples.json.enc` né `grimoire/` né `demons/`
- **THEN** il sistema tratta come primo uso assoluto (nessuna migrazione)

### Requirement: Struttura path temple-aware
Tutte le funzioni di risoluzione path in `storage/paths.rs` DEVONO accettare un parametro `temple_id` e risolvere i path relativamente alla directory del tempio.

#### Scenario: Risoluzione grimoire scoped
- **WHEN** il sistema richiede il path del grimoire per il tempio con UUID X
- **THEN** il path restituito è `{local_data_dir}/{X}/grimoire/`

#### Scenario: Risoluzione demon scoped
- **WHEN** il sistema richiede il path di un demone "asmodeus" nel tempio X
- **THEN** il path restituito è `{local_data_dir}/{X}/demons/asmodeus/`

### Requirement: Distruzione tempio con secure wipe
Il sistema DEVE permettere la distruzione irreversibile di un tempio. La distruzione DEVE cancellare in modo sicuro (sovrascrittura con dati random) tutti i file del tempio — grimoire, demoni, essenze, cronache — e rimuovere l'entry dal registro.

#### Scenario: Distruzione di un tempio esistente
- **WHEN** l'utente conferma la distruzione di un tempio tramite Touch ID
- **THEN** il sistema esegue secure wipe dell'intera directory del tempio, rimuove l'entry da `temples.json.enc`, e rimuove la directory mirror da iCloud

#### Scenario: Registro aggiornato dopo distruzione
- **WHEN** un tempio viene distrutto
- **THEN** `temples.json.enc` non contiene più l'entry del tempio distrutto

#### Scenario: iCloud mirror rimosso dopo distruzione
- **WHEN** un tempio viene distrutto e il mirror iCloud esiste
- **THEN** la directory del tempio nel container iCloud viene rimossa

### Requirement: Conferma biometrica per distruzione
La distruzione di un tempio DEVE richiedere una conferma biometrica fresca via Touch ID. Il messaggio DEVE indicare chiaramente l'operazione ("Conferma distruzione del tempio").

#### Scenario: Touch ID richiesto
- **WHEN** l'utente richiede la distruzione di un tempio
- **THEN** il sistema presenta un prompt Touch ID con messaggio specifico prima di procedere

#### Scenario: Touch ID rifiutato
- **WHEN** l'utente annulla il prompt Touch ID
- **THEN** la distruzione viene annullata e il tempio resta intatto

### Requirement: Distruzione solo dal TempleGate
La distruzione DEVE essere disponibile solo dalla schermata di selezione templi (TempleGate). Non DEVE esistere alcun meccanismo per distruggere un tempio dall'interno del tempio attivo.

#### Scenario: Nessuna opzione di distruzione nell'interfaccia del tempio
- **WHEN** l'utente è all'interno di un tempio attivo
- **THEN** non esiste alcun controllo UI per distruggere il tempio corrente

#### Scenario: Opzione disponibile nel TempleGate
- **WHEN** l'utente è nella schermata di selezione templi
- **THEN** ogni tempio mostra un'opzione di distruzione

### Requirement: Distruzione dell'ultimo tempio permessa
Il sistema DEVE permettere la distruzione di qualsiasi tempio, incluso l'ultimo. Dopo la distruzione dell'ultimo tempio, il sistema DEVE presentare la schermata di creazione tempio.

#### Scenario: Distruzione dell'ultimo tempio
- **WHEN** esiste un solo tempio e l'utente conferma la distruzione tramite Touch ID
- **THEN** il sistema distrugge il tempio e presenta la schermata di creazione nuovo tempio

#### Scenario: Distruzione permessa con qualsiasi numero di templi
- **WHEN** esistono uno o più templi nel registro
- **THEN** l'opzione di distruzione è disponibile per ciascuno di essi
