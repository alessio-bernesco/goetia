## debug-ritual-simulator

Nuova sezione nel DebugPanel per testare le sequenze rituali complete.

### Posizione nel pannello

Dopo la sezione "DEMON FORM SIMULATOR" esistente. La sezione form simulator resta per test statici (breathing, speaking). La nuova sezione testa i rituali dinamici.

### Layout

```
RITUAL SIMULATOR
────────────────
[MINOR] [MAJOR] [PRINCE]       ← rank selector (stile identico al form simulator)

[ Evoca random ]                ← genera manifest + avvia evocazione

┌──────────────────────────────┐
│                              │  ← area 300x250px
│   GenesisVoid + rituale      │     GenesisVoid miniaturizzato
│   + DemonForm (se presente)  │     con tutti gli effetti
│                              │
└──────────────────────────────┘

[ BAN ]                         ← visibile solo quando demone presente

stato: idle                     ← label di stato corrente
```

### Stati

1. **idle**: area mostra solo GenesisVoid di sfondo. Pulsante "Evoca random" attivo, "BAN" nascosto.
2. **evoking**: sequenza di evocazione in corso. Entrambi i pulsanti disabilitati. Label "evoking...".
3. **present**: demone manifestato, visibile nell'area. "Evoca random" disabilitato, "BAN" visibile e attivo. Label "present".
4. **banishing**: sequenza di congedo in corso. Entrambi i pulsanti disabilitati. Label "banishing...".
5. Alla fine del banishing, torna a **idle**.

### Flusso

1. Click "Evoca random":
   - `invoke('debug_generate_manifest', { rank })` per ottenere un manifest
   - Stato → evoking
   - `useEvocation` si attiva, ritual props passate al GenesisVoid dell'area
   - Audio: drone di evocazione (con volume)
   - Al completamento → stato present, DemonForm monta nell'area

2. Click "BAN":
   - Stato → banishing
   - `useBanishment` si attiva
   - Audio: drone di congedo
   - Al completamento → stato idle, tutto resettato

### Implementazione

L'area preview contiene:
- Un `<div>` con dimensioni fisse e `overflow: hidden`
- Dentro: `<GenesisVoid ritual={ritualProps} />` (stesso componente usato in Circle)
- Sovrapposto: `<DemonForm>` quando in stato `present`

I hook `useEvocation` e `useBanishment` sono gli stessi usati in Circle — il debug panel e' un consumatore identico.

### Dettaglio manifest

Sotto l'area, mostra le info del manifest generato (come nel form simulator attuale):
- Geometry type/pattern
- Voice frequency
- Rank
- Glow color (come pallino colorato)
