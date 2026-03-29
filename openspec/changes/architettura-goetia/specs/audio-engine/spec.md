## ADDED Requirements

### Requirement: WebAudio generative synthesis
The system SHALL use the WebAudio API for all audio output. No pre-recorded audio files SHALL be used. All sound MUST be generated in real-time via synthesis.

#### Scenario: Audio initialization
- **WHEN** GOETIA loads
- **THEN** a WebAudio AudioContext SHALL be initialized for generative sound synthesis

### Requirement: Voice synthesis for enabled demons
Demons with voice capability (defined in manifest `voice` field) SHALL have their text spoken through WebAudio synthesis. The voice characteristics SHALL be defined in the manifest and modulated by the demon's declared state.

#### Scenario: Voiced demon response
- **WHEN** a demon with `voice` enabled in its manifest responds
- **THEN** the system SHALL synthesize speech from the text using the voice parameters in the manifest, modulated by the `voice` field in the JSON output

#### Scenario: Non-voiced demon
- **WHEN** a demon without voice capability responds
- **THEN** no speech synthesis SHALL occur; output is text and/or visual only

### Requirement: Ambient soundscape
The system SHALL generate a subtle ambient soundscape that responds to the current application state (idle, genesis, evocation, browsing chronicles).

#### Scenario: Ambient during genesis
- **WHEN** the user is in the genesis void space
- **THEN** a minimal, dark ambient soundscape SHALL play — subtle, generative, non-melodic

#### Scenario: Ambient during evocation
- **WHEN** a demon session is active
- **THEN** the ambient soundscape SHALL subtly shift based on the demon's declared emotional state
