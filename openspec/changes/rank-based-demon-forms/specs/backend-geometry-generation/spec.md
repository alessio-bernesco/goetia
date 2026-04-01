## ADDED Requirements

### Requirement: Backend generates manifest on genesis
Il backend Rust MUST generare l'intero `DemonManifest` (geometry, color, opacity, glow, voice) durante la genesi. Il modello AI produce solo `name` e `seal`. Nessun campo manifest nel JSON del modello.

#### Scenario: Model output without manifest accepted
- **WHEN** il modello produce `{ "name": "asmodeus", "seal": "# Sigillo..." }`
- **THEN** il backend genera il manifest completo e persiste il demone

#### Scenario: Genesis prompt simplified
- **WHEN** il sistema compone il system prompt di genesi (§3)
- **THEN** il prompt non contiene specifiche sui campi manifest, geometria, colore, o voce

### Requirement: Form selection weighted by rank catalog
Il backend MUST selezionare la forma tramite random pesato. Minor: catalogo `[tetrahedron, cube, octahedron, icosahedron, point_cloud]`. Major: catalogo `[torus, moebius, dodecahedron, torus_knot, fragmented_cube]`. Il peso è inversamente proporzionale al numero di demoni attivi con quella forma nello stesso rank.

#### Scenario: Unused form gets higher weight
- **WHEN** nel registry ci sono 3 minor con `tetrahedron` e 0 con `cube`
- **THEN** `cube` ha la massima probabilità di essere selezionato

#### Scenario: All forms equally used
- **WHEN** ogni forma nel catalogo minor ha lo stesso numero di occorrenze
- **THEN** la selezione è equiprobabile

### Requirement: Prince pattern selection weighted
Per i prince, il backend MUST selezionare il pattern compositivo tra `[counter_rotating, orbital, nested, crowned, binary, axis]` con random pesato (stessa logica della forma).

#### Scenario: Pattern diversity
- **WHEN** esistono 2 prince con pattern `nested` e 0 con `binary`
- **THEN** `binary` ha la massima probabilità

### Requirement: Color generation with intra-rank repulsion
Il backend MUST generare il colore in spazio HSL e verificare la distanza minima dai colori dei demoni attivi nello stesso rank. La distanza è `√(ΔH² + ΔS² + ΔL²)` con H normalizzato su [0,1]. Il backend genera N candidati e sceglie il più distante.

#### Scenario: First demon in rank
- **WHEN** non esistono demoni nel rank corrente
- **THEN** il colore è random entro il range del rank

#### Scenario: Repulsion from existing colors
- **WHEN** esistono demoni minor con colori a H=0° e H=120°
- **THEN** il colore generato tende verso H=240° (massima distanza)

#### Scenario: Repulsion is intra-rank only
- **WHEN** esiste un minor rosso (H=0°)
- **THEN** un prince può essere generato rosso senza penalità

### Requirement: Voice generation by rank
Il backend MUST generare i parametri voce con range fissi per rank:
- Minor: baseFrequency [280-400], formants alte, breathiness [0.1-0.25], speed [1.2-1.6]
- Major: baseFrequency [140-200], formants medie, breathiness [0.2-0.4], speed [0.9-1.1]
- Prince: baseFrequency [70-110], formants basse, breathiness [0.3-0.6], speed [0.5-0.8]

#### Scenario: Minor voice is shrill
- **WHEN** un demone minor viene creato
- **THEN** la voce ha baseFrequency ≥ 280 e speed ≥ 1.2

#### Scenario: Prince voice is deep and slow
- **WHEN** un demone prince viene creato
- **THEN** la voce ha baseFrequency ≤ 110 e speed ≤ 0.8

### Requirement: Major form params generation
Per le forme major con parametri, il backend MUST generare valori random entro i range: `torus` → `radius_ratio [0.2-0.5]`, `moebius` → `twists ∈ {1, 2, 3}`, `torus_knot` → `p ∈ {2, 3, 5}, q ∈ {2, 3, 7}, p ≠ q`.

#### Scenario: Torus knot valid params
- **WHEN** il backend genera un torus_knot
- **THEN** p e q sono diversi tra loro

### Requirement: Prince composite assembly
Per i prince, il backend MUST: scegliere un pattern, determinare il numero di corpi (2 o 3, vincolato dal pattern), selezionare le forme per ogni body dal catalogo completo (minor + major), generare colore/opacity/scale per ogni body, configurare orbite e rotazioni coerenti col pattern scelto.

#### Scenario: Counter rotating pattern
- **WHEN** il pattern è `counter_rotating`
- **THEN** ci sono esattamente 2 corpi con rotazioni su assi opposti o velocità di segno opposto

#### Scenario: Orbital pattern with 3 bodies
- **WHEN** il pattern è `orbital` con 3 corpi
- **THEN** 1 corpo è fisso al centro e 2 orbitano con fasi equidistanti (0° e 180°)

#### Scenario: Nested pattern
- **WHEN** il pattern è `nested`
- **THEN** ci sono 2 corpi, il body[0] ha scala minore del body[1]
