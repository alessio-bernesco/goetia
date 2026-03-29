## ADDED Requirements

### Requirement: Modular grimoire structure
The grimoire SHALL consist of 5 separate encrypted files: `identity.md`, `laws.md`, `genesis.md`, `session.md`, `chronicles.md`, plus a `meta.json` containing the hash chain and version metadata.

#### Scenario: Grimoire file listing
- **WHEN** the system accesses the grimoire directory
- **THEN** it SHALL find exactly 6 encrypted files: `identity.md.enc`, `laws.md.enc`, `genesis.md.enc`, `session.md.enc`, `chronicles.md.enc`, `meta.json.enc`

### Requirement: Grimoire immutability during normal operation
The grimoire MUST NOT be modifiable through the application during normal operation. No UI or command SHALL allow editing the grimoire content.

#### Scenario: Attempt to modify grimoire
- **WHEN** any operation attempts to write to a grimoire file
- **THEN** the system SHALL reject the operation unless it is an explicit grimoire upgrade procedure

### Requirement: Grimoire deploy at first launch
At first launch, if no grimoire exists in the data store, the system SHALL require the user to import a grimoire (generated externally with Claude web). The system MUST validate the imported grimoire structure before accepting it.

#### Scenario: First launch without grimoire
- **WHEN** GOETIA launches and no grimoire directory exists in the data store
- **THEN** the system SHALL present a grimoire import interface

#### Scenario: Grimoire import validation
- **WHEN** the user provides grimoire files for import
- **THEN** the system SHALL verify all 5 markdown files are present, compute the initial grimoire hash, create `meta.json` with the hash chain, encrypt all files, and persist to the data store

### Requirement: Context composition for genesis
During demon genesis, the system SHALL compose the system prompt from grimoire sections §1 (identity), §2 (laws), and §3 (genesis) only.

#### Scenario: Genesis system prompt
- **WHEN** a genesis session is initiated
- **THEN** the system prompt SHALL contain `identity.md + laws.md + genesis.md` in order, and SHALL NOT include `session.md` or `chronicles.md`

### Requirement: Context composition for evocation
During demon evocation, the system SHALL compose the system prompt from grimoire sections §1 (identity), §2 (laws), §4 (session), §5 (chronicles), plus the demon's seal and essence.

#### Scenario: Evocation system prompt
- **WHEN** an evocation session is initiated with a demon
- **THEN** the system prompt SHALL contain `identity.md + laws.md + session.md + chronicles.md + seal.md + essence.md` in order, and SHALL NOT include `genesis.md`

### Requirement: Grimoire upgrade with hash chain preservation
A grimoire upgrade SHALL append the new hash to the existing chain in `meta.json`. All previously valid demons MUST remain valid after upgrade.

#### Scenario: Grimoire upgrade
- **WHEN** the user triggers a grimoire upgrade with new content
- **THEN** the system SHALL compute the new hash, append it to the chain in `meta.json`, re-encrypt all grimoire files, and verify all existing demons remain valid against the chain
