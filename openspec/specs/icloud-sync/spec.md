## ADDED Requirements

### Requirement: Mirror asincrono locale verso iCloud
Ogni operazione di scrittura su file cifrati DEVE triggerare un mirror asincrono verso il container iCloud. Il mirror è fire-and-forget e non DEVE bloccare l'operazione principale.

#### Scenario: Sync dopo creazione demone
- **WHEN** un demone viene creato (genesis completata)
- **THEN** il sistema copia asincronamente la directory del demone nel container iCloud

#### Scenario: Sync dopo fine sessione
- **WHEN** una sessione di evocazione termina (essence e chronicle salvate)
- **THEN** il sistema copia asincronamente essence e chronicle aggiornate nel container iCloud

#### Scenario: Sync dopo banishment
- **WHEN** un demone viene bandito
- **THEN** il sistema rimuove asincronamente la directory del demone dal container iCloud

#### Scenario: Sync dopo deploy grimoire
- **WHEN** il grimoire viene deployato in un tempio
- **THEN** il sistema copia asincronamente la directory grimoire nel container iCloud

#### Scenario: Sync dopo creazione tempio
- **WHEN** un nuovo tempio viene creato
- **THEN** il sistema copia asincronamente la directory del tempio e aggiorna `temples.json.enc` nel container iCloud

### Requirement: Force sync alla chiusura
Alla chiusura dell'applicazione, il sistema DEVE eseguire un force sync sincrono tramite NSFileCoordinator prima di rilasciare i lock.

#### Scenario: Chiusura normale dell'app
- **WHEN** l'utente chiude l'applicazione
- **THEN** il sistema esegue `force_sync_to_icloud()`, poi rilascia il lock PID e il lock iCloud

#### Scenario: iCloud non disponibile alla chiusura
- **WHEN** l'utente chiude l'app e iCloud non è disponibile
- **THEN** il force sync fallisce silenziosamente e i lock vengono comunque rilasciati

### Requirement: Pull da iCloud al primo avvio su nuovo dispositivo
Se il sistema rileva dati nel container iCloud ma nessun dato locale, DEVE copiare l'intero contenuto iCloud in locale prima di procedere.

#### Scenario: Primo avvio con dati iCloud presenti
- **WHEN** `temples.json.enc` non esiste in locale ma esiste in iCloud
- **THEN** il sistema copia ricorsivamente tutto il container iCloud in locale, poi procede normalmente

#### Scenario: Primo avvio senza dati ovunque
- **WHEN** `temples.json.enc` non esiste né in locale né in iCloud
- **THEN** il sistema procede come primo uso assoluto (nessun pull)

#### Scenario: Dati locali già presenti
- **WHEN** `temples.json.enc` esiste in locale
- **THEN** il sistema usa i dati locali, nessun pull da iCloud

### Requirement: iCloud è best-effort
Il sync iCloud DEVE essere best-effort. L'applicazione DEVE funzionare perfettamente senza iCloud. Nessun errore di sync DEVE bloccare l'operatività.

#### Scenario: iCloud non disponibile
- **WHEN** il container iCloud non esiste o non è accessibile
- **THEN** l'applicazione opera solo in locale senza errori visibili

#### Scenario: Errore durante sync asincrono
- **WHEN** una operazione di sync asincrono fallisce
- **THEN** l'errore viene loggato ma non interrompe l'operazione principale

### Requirement: Lock globale distribuito
Il sistema DEVE acquisire un lock globale (PID locale + iCloud distribuito) all'avvio e rilasciarlo alla chiusura. Un solo dispositivo DEVE poter operare in GOETIA alla volta.

#### Scenario: Acquisizione lock all'avvio
- **WHEN** l'utente si autentica con Touch ID
- **THEN** il sistema acquisisce il lock PID locale e il lock iCloud distribuito

#### Scenario: Lock già detenuto da altro dispositivo
- **WHEN** il lock iCloud è detenuto da un altro dispositivo e non è scaduto
- **THEN** il sistema mostra un errore e impedisce l'accesso

#### Scenario: Lock scaduto da altro dispositivo
- **WHEN** il lock iCloud è scaduto (heartbeat + TTL superato)
- **THEN** il sistema prende possesso del lock e procede normalmente

### Requirement: Heartbeat del lock
Il sistema DEVE aggiornare periodicamente il heartbeat del lock iCloud durante l'operatività, per segnalare che il dispositivo è ancora attivo.

#### Scenario: Aggiornamento periodico
- **WHEN** l'app è in esecuzione
- **THEN** il sistema aggiorna il campo heartbeat del lock iCloud a intervalli regolari (entro il TTL)

#### Scenario: App crashata
- **WHEN** l'app crasha senza rilasciare il lock
- **THEN** il lock scade naturalmente dopo il TTL, permettendo ad altri dispositivi di acquisirlo

### Requirement: Struttura iCloud speculare
Il container iCloud DEVE avere una struttura identica a quella locale, inclusa la struttura a templi.

#### Scenario: Mirror fedele
- **WHEN** il sistema sincronizza verso iCloud
- **THEN** i path nel container iCloud corrispondono esattamente ai path locali relativi alla root dati
