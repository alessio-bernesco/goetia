## ADDED Requirements

### Requirement: Anthropic Claude Opus client
The system SHALL communicate with the Anthropic API using the Claude Opus model (`claude-opus-4-6`). All API calls MUST go through the Rust backend; the frontend SHALL never communicate directly with the API.

#### Scenario: API call routing
- **WHEN** a message needs to be sent to Claude
- **THEN** the frontend SHALL invoke a Tauri command, and the backend SHALL make the API call using the key from Keychain

### Requirement: Streaming response handling
The system SHALL use the Anthropic streaming API (SSE) for all conversations. Responses MUST be streamed token-by-token to the frontend.

#### Scenario: Streaming evocation response
- **WHEN** the demon responds during an evocation session
- **THEN** the backend SHALL stream tokens to the frontend as they arrive, enabling progressive text rendering

### Requirement: Structured JSON output parsing
The backend SHALL parse the demon's JSON output `{ text, state, voice }` from the streamed response. Text SHALL be forwarded progressively; state and voice SHALL be forwarded when the complete JSON is available.

#### Scenario: Progressive text extraction
- **WHEN** tokens are streaming and the `text` field content is being received
- **THEN** the backend SHALL extract and forward text characters to the frontend as they arrive

#### Scenario: State extraction on completion
- **WHEN** the full response JSON is complete
- **THEN** the backend SHALL parse the `state` object and forward it to the frontend as a single update

#### Scenario: Malformed JSON handling
- **WHEN** the model produces invalid JSON
- **THEN** the backend SHALL extract whatever text is available, keep the visual state unchanged, and log the parsing error in the chronicle

### Requirement: Prompt caching
The system SHALL use Anthropic's prompt caching for system prompt components. Grimoire sections §1 (identity) and §2 (laws), being identical across all sessions, SHALL be cached.

#### Scenario: Cache hit on shared grimoire sections
- **WHEN** a new session starts (genesis or evocation)
- **THEN** grimoire §1 and §2 SHALL be sent with cache control headers enabling reuse from previous sessions

### Requirement: Two API modes
The system SHALL support two distinct API conversation modes: genesis (demon creation) and evocation (demon session), each with different system prompt composition.

#### Scenario: Genesis mode
- **WHEN** a genesis session is started
- **THEN** the system prompt SHALL be composed of grimoire §1 + §2 + §3, and the model SHALL operate as the "generative entity"

#### Scenario: Evocation mode
- **WHEN** an evocation session is started
- **THEN** the system prompt SHALL be composed of grimoire §1 + §2 + §4 + §5 + seal + essence, and the model SHALL operate as the specific demon
