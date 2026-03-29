## ADDED Requirements

### Requirement: File-level iCloud Drive synchronization
The system SHALL synchronize all encrypted data via iCloud Drive using native macOS file-level sync. The iCloud container path SHALL be `~/Library/Mobile Documents/iCloud~Goetia/`.

#### Scenario: Data mirroring
- **WHEN** a file is written to the local data store
- **THEN** the corresponding encrypted file SHALL be copied to the iCloud container, and macOS shall handle the cloud sync

#### Scenario: Data retrieval on new device
- **WHEN** GOETIA launches on a new device with the same Apple ID
- **THEN** the system SHALL download all encrypted files from iCloud before allowing operation

### Requirement: Distributed lock via iCloud
The system SHALL maintain a `lock.json` file in the iCloud container to prevent concurrent access from multiple devices. The lock SHALL contain `device_id`, `timestamp`, `heartbeat`, and `ttl_seconds`.

#### Scenario: Lock acquisition
- **WHEN** GOETIA starts on a device
- **THEN** the system SHALL check for an existing lock.json, and if none exists or the existing lock has expired (current_time > heartbeat + ttl), create a new lock.json with the current device_id

#### Scenario: Lock conflict detection
- **WHEN** a valid (non-expired) lock.json exists with a different device_id
- **THEN** the system SHALL prevent operation and display which device holds the lock

#### Scenario: Lock heartbeat
- **WHEN** GOETIA is running and holds the lock
- **THEN** the system SHALL update the heartbeat timestamp in lock.json every 30 seconds

#### Scenario: Lock release on clean shutdown
- **WHEN** the user closes GOETIA normally
- **THEN** the system SHALL delete lock.json from iCloud and force sync before exiting

#### Scenario: Lock recovery after crash
- **WHEN** GOETIA crashes and lock.json remains
- **THEN** the lock SHALL expire after TTL (5 minutes) and the next launch SHALL be able to acquire it

### Requirement: Sync status visibility
The system SHALL display the current iCloud sync status to the user, indicating whether all data is up to date or sync is in progress.

#### Scenario: Sync indicator
- **WHEN** iCloud sync is in progress
- **THEN** the UI SHALL display a non-intrusive sync status indicator

### Requirement: Force sync before lock release
The system SHALL force iCloud file coordination (NSFileCoordinator) before releasing the distributed lock, ensuring all local changes are uploaded.

#### Scenario: Clean shutdown sync
- **WHEN** the user closes the application
- **THEN** the system SHALL wait for iCloud to confirm all files are uploaded before deleting lock.json and exiting
