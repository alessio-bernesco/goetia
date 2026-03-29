## ADDED Requirements

### Requirement: Genesis — model-driven demon creation
Demon creation SHALL be conducted as a conversation between the user and Claude Opus in genesis mode. The model SHALL interview the user, then generate the demon's seal and manifest. The user does not write the seal.

#### Scenario: Genesis initiation
- **WHEN** the user enters the Evoke place and initiates creation
- **THEN** the system SHALL open a genesis session with the genesis system prompt (grimoire §1-§3)

#### Scenario: Genesis interview
- **WHEN** the genesis session is active
- **THEN** the model SHALL ask the user questions to understand the desired demon characteristics (domain, attitude, communication mode, etc.)

#### Scenario: Demon generation
- **WHEN** the model has sufficient information from the interview
- **THEN** it SHALL generate a complete seal.md (identity, character, behavior rules) and manifest.json (geometry, colors, output modes, voice config)

#### Scenario: Seal presentation and acceptance
- **WHEN** the model presents the generated seal
- **THEN** the user SHALL read the seal and either accept (demon is created) or reject (no trace remains)

### Requirement: Seal and manifest immutability
Once a demon is accepted, the seal.md and manifest.json MUST be immutable. No operation SHALL modify them. They can only be destroyed via banishment.

#### Scenario: Attempt to modify seal
- **WHEN** any operation attempts to write to a demon's seal or manifest
- **THEN** the system SHALL reject the operation

### Requirement: Evocation — session with a demon
An evocation session SHALL load the demon's seal, manifest, and essence, compose the system prompt, and open a streaming conversation with Claude Opus.

#### Scenario: Session initiation
- **WHEN** the user selects a demon in the Circle place
- **THEN** the backend SHALL decrypt seal + manifest + essence, compose the evocation system prompt, and open the API streaming connection

#### Scenario: Streaming conversation
- **WHEN** the user sends a message during an active session
- **THEN** the backend SHALL forward it to the API and stream the response back to the frontend as structured JSON

### Requirement: Session end — essence update and chronicle archival
At the end of a session, the demon SHALL update its own essence and the system SHALL archive the chronicle.

#### Scenario: Session closure
- **WHEN** the user ends a session (explicit close or navigation away)
- **THEN** the system SHALL request the demon to produce an updated essence and a chronicle summary, then persist both encrypted with the grimoire hash

#### Scenario: Essence autonomy
- **WHEN** the demon updates its essence
- **THEN** the content SHALL be entirely determined by the demon. The user can read but MUST NOT edit the essence.

### Requirement: Banishment — irreversible destruction
Banishment SHALL permanently and irrecoverably destroy all artifacts of a demon (seal, manifest, essence, all chronicles). No backup or undo is possible.

#### Scenario: Banishment execution
- **WHEN** the user confirms banishment with Touch ID
- **THEN** the system SHALL overwrite all demon files with random data, delete them from local storage, delete them from iCloud, and remove all references to the demon

#### Scenario: No trace after banishment
- **WHEN** banishment is complete
- **THEN** no file, metadata, name, or reference to the demon SHALL remain anywhere in the system

### Requirement: One demon at a time
The system SHALL enforce that only one demon can be evoked at a time. No concurrent sessions are permitted.

#### Scenario: Attempt to evoke while session active
- **WHEN** the user attempts to evoke a demon while another session is active
- **THEN** the system SHALL prevent the new evocation and indicate that the current session must end first

### Requirement: Chronicle injection during session
The user SHALL be able to select specific past chronicles to inject into the current session's context.

#### Scenario: Chronicle selection and injection
- **WHEN** the user selects a chronicle from the current demon's history during an active session
- **THEN** the selected chronicle's full conversation SHALL be included as additional context in the next message to the API
