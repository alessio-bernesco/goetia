## evocation-sequence

Hook `useEvocation` che orchestra la sequenza di evocazione, calcolando le ritual props per GenesisVoid frame-by-frame.

### Interface

```typescript
interface UseEvocationResult {
  ritualProps: RitualModulation | undefined;  // da passare a GenesisVoid
  phase: 'idle' | 'awakening' | 'convergence' | 'manifestation' | 'complete';
  progress: number;  // 0-1 globale
}

function useEvocation(
  active: boolean,
  rank: string,
  manifest: DemonManifest,
  onComplete: () => void,
): UseEvocationResult;
```

### Fasi

**Fase 1: AWAKENING (risveglio cosmico)**
- Durata: ~40% del tempo totale
- Onde pulsanti dal centro, frequenza crescente
- Intensita' da 0 a max del rango
- Color shift graduale per prince
- Drone in crescendo

**Fase 2: CONVERGENCE (coalescenza)**
- Durata: ~40% del tempo totale
- Le particelle si staccano dalle galassie e convergono
- Le onde continuano ma si stabilizzano
- Il drone raggiunge il picco
- Traiettorie per rango: linear / spiral / chaotic

**Fase 3: MANIFESTATION (flash e primo respiro)**
- Durata: ~20% del tempo totale
- Flash di glow (intensita' per rango)
- Shockwave per prince
- Le onde cessano
- Color shift torna a 0
- Drone cala rapidamente
- `onComplete` chiamato alla fine

### Timing per rango

Usa `RitualConfig` per ottenere i parametri:
- minor: 3s totali (1.2s + 1.2s + 0.6s)
- major: 4.5s totali (1.8s + 1.8s + 0.9s)
- prince: 6s totali (2.4s + 2.4s + 1.2s)

### Implementazione

- `useRef` per lo stato mutabile (startTime, fase corrente, particelle allocate)
- `useCallback` per una funzione `tick(time)` chiamata da `requestAnimationFrame`
- Ogni tick calcola progress globale, determina fase, compone le ritual props
- Le ritual props vengono restituite e Circle le passa a GenesisVoid
- Avvia `RitualDrone.startEvocation(rank, manifest)` al primo tick
- Chiama `onComplete` quando progress >= 1

### Sincronizzazione audio

Il hook chiama `ritualDrone.startEvocation()` all'inizio della fase awakening. Il drone si auto-gestisce con la durata del rango — non serve sincronizzazione frame-by-frame. Il drone ha il suo envelope interno che segue la stessa curva temporale.
