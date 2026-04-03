## ADDED Requirements

### Requirement: API key validation via models endpoint
The system SHALL validate an Anthropic API key by performing a `GET` request to `https://api.anthropic.com/v1/models` with the key in the `x-api-key` header. The system SHALL consider the key valid if the response status is 200, invalid if 401, and SHALL return an error for any other status or network failure.

#### Scenario: Valid key
- **WHEN** `validate_api_key` is called with a valid Anthropic API key
- **THEN** the system SHALL return `true` without consuming any API tokens

#### Scenario: Invalid or revoked key
- **WHEN** `validate_api_key` is called with an invalid or revoked key
- **THEN** the system SHALL return `false`

#### Scenario: Network error or unexpected status
- **WHEN** `validate_api_key` is called and the request fails or returns a status other than 200 or 401
- **THEN** the system SHALL return an error describing the failure

### Requirement: API key replacement with atomic safety
The system SHALL support replacing the stored API key via an `update_api_key` command. The new key MUST be validated before the existing key is removed. If validation fails, the existing key SHALL remain untouched.

#### Scenario: Successful replacement
- **WHEN** `update_api_key` is called with a valid new key
- **THEN** the system SHALL validate the new key, delete the existing key from Keychain, store the new key, and return success

#### Scenario: Replacement with invalid key
- **WHEN** `update_api_key` is called with an invalid key
- **THEN** the system SHALL return an error and the existing key in Keychain SHALL remain unchanged

#### Scenario: Replacement when no key exists
- **WHEN** `update_api_key` is called and no key exists in Keychain
- **THEN** the system SHALL validate and store the new key (equivalent to initial setup)

### Requirement: API key deletion
The system SHALL support deleting the stored API key via a `delete_api_key` command. After deletion, the system SHALL report that no API key exists.

#### Scenario: Successful deletion
- **WHEN** `delete_api_key` is called and a key exists in Keychain
- **THEN** the system SHALL remove the key from Keychain and subsequent calls to `has_api_key` SHALL return `false`

#### Scenario: Deletion when no key exists
- **WHEN** `delete_api_key` is called and no key exists in Keychain
- **THEN** the system SHALL succeed silently

### Requirement: On-demand key verification from Keychain
The system SHALL support verifying the currently stored API key without requiring the user to re-enter it. The system SHALL retrieve the key from Keychain and validate it against the Anthropic API.

#### Scenario: Stored key is still valid
- **WHEN** the user requests verification and the stored key is valid
- **THEN** the system SHALL return `true`

#### Scenario: Stored key has been revoked
- **WHEN** the user requests verification and the stored key is no longer valid
- **THEN** the system SHALL return `false`

#### Scenario: No key stored
- **WHEN** the user requests verification and no key exists in Keychain
- **THEN** the system SHALL return an error indicating no key is configured

### Requirement: Authentication error recovery during sessions
The system SHALL detect 401 authentication errors from the Anthropic API during evocation or genesis sessions. The error SHALL be distinguishable from other API errors so the frontend can offer a key replacement flow.

#### Scenario: 401 during evocation
- **WHEN** an API call during an evocation session returns HTTP 401
- **THEN** the backend SHALL return an error prefixed with `AUTH_ERROR:` to the frontend

#### Scenario: 401 during genesis
- **WHEN** an API call during a genesis session returns HTTP 401
- **THEN** the backend SHALL return an error prefixed with `AUTH_ERROR:` to the frontend

#### Scenario: Frontend recovery flow
- **WHEN** the frontend receives an `AUTH_ERROR:` error
- **THEN** the frontend SHALL display a modal dialog allowing the user to enter a new API key, validate it, and replace the stored key

### Requirement: Debug panel API key management section
The DebugPanel SHALL include a section for API key management within the SISTEMA area, providing verification, replacement, and deletion controls.

#### Scenario: Display key status
- **WHEN** the DebugPanel is opened
- **THEN** the system SHALL display the current key status (valid/invalid/not verified) with a colored indicator and the timestamp of the last verification

#### Scenario: Verify key from panel
- **WHEN** the user clicks "VERIFICA ORA" in the DebugPanel
- **THEN** the system SHALL verify the stored key and update the status indicator and timestamp

#### Scenario: Replace key from panel
- **WHEN** the user enters a new key and confirms replacement in the DebugPanel
- **THEN** the system SHALL use `update_api_key` to atomically replace the key and display the result

#### Scenario: Delete key from panel
- **WHEN** the user clicks "ELIMINA KEY" in the DebugPanel and confirms
- **THEN** the system SHALL delete the key and the application SHALL return to the setup flow
