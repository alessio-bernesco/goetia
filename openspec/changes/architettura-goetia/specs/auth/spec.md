## ADDED Requirements

### Requirement: Biometric authentication at launch
The system SHALL require Touch ID authentication before granting access to any data or functionality. The authentication MUST use macOS LocalAuthentication framework.

#### Scenario: Successful authentication
- **WHEN** the user launches GOETIA and Touch ID prompt appears
- **THEN** upon successful biometric verification, the system unlocks access to the Keychain and loads the application

#### Scenario: Failed authentication
- **WHEN** the user fails Touch ID verification
- **THEN** the system MUST NOT grant access to any data and SHALL display an error state

#### Scenario: Touch ID unavailable
- **WHEN** the device does not support Touch ID or it is disabled
- **THEN** the system SHALL fall back to macOS system password authentication

### Requirement: API key management via Keychain
The system SHALL store the Anthropic API key exclusively in macOS Keychain. The API key MUST never be exposed to the frontend or stored in files.

#### Scenario: First launch without API key
- **WHEN** the user launches GOETIA for the first time and no API key exists in Keychain
- **THEN** the system SHALL prompt the user to input the API key and store it in Keychain with biometric protection

#### Scenario: API key retrieval
- **WHEN** the backend needs the API key for an API call
- **THEN** the system SHALL retrieve it from Keychain, requiring Touch ID if the Keychain item is configured with biometric access control

### Requirement: Master key management via Keychain
The system SHALL generate a 256-bit random master key at first launch and store it in macOS Keychain with biometric protection. This key is the root of all encryption operations.

#### Scenario: First launch — key generation
- **WHEN** GOETIA is launched for the first time on a device and no master key exists in Keychain
- **THEN** the system SHALL generate a cryptographically secure 256-bit random key and store it in Keychain

#### Scenario: Key recovery via iCloud Keychain
- **WHEN** the user sets up GOETIA on a new device with the same Apple ID
- **THEN** the master key SHALL be available via iCloud Keychain sync without manual export/import

### Requirement: Biometric confirmation for destructive operations
The system SHALL require a separate, explicit Touch ID confirmation for destructive operations (demon banishment). This MUST be a distinct authentication event, not a cached session.

#### Scenario: Banishment confirmation
- **WHEN** the user requests to banish a demon
- **THEN** the system SHALL prompt for a fresh Touch ID verification before executing the destruction
