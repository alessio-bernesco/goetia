## rank-scaled-drama

Configurazione centralizzata dei parametri rituali per rango. Modulo `RitualConfig.ts`.

### Interface

```typescript
interface EvocationParams {
  duration: number;
  phases: { awakening: number; convergence: number; manifestation: number };
  waveCount: number;
  waveIntensity: number;
  waveSpeed: number;
  particleCount: number;
  trajectoryType: 'linear' | 'spiral' | 'chaotic';
  flashIntensity: number;
  hasShockwave: boolean;
  hasColorShift: boolean;
  drone: DroneParams;
}

interface BanishmentParams {
  duration: number;
  phases: { dissolution: number; return: number; closure: number };
  particleCount: number;
  trajectoryType: 'linear' | 'spiral' | 'chaotic';
  flashIntensity: number;
  hasReturnWaves: boolean;
  hasShockwave: boolean;
  hasColorShift: boolean;
  princeResistance: boolean;
  abruptSilence: boolean;
  drone: DroneParams;
}

interface DroneParams {
  freqStart: number;
  freqEnd: number;
  beatStart: number;
  beatEnd: number;
  gainMax: number;
  hasSubBass: boolean;
  hasDissonance: boolean;
}

function getEvocationParams(rank: string): EvocationParams;
function getBanishmentParams(rank: string): BanishmentParams;
```

### Valori per rango

#### Minor

```
evocation:
  duration: 3.0s
  phases: 1.2 / 1.2 / 0.6
  waveCount: 3
  waveIntensity: 0.3
  waveSpeed: 8
  particleCount: 300
  trajectoryType: linear
  flashIntensity: 0
  hasShockwave: false
  hasColorShift: false
  drone: 80→120Hz, beat 1→3Hz, gain 0.15

banishment:
  duration: 2.5s
  phases: 0.75 / 1.25 / 0.5
  particleCount: 300
  trajectoryType: linear
  flashIntensity: 0.1
  hasReturnWaves: true
  hasShockwave: false
  hasColorShift: false
  princeResistance: false
  abruptSilence: false
  drone: 120→60Hz, beat 3→0.5Hz, gain 0.12
```

#### Major

```
evocation:
  duration: 4.5s
  phases: 1.8 / 1.8 / 0.9
  waveCount: 5
  waveIntensity: 0.6
  waveSpeed: 10
  particleCount: 750
  trajectoryType: spiral
  flashIntensity: 0.5
  hasShockwave: false
  hasColorShift: false
  drone: 60→140Hz, beat 1.5→6Hz, gain 0.25

banishment:
  duration: 3.5s
  phases: 1.05 / 1.75 / 0.7
  particleCount: 750
  trajectoryType: spiral
  flashIntensity: 0.3
  hasReturnWaves: true
  hasShockwave: false
  hasColorShift: false
  princeResistance: false
  abruptSilence: false
  drone: 140→40Hz, beat 6→1Hz, gain 0.2
```

#### Prince

```
evocation:
  duration: 6.0s
  phases: 2.4 / 2.4 / 1.2
  waveCount: 8
  waveIntensity: 1.0
  waveSpeed: 14
  particleCount: 1500
  trajectoryType: chaotic
  flashIntensity: 1.0
  hasShockwave: true
  hasColorShift: true
  drone: 40→180Hz, beat 2→12Hz, gain 0.4, subBass, dissonance

banishment:
  duration: 5.0s
  phases: 1.5 / 2.5 / 1.0
  particleCount: 1500
  trajectoryType: chaotic
  flashIntensity: 0.6
  hasReturnWaves: true
  hasShockwave: true
  hasColorShift: true
  princeResistance: true
  abruptSilence: true
  drone: 180→30Hz, beat 12→2Hz, gain 0.35, subBass
```

### Note

- I valori sono punti di partenza — da tuning con test visivo nel debug panel
- Le fasi si esprimono come frazioni della durata totale (0.4 / 0.4 / 0.2 per evocazione, 0.3 / 0.5 / 0.2 per congedo)
- `waveSpeed` e' in unita' Three.js al secondo — calibrato sulla distanza delle nuvole in GenesisVoid (range -4 a -12 su z)
