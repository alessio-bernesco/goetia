## ADDED Requirements

### Requirement: Genesis registry file
Il sistema MUST mantenere un file `genesis_registry.enc` cifrato con AES-256-GCM nella directory del grimorio. Il file contiene un array JSON di entry, una per demone attivo.

#### Scenario: Registry created on first genesis
- **WHEN** il primo demone viene creato e il registry non esiste
- **THEN** il file `genesis_registry.enc` viene creato con un array contenente una entry

#### Scenario: Registry encrypted
- **WHEN** il registry viene letto o scritto
- **THEN** usa la stessa master key e grimoire hash del resto della cifratura

### Requirement: Registry entry schema
Ogni entry MUST contenere: `demon_name` (string), `rank` (string), `geometry_type` (string — la forma principale o la prima forma per prince), `pattern` (string | null — solo prince), `body_shapes` (string[] — lista forme, singola per minor/major), `primary_color_hsl` ([H, S, L] come numeri), `created_at` (ISO 8601 timestamp).

#### Scenario: Minor entry
- **WHEN** un demone minor `tetrahedron` rosso viene creato
- **THEN** la entry ha `geometry_type: "tetrahedron"`, `pattern: null`, `body_shapes: ["tetrahedron"]`, `primary_color_hsl: [0, 70, 50]`

#### Scenario: Prince entry
- **WHEN** un prince `counter_rotating` con torus + dodecahedron viene creato
- **THEN** la entry ha `geometry_type: "torus"`, `pattern: "counter_rotating"`, `body_shapes: ["torus", "dodecahedron"]`

### Requirement: Registry append on creation
Dopo la creazione cifrata di un demone, il backend MUST appendere una entry al registry e ri-cifrare il file.

#### Scenario: Second demon adds entry
- **WHEN** un secondo demone viene creato
- **THEN** il registry contiene 2 entry

### Requirement: Registry remove on banishment
Quando un demone viene bandito, il backend MUST rimuovere la sua entry dal registry prima di cancellare i file del demone.

#### Scenario: Banished demon removed
- **WHEN** il demone "asmodeus" viene bandito
- **THEN** la entry con `demon_name: "asmodeus"` viene rimossa dal registry

#### Scenario: Banishment order
- **WHEN** un demone viene bandito
- **THEN** la entry viene rimossa dal registry PRIMA della cancellazione dei file del demone

### Requirement: Registry query by rank
Il backend MUST poter filtrare le entry del registry per rank, per alimentare l'algoritmo di repulsione.

#### Scenario: Query minor entries
- **WHEN** si genera un nuovo demone minor
- **THEN** il registry restituisce solo le entry con `rank: "minor"`
