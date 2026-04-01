## MODIFIED Requirements

### Requirement: Almeno un tempio deve esistere
Il sistema DEVE permettere la distruzione di qualsiasi tempio, incluso l'ultimo. Dopo la distruzione dell'ultimo tempio, il sistema DEVE presentare la schermata di creazione tempio.

#### Scenario: Distruzione dell'ultimo tempio
- **WHEN** esiste un solo tempio e l'utente conferma la distruzione tramite Touch ID
- **THEN** il sistema distrugge il tempio e presenta la schermata di creazione nuovo tempio

#### Scenario: Distruzione permessa con qualsiasi numero di templi
- **WHEN** esistono uno o più templi nel registro
- **THEN** l'opzione di distruzione è disponibile per ciascuno di essi
