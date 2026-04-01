## ADDED Requirements

### Requirement: Composite group rendering
Per demoni prince con `geometry.type: "composite"`, il renderer Three.js MUST creare un `THREE.Group` root contenente N mesh figli (uno per body). Ogni mesh ha la propria geometria, materiale, colore e opacità.

#### Scenario: Two-body composite
- **WHEN** un prince ha 2 bodies (torus + point_cloud)
- **THEN** il Group contiene 2 mesh con geometrie e materiali distinti

#### Scenario: Three-body composite
- **WHEN** un prince ha 3 bodies
- **THEN** il Group contiene 3 mesh

### Requirement: Per-body color and opacity
Ogni body in un composite MUST usare il proprio `color` e `opacity`, non i valori globali del manifest.

#### Scenario: Different colors per body
- **WHEN** body[0] ha colore `#8a3a5a` e body[1] ha colore `#5a3a8a`
- **THEN** i due mesh hanno materiali con colori diversi

### Requirement: Independent rotations
Ogni body in un composite MUST ruotare indipendentemente secondo il proprio oggetto in `rotations[]`. La velocità può essere negativa (controrotazione).

#### Scenario: Counter rotation
- **WHEN** body[0] ha speed `0.01` e body[1] ha speed `-0.01`
- **THEN** i due mesh ruotano in direzioni opposte

### Requirement: Orbital animation
I body con un'entry in `orbits[]` MUST orbitare attorno al `center` specificato, lungo l'`axis`, con `radius`, `speed`, `direction` e `phase` iniziale.

#### Scenario: Orbital with phase offset
- **WHEN** body[1] ha orbit con phase `120°` e body[2] con phase `240°`
- **THEN** i due corpi sono equidistanti sull'orbita

#### Scenario: Orbit radius
- **WHEN** un body ha orbit con radius `1.5`
- **THEN** il body orbita a distanza 1.5 dal centro

### Requirement: Shared shader uniforms
I campi `glow`, `pulse_frequency`, `noise_amplitude` del manifest MUST essere applicati come uniforms condivisi a tutti i body nel composite. Lo shader vertex/fragment esistente si applica a ciascun body.

#### Scenario: Glow on all bodies
- **WHEN** il manifest ha `glow.intensity: 1.2`
- **THEN** ogni body nel composite ha `uGlowIntensity: 1.2`

### Requirement: Speaking and waiting on composite
Gli stati `speaking` e `waiting` MUST propagarsi a tutti i body del composite simultaneamente.

#### Scenario: Speaking perturbation
- **WHEN** il demone prince sta parlando
- **THEN** tutti i body mostrano la perturbazione di speaking

### Requirement: New geometries
Il frontend MUST supportare le nuove geometrie: `cube` (THREE.BoxGeometry), `octahedron` (THREE.OctahedronGeometry), `dodecahedron` (THREE.DodecahedronGeometry), `torus_knot` (THREE.TorusKnotGeometry con p e q dai params).

#### Scenario: Octahedron creation
- **WHEN** un body ha shape `octahedron`
- **THEN** viene creata una `THREE.OctahedronGeometry`

#### Scenario: Torus knot with params
- **WHEN** un body ha shape `torus_knot` con params `{ "p": 3, "q": 2 }`
- **THEN** viene creata una `THREE.TorusKnotGeometry` con p=3, q=2

### Requirement: Backward compatibility for single forms
Per minor e major (geometry con singolo `type` non `composite`), il renderer MUST continuare a funzionare come oggi — singolo mesh con shader material e wireframe overlay.

#### Scenario: Minor renders as single mesh
- **WHEN** un minor ha geometry `{ "type": "cube", "rotation": {...} }`
- **THEN** il renderer crea un singolo mesh con shader + wireframe, come prima
