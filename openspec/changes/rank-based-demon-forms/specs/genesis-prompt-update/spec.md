## MODIFIED Requirements

### Requirement: Genesis output format
Il protocollo di genesi (§3 del grimoire, `genesis.md`) MUST richiedere al modello di produrre SOLO due campi: `name` e `seal`. Il campo `manifest` MUST essere rimosso dall'output richiesto al modello. Il backend genera il manifest autonomamente.

Nuovo formato output di generazione:
```json
{
  "name": "nome-del-demone",
  "seal": "# Sigillo di [Nome]\n\n[Identità, carattere, regole, dominio — in markdown]"
}
```

#### Scenario: Model produces name and seal only
- **WHEN** il modello completa la fase 2 di genesi
- **THEN** l'output contiene esattamente `{ "name": "...", "seal": "..." }` senza campo `manifest`

#### Scenario: Validation accepts two-field output
- **WHEN** il backend riceve `{ "name": "asmodeus", "seal": "# Sigillo..." }`
- **THEN** il parsing riesce e il demone procede alla generazione manifest backend

### Requirement: Genesis prompt removes manifest specification
Il testo del protocollo di genesi MUST rimuovere: la specifica completa del blocco `manifest`, il vincolo sulle geometrie ammesse, la specifica del campo `voice`, i range dei parametri visivi. Il modello non deve sapere nulla della forma, colore, voce o parametri visivi del demone.

#### Scenario: No geometry mention in prompt
- **WHEN** il system prompt di genesi viene composto
- **THEN** il testo non contiene riferimenti a `geometry`, `icosahedron`, `torus`, `color`, `opacity`, `glow`, `rotation_speed`, `pulse_frequency`, `noise_amplitude`, `voice`, `baseFrequency`, `formants`, `breathiness`

#### Scenario: Prompt still contains interview protocol
- **WHEN** il system prompt di genesi viene composto
- **THEN** il testo contiene la Fase 1 (intervista sul dominio) invariata

### Requirement: Genesis interview unchanged
La Fase 1 del protocollo di genesi (intervista) MUST restare invariata. Il modello intervista il mago sul dominio, argomenti e scopo del demone. Non chiede forma, colore, personalità, tono, voce.

#### Scenario: Interview phase preserved
- **WHEN** il modello è in fase 1
- **THEN** fa domande solo sul dominio di competenza, non su aspetti visivi o vocali

### Requirement: Generation phase simplified
La Fase 2 MUST essere semplificata: il modello genera solo il nome e il sigillo (identità, carattere, regole, dominio in markdown). Personalità e attitudine restano decisioni del modello nel sigillo. Forma, colore, voce e parametri visivi NON sono più responsabilità del modello.

#### Scenario: Seal contains personality
- **WHEN** il modello genera il sigillo
- **THEN** il sigillo descrive identità, carattere, regole e dominio del demone

#### Scenario: Seal does not mention visual form
- **WHEN** il modello genera il sigillo
- **THEN** il sigillo non contiene riferimenti alla forma geometrica, colore o voce del demone

### Requirement: Absolute constraint updated
Il vincolo assoluto sull'output MUST specificare che l'output contiene SOLO `name` e `seal`. Il vincolo MUST esplicitamente vietare `manifest`, `text`, `state`, `voice`, `entity` o altri campi.

#### Scenario: Manifest field rejected
- **WHEN** il modello produce output con campo `manifest`
- **THEN** il campo viene ignorato o l'output rifiutato (il backend genera il manifest autonomamente)
