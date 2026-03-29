## ADDED Requirements

### Requirement: Chronicle timeline per demon
The system SHALL present chronicles as a chronological timeline grouped by date, styled as a technical log terminal consistent with the application's technomagical aesthetic.

#### Scenario: Timeline display
- **WHEN** the user views chronicles for a demon
- **THEN** sessions SHALL be listed grouped by date, most recent first, showing: time, session number, duration, turn count, topic tags, and the demon's first-person summary

### Requirement: Session detail view
The user SHALL be able to open any chronicle to view the full conversation log, rendered turn by turn.

#### Scenario: Full conversation view
- **WHEN** the user selects a session from the timeline
- **THEN** the full conversation SHALL be displayed in chronological order, each turn showing the speaker (mago/demon) and the content, in a terminal-style presentation

### Requirement: Chronicle injection into active session
During an active evocation session, the user SHALL be able to select specific chronicles to inject into the conversation context. Only the current demon's chronicles SHALL be available for injection.

#### Scenario: Chronicle selection during session
- **WHEN** the user activates the chronicle injection interface during an active session
- **THEN** the system SHALL display the current demon's chronicle list (same timeline format) and allow selecting one or more specific sessions

#### Scenario: Injection into context
- **WHEN** the user confirms chronicle selection
- **THEN** the selected chronicles' full conversation content SHALL be included as additional context in the next message sent to the API

#### Scenario: Cross-demon chronicle access prevention
- **WHEN** the user is in a session with demon A
- **THEN** only demon A's chronicles SHALL be available for injection — no other demon's chronicles SHALL be accessible

### Requirement: Chronicle search and filtering
The user SHALL be able to filter chronicles by topic tags and search within session summaries.

#### Scenario: Topic filter
- **WHEN** the user selects a topic tag from the chronicle timeline
- **THEN** only sessions tagged with that topic SHALL be displayed

#### Scenario: Summary search
- **WHEN** the user enters a search term in the chronicle view
- **THEN** only sessions whose summary contains the search term SHALL be displayed
