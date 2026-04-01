## ADDED Requirements

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
- **THEN** ogni tempio (eccetto l'ultimo) mostra un'opzione di distruzione

### Requirement: Almeno un tempio deve esistere
Il sistema NON DEVE permettere la distruzione dell'ultimo tempio rimasto nel registro. L'applicazione richiede almeno un tempio per funzionare.

#### Scenario: Ultimo tempio non distruggibile
- **WHEN** esiste un solo tempio nel registro
- **THEN** l'opzione di distruzione non è disponibile per quel tempio

#### Scenario: Distruzione permessa con più templi
- **WHEN** esistono 2 o più templi nel registro
- **THEN** l'opzione di distruzione è disponibile per ciascuno di essi
