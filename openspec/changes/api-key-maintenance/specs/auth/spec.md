## MODIFIED Requirements

### Requirement: API key management via Keychain
The system SHALL store the Anthropic API key exclusively in macOS Keychain. The API key MUST never be exposed to the frontend or stored in files. The system SHALL validate the key against the Anthropic API before storing it.

#### Scenario: First launch without API key
- **WHEN** the user launches GOETIA for the first time and no API key exists in Keychain
- **THEN** the system SHALL prompt the user to input the API key, validate it via `GET /v1/models`, and only upon successful validation store it in Keychain

#### Scenario: First launch with invalid API key input
- **WHEN** the user inputs an invalid API key during first launch setup
- **THEN** the system SHALL display an error message and allow the user to correct the key without storing the invalid value

#### Scenario: First launch validation loading state
- **WHEN** the user submits an API key for validation during setup
- **THEN** the system SHALL display a loading indicator while the validation request is in progress

#### Scenario: API key retrieval
- **WHEN** the backend needs the API key for an API call
- **THEN** the system SHALL retrieve it from Keychain, requiring Touch ID if the Keychain item is configured with biometric access control
