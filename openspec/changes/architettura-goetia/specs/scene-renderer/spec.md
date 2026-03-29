## ADDED Requirements

### Requirement: Three.js 3D scene
The system SHALL render a persistent 3D scene using Three.js with custom GLSL shaders. The scene SHALL be the primary visual space of the application across all four navigation places.

#### Scenario: Scene initialization
- **WHEN** GOETIA loads after authentication
- **THEN** a Three.js WebGL scene SHALL be initialized covering the full viewport with a black void background

### Requirement: Genesis void space
The genesis visual space SHALL be constant and identical for every demon creation. It SHALL consist of a black void with distant rotating point clouds (Gibsonian "galaxies") and centered pulsing monospace text.

#### Scenario: Genesis space rendering
- **WHEN** the user enters the Evoke place for a new genesis
- **THEN** the scene SHALL display: black background, faint grid, distant point cloud clusters rotating on different axes at different distances, and centered glowing monospace text appearing character by character

#### Scenario: Genesis space consistency
- **WHEN** multiple geneses are initiated over time
- **THEN** the visual space SHALL be identical each time — no information about the demon being generated SHALL affect the genesis space

### Requirement: Demon form rendering from manifest
Each demon SHALL be rendered as a 3D geometric form defined by its sealed manifest. Supported base geometries SHALL include at minimum: icosahedron, point cloud, Möbius strip, torus, fragmented cube, tetrahedron.

#### Scenario: Demon form display
- **WHEN** a demon is evoked in the Circle place
- **THEN** the system SHALL render the demon's geometry as defined in manifest.json with the specified base color, scale, opacity, glow, rotation speed, and pulse frequency

### Requirement: Transient visual state from demon output
The demon's declared emotional state (the `state` field in JSON output) SHALL drive transient visual variations of the form. These variations MUST NOT persist between sessions.

#### Scenario: State-driven visual modulation
- **WHEN** the frontend receives a `state` object from a demon response
- **THEN** it SHALL apply: `intensity` → scale, `valence` → color temperature shift, `arousal` → rotation/pulse speed, `color_shift` → RGB modulation, `scale_factor` → scale multiplier, `pulse_override` / `glow_override` → temporary overrides

#### Scenario: Session start visual reset
- **WHEN** a new session starts with a demon
- **THEN** the visual state SHALL reset to the manifest base values with no transient modulations

### Requirement: Demon crystallization transition
When a demon is accepted during genesis, the visual space SHALL transition from the genesis void to the demon's form through a crystallization animation — the form emerges from the background noise.

#### Scenario: Acceptance transition
- **WHEN** the user accepts a newly generated demon
- **THEN** the scene SHALL animate a transition from the genesis void to the demon's geometry crystallizing from the point cloud noise

### Requirement: Banishment visual destruction
When a demon is banished, the visual form SHALL dissolve or fragment before disappearing.

#### Scenario: Banishment animation
- **WHEN** a demon banishment is confirmed and executed
- **THEN** the demon's 3D form SHALL visually dissolve/fragment/scatter before the scene transitions away
