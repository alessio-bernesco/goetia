## ADDED Requirements

### Requirement: Four navigation places
The application SHALL have exactly four top-level navigation places: Circle (active session), Evoke (genesis), Chronicles (timeline), Seals (demon list and management).

#### Scenario: Navigation structure
- **WHEN** the application is loaded and authenticated
- **THEN** four navigation places SHALL be accessible via macro buttons — non-canonical UI, no dropdown menus, no conventional tabs

### Requirement: Circle place — active session
The Circle place SHALL display the active evocation session: the demon's 3D form and the conversation terminal.

#### Scenario: Active session display
- **WHEN** the user navigates to Circle with an active session
- **THEN** the demon's form SHALL be rendered in 3D space with the conversation terminal integrated into the scene

#### Scenario: No active session
- **WHEN** the user navigates to Circle without an active session
- **THEN** the place SHALL indicate no demon is evoked and offer to navigate to Evoke or Seals

### Requirement: Evoke place — genesis
The Evoke place SHALL display the genesis void space and manage the demon creation conversation.

#### Scenario: Genesis entry
- **WHEN** the user navigates to Evoke
- **THEN** the genesis void space SHALL render and a new genesis session SHALL begin (or resume if already in progress)

### Requirement: Chronicles place — timeline
The Chronicles place SHALL display a timeline of past sessions for a selected demon, styled as a technical log terminal.

#### Scenario: Chronicle list display
- **WHEN** the user navigates to Chronicles and selects a demon
- **THEN** all sessions SHALL be listed chronologically with date, session number, duration, turn count, topics, and the demon's first-person summary

#### Scenario: Chronicle detail view
- **WHEN** the user selects a specific session from the timeline
- **THEN** the full conversation log SHALL be displayed turn by turn in a terminal-style view

### Requirement: Seals place — demon management
The Seals place SHALL display all existing demons with their sealed forms (miniature 3D renders), allow reading the seal, viewing the essence (read-only), and initiating banishment.

#### Scenario: Demon list display
- **WHEN** the user navigates to Seals
- **THEN** all demons SHALL be displayed with their name and a miniature rendering of their sealed form

#### Scenario: Seal reading
- **WHEN** the user selects a demon in the Seals place
- **THEN** the demon's seal SHALL be displayed as read-only text

#### Scenario: Banishment initiation
- **WHEN** the user initiates banishment from the Seals place
- **THEN** the system SHALL require Touch ID confirmation before proceeding with irreversible destruction

### Requirement: Fluid transitions
Navigation between places SHALL use fluid 3D transitions (zoom, dissolve, morph), not page reloads or hard cuts.

#### Scenario: Place transition animation
- **WHEN** the user navigates between any two places
- **THEN** the 3D scene SHALL animate smoothly between the visual states of the two places
