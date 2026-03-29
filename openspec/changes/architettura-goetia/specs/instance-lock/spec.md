## ADDED Requirements

### Requirement: Local single-instance lock
The system SHALL enforce that only one instance of GOETIA runs on a single device at a time using a PID lock file at `~/Library/Application Support/Goetia/lock.pid`.

#### Scenario: First instance launch
- **WHEN** GOETIA launches and no lock.pid exists
- **THEN** the system SHALL create lock.pid containing the current process ID

#### Scenario: Second instance attempt
- **WHEN** GOETIA launches and lock.pid exists with a valid (running) PID
- **THEN** the system SHALL refuse to start and display an error indicating another instance is running

#### Scenario: Stale lock recovery
- **WHEN** GOETIA launches and lock.pid exists but the PID is not running
- **THEN** the system SHALL remove the stale lock.pid and proceed with normal startup

#### Scenario: Lock cleanup on exit
- **WHEN** GOETIA shuts down normally
- **THEN** the system SHALL delete lock.pid

### Requirement: Combined local and distributed lock
The system SHALL acquire both the local lock (PID) and the distributed lock (iCloud lock.json) before allowing any data operations. Both locks MUST be held simultaneously.

#### Scenario: Both locks acquired
- **WHEN** GOETIA starts and acquires both PID lock and iCloud lock
- **THEN** the system SHALL proceed to load data and allow operations

#### Scenario: Local lock acquired but distributed lock blocked
- **WHEN** GOETIA acquires the PID lock but another device holds the iCloud lock
- **THEN** the system SHALL display that another device is active and prevent data access until the distributed lock becomes available
