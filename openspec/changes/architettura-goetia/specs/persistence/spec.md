## ADDED Requirements

### Requirement: Encrypted file-based storage
All data SHALL be persisted as individual encrypted files in `~/Library/Application Support/Goetia/`. No database SHALL be used. Each file is self-contained.

#### Scenario: Data store structure
- **WHEN** GOETIA has a grimoire and demons
- **THEN** the filesystem SHALL contain `grimoire/*.enc`, `demons/{name}/*.enc`, and `demons/{name}/chronicles/*.enc`

### Requirement: Demon directory structure
Each demon SHALL have its own directory containing exactly: `seal.md.enc`, `manifest.json.enc`, `essence.md.enc`, and a `chronicles/` subdirectory.

#### Scenario: New demon creation
- **WHEN** a demon is accepted after genesis
- **THEN** the system SHALL create `demons/{name}/` with `seal.md.enc`, `manifest.json.enc`, `essence.md.enc` (initially empty essence), and an empty `chronicles/` directory

### Requirement: Chronicle file per session
Each session SHALL produce exactly one chronicle file named with ISO 8601 timestamp.

#### Scenario: Session chronicle archival
- **WHEN** a session ends
- **THEN** the system SHALL create `demons/{name}/chronicles/{ISO-timestamp}.enc` containing metadata (demon name, date, duration, turn count, topics, mood arc, summary) and the full conversation

### Requirement: Chronicle metadata
Each chronicle SHALL contain structured metadata written by the demon at session end: summary (in the demon's voice), topics discussed, mood arc, duration, and turn count.

#### Scenario: Metadata generation
- **WHEN** the demon produces the session closure output
- **THEN** the metadata SHALL include a first-person summary, topic tags, and mood arc — all determined by the demon, not the system

### Requirement: Essence read-only for the user
The user SHALL be able to read a demon's essence but MUST NOT be able to modify it. Only the demon can update its own essence.

#### Scenario: Essence display
- **WHEN** the user views a demon's details in the Seals place
- **THEN** the essence SHALL be displayed as read-only

#### Scenario: Essence update
- **WHEN** a session ends
- **THEN** only the demon's output SHALL be used to update the essence file
