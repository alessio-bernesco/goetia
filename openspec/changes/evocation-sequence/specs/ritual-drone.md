## ritual-drone

Modulo WebAudio per la sintesi generativa dei droni rituali — evocazione (crescendo) e congedo (decrescendo).

### Interface

```typescript
class RitualDrone {
  startEvocation(rank: string, glowColor: string): void;
  startBanishment(rank: string, glowColor: string): void;
  stop(): void;
  isPlaying(): boolean;
}

export const ritualDrone: RitualDrone;
```

### Struttura sonora — evocazione

```
              ┌─────────────────────────────────────┐
              │         Master Gain (envelope)       │
              └───────────────┬─────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │  Drone  │         │  Beat   │         │ Sub+Dis │
    │  Osc    │         │  LFO    │         │ (prince)│
    └─────────┘         └─────────┘         └─────────┘
```

**Drone oscillatore**:
- Tipo: sawtooth filtrato (lowpass)
- Frequenza: sale da `baseFreq` a `maxFreq` durante la sequenza
- Rampa lineare sincronizzata alla durata del rango
- minor: 80Hz → 120Hz
- major: 60Hz → 140Hz  
- prince: 40Hz → 180Hz

**Battito ritmico**:
- GainNode modulato da un LFO (oscillatore a bassa frequenza)
- La frequenza del LFO accelera durante la sequenza
- minor: 1Hz → 3Hz (battito appena percepibile)
- major: 1.5Hz → 6Hz (battito chiaro)
- prince: 2Hz → 12Hz (martellante)

**Sub-bass (solo prince)**:
- Oscillatore sinusoidale a 30-50Hz
- Gain crescente, arriva al picco nella fase di manifestazione

**Armoniche dissonanti (solo prince)**:
- 2 oscillatori a rapporti non-interi (es. 1.414x e 2.718x della frequenza base)
- Gain basso, entrano gradualmente nella fase di convergenza
- Creano tensione senza essere melodici

**Envelope**:
- Fade-in: 0.3s (evita click)
- Sustain: cresce gradualmente
- Fade-out: rapido nella fase di manifestazione (0.5s)

### Struttura sonora — congedo

Simmetria invertita:

**Drone**: frequenza scende da alta a bassa
- minor: 120Hz → 60Hz
- major: 140Hz → 40Hz
- prince: 180Hz → 30Hz

**Battito**: decelera
- minor: 3Hz → 0.5Hz
- major: 6Hz → 1Hz
- prince: 12Hz → 2Hz → TAGLIO NETTO (abruptSilence)

**Sub-bass (prince)**: decade gradualmente, poi taglio

**Envelope congedo prince**: 
- Il drone NON sfuma — si taglia netto alla fine della fase closure
- `gainNode.gain.setValueAtTime(currentGain, cutTime)`
- `gainNode.gain.linearRampToValueAtTime(0, cutTime + 0.01)` (10ms, quasi istantaneo)
- Il silenzio improvviso dopo tutto quel rumore e' l'effetto piu' potente

### Integrazione con AudioEngine

- Usa `audioEngine.getContext()` per ottenere l'AudioContext condiviso
- Si connette al master gain di AudioEngine
- Rispetta il volume globale
- Non interferisce con VoiceSynth o BackgroundNoise (nodi separati)

### Volume

- Il drone rituale e' un effetto transitorio, non un sottofondo
- Volume piu' alto del background noise ma mai piu' alto della voce del demone
- minor: gain max 0.15
- major: gain max 0.25
- prince: gain max 0.4
