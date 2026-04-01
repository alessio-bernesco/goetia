## ADDED Requirements

### Requirement: Minor geometry schema
Il campo `manifest.geometry` per demoni di rank `minor` SHALL essere un oggetto JSON con: `type` (stringa dal catalogo minor: `tetrahedron`, `cube`, `octahedron`, `icosahedron`, `point_cloud`) e `rotation` (oggetto con `speed: number` e `axis: [number, number, number]`).

#### Scenario: Valid minor geometry
- **WHEN** un demone minor viene creato con geometry `{ "type": "cube", "rotation": { "speed": 0.01, "axis": [0, 1, 0] } }`
- **THEN** il manifest viene validato e persistito correttamente

#### Scenario: Minor with major form rejected
- **WHEN** un demone minor viene creato con geometry `{ "type": "torus", ... }`
- **THEN** la creazione MUST fallire con errore di geometria non ammessa per il rank

### Requirement: Major geometry schema
Il campo `manifest.geometry` per demoni di rank `major` SHALL essere un oggetto JSON con: `type` (stringa dal catalogo major: `torus`, `moebius`, `dodecahedron`, `torus_knot`, `fragmented_cube`), `params` opzionale (specifici per forma), e `rotation`.

#### Scenario: Valid major geometry with params
- **WHEN** un demone major viene creato con geometry `{ "type": "torus_knot", "params": { "p": 3, "q": 2 }, "rotation": { "speed": 0.015, "axis": [0.3, 1, 0] } }`
- **THEN** il manifest viene validato e persistito correttamente

#### Scenario: Major torus_knot with p equal to q rejected
- **WHEN** un demone major viene creato con geometry `{ "type": "torus_knot", "params": { "p": 3, "q": 3 } }`
- **THEN** la creazione MUST fallire perché p e q non possono essere uguali

### Requirement: Prince geometry schema
Il campo `manifest.geometry` per demoni di rank `prince` SHALL essere un oggetto JSON con: `type: "composite"`, `pattern` (uno dei 6 pattern: `counter_rotating`, `orbital`, `nested`, `crowned`, `binary`, `axis`), `bodies` (array di 2-3 oggetti body), `orbits` (array di oggetti orbit), `rotations` (array di oggetti rotation per body).

#### Scenario: Valid prince composite
- **WHEN** un demone prince viene creato con geometry `{ "type": "composite", "pattern": "nested", "bodies": [body0, body1], "orbits": [], "rotations": [rot0, rot1] }`
- **THEN** il manifest viene validato e persistito correttamente

#### Scenario: Prince with 1 body rejected
- **WHEN** un demone prince viene creato con geometry composite con 1 solo body
- **THEN** la creazione MUST fallire perché il minimo è 2 corpi

#### Scenario: Prince with 4 bodies rejected
- **WHEN** un demone prince viene creato con geometry composite con 4 bodies
- **THEN** la creazione MUST fallire perché il massimo è 3 corpi

### Requirement: Prince body object schema
Ogni body in un prince composite SHALL avere: `shape` (qualsiasi forma dal catalogo minor + major), `scale` (number), `color` (oggetto con `base: string` e `variance: number`), `opacity` (number), e opzionalmente `params` (specifici per forma).

#### Scenario: Prince body with minor shape
- **WHEN** un body ha `shape: "cube"` (forma dal catalogo minor)
- **THEN** il body è valido

#### Scenario: Prince body with major shape
- **WHEN** un body ha `shape: "torus_knot"` con `params: { "p": 2, "q": 3 }`
- **THEN** il body è valido

### Requirement: Prince orbit object schema
Ogni orbit SHALL specificare: `body` (indice nel bodies array), `center` ([x,y,z]), `axis` ([x,y,z]), `speed` (number), `direction` (1 o -1), `radius` (number), `phase` (number in gradi).

#### Scenario: Valid orbit
- **WHEN** un'orbit ha `{ "body": 1, "center": [0,0,0], "axis": [0,1,0], "speed": 0.01, "direction": 1, "radius": 1.2, "phase": 120 }`
- **THEN** l'orbit è valida

#### Scenario: Orbit referencing invalid body index
- **WHEN** un'orbit ha `body: 5` ma ci sono solo 2 bodies
- **THEN** la validazione MUST fallire

### Requirement: Manifest field reorganization
Il campo `rotation_speed` MUST essere rimosso dal livello top di `DemonManifest`. Per prince, `color` e `opacity` al livello top MUST essere ignorati — ogni body ha i propri. I campi `glow`, `pulse_frequency`, `noise_amplitude`, `scale` restano globali.

#### Scenario: rotation_speed removed
- **WHEN** un manifest viene serializzato
- **THEN** il campo `rotation_speed` non MUST esistere al livello top

### Requirement: Voice always present
Il campo `voice` nel manifest MUST essere sempre presente (non nullable). I parametri voce sono generati dal backend in base al rank.

#### Scenario: Voice present on minor
- **WHEN** un demone minor viene creato
- **THEN** il manifest contiene `voice` con `baseFrequency` nel range [280-400]

#### Scenario: Voice present on prince
- **WHEN** un demone prince viene creato
- **THEN** il manifest contiene `voice` con `baseFrequency` nel range [70-110]
