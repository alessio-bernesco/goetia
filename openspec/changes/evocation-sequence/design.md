## Architecture

### Rendering strategy: flash-bridge tra due canvas

GenesisVoid e DemonForm restano su canvas separati (due istanze di `Scene.tsx`). Le sequenze rituali vivono interamente nel canvas di GenesisVoid. Un flash di glow al momento critico maschera il mount/unmount di DemonForm.

```
EVOCAZIONE                              CONGEDO
═══════════                             ═══════

GenesisVoid canvas:                     GenesisVoid canvas:
  onde pulsanti                           flash iniziale (maschera unmount)
  particelle estratte → centro            particelle da centro → nuvole
  convergenza                             onda di ritorno
  FLASH (maschera mount DemonForm)        shockwave inversa (prince)
  shockwave (prince)                      color shift ritorno (prince)

DemonForm canvas:                       DemonForm canvas:
  non montato durante sequenza            smontato al flash iniziale
  monta durante il flash                  
  primo respiro                           
```

### Flusso di stato in Circle

```
┌──────────────┐     manifest      ┌──────────────┐    onComplete    ┌──────────────┐
│   LOADING    │────caricato──────▶│   EVOKING    │────────────────▶│   SESSION    │
│              │                   │              │                  │              │
│ manifest=null│                   │ manifest ok  │                  │ manifest ok  │
│ terminal:    │                   │ terminal:    │                  │ terminal:    │
│  nascosto    │                   │  visibile,   │                  │  attivo      │
│              │                   │  disabilitato│                  │              │
└──────────────┘                   └──────────────┘                  └──────┬───────┘
                                                                          │
                                                            click CONGEDA │
                                                                          ▼
                                                                   ┌──────────────┐
                                                                   │  BANISHING   │
                                                                   │              │
                                                                   │ terminal:    │
                                                                   │  sfumato     │
                                                                   │              │
                                                                   └──────┬───────┘
                                                                          │
                                                                   onComplete
                                                                          │
                                                                          ▼
                                                                   endSession()
                                                                   torna a Seals
```

### GenesisVoid: da decorativo a reattivo

GenesisVoid oggi e' self-contained. Diventa reattivo tramite props opzionali. Quando nessuna prop e' passata, il comportamento e' identico a oggi.

```typescript
interface GenesisVoidProps {
  // Modulazione rituale — tutto opzionale
  ritual?: {
    // Onde pulsanti
    waves?: {
      origin: [number, number, number];  // centro d'origine
      speed: number;                      // velocita' propagazione
      intensity: number;                  // 0-1, forza del flare
      frequency: number;                  // onde al secondo
    };
    // Color shift (prince)
    colorShift?: {
      target: string;                     // hex del glow color demone
      intensity: number;                  // 0-1, quanto shiftare
    };
    // Flash
    flash?: {
      intensity: number;                  // 0-1
      color: string;                      // hex
    };
    // Estrazione particelle (evocazione)
    extraction?: {
      count: number;                      // quante particelle estrarre
      target: [number, number, number];   // dove convergono
      progress: number;                   // 0-1, avanzamento animazione
      trajectoryType: 'linear' | 'spiral' | 'chaotic';
    };
    // Restituzione particelle (congedo)
    restitution?: {
      count: number;
      origin: [number, number, number];   // da dove partono
      progress: number;                   // 0-1
      trajectoryType: 'linear' | 'spiral' | 'chaotic';
    };
  };
}
```

Internamente, GenesisVoid gestisce:
- **Pulse wave system**: calcola la distanza di ogni nuvola dall'origine, quando l'onda la raggiunge applica flare (size * multiplier, opacity boost). Le onde successive sono piu' ravvicinate (frequenza crescente).
- **Particle extraction**: elegge N punti random dalle nuvole (proporzionalmente al count di ogni nuvola), li rimuove dalla rotazione orbitale, li anima verso il target. I punti originali vengono rigenerati con fade-in.
- **Particle restitution**: processo inverso — crea particelle alla posizione d'origine, le anima verso la nuvola piu' vicina, le reintegra.
- **Color shift**: lerp del colore di ogni PointsMaterial verso il target.
- **Flash**: mesh fullscreen con additive blending, opacity animata.

### Orchestrazione: chi controlla cosa

```
Circle.tsx (stato: 'evoking' | 'session' | 'banishing')
    │
    ├── GenesisVoid (props.ritual gestito dal coordinatore)
    │
    ├── EvocationController (hook o componente)
    │   ├── calcola ritual props per GenesisVoid frame-by-frame
    │   ├── gestisce timing fasi per rango
    │   ├── triggera RitualDrone.startEvocation(rank)
    │   └── chiama onComplete quando finito
    │
    ├── BanishmentController (hook o componente)
    │   ├── calcola ritual props inverse
    │   ├── triggera RitualDrone.startBanishment(rank)
    │   └── chiama onComplete quando finito
    │
    └── DemonForm (montato solo in stato 'session')
```

La scelta tra hook e componente per i controller: **hook** (`useEvocation`, `useBanishment`). Non rendono nulla — calcolano le ritual props da passare a GenesisVoid e gestiscono il timing. Circle li chiama condizionalmente.

### Rank configuration: parametri centralizzati

Un modulo `RitualConfig.ts` esporta i parametri per rango:

```typescript
interface RitualParams {
  evocation: {
    duration: number;           // secondi totali
    waveCount: number;          // numero di onde
    waveIntensity: number;      // 0-1
    particleCount: number;
    trajectoryType: 'linear' | 'spiral' | 'chaotic';
    flashIntensity: number;     // 0 = nessun flash, 1 = accecante
    hasShockwave: boolean;
    hasColorShift: boolean;
    drone: {
      baseFreq: number;
      maxFreq: number;
      beatStart: number;        // BPM iniziale
      beatEnd: number;          // BPM finale
      intensity: number;        // volume 0-1
      hasSubBass: boolean;
      hasDissonance: boolean;
    };
  };
  banishment: {
    duration: number;
    particleCount: number;
    trajectoryType: 'linear' | 'spiral' | 'chaotic';
    hasReturnWaves: boolean;
    flashIntensity: number;
    hasShockwave: boolean;
    hasColorShift: boolean;
    princeResistance: boolean;  // particelle esitano
    abruptSilence: boolean;     // silenzio improvviso alla fine
    drone: {
      startFreq: number;
      endFreq: number;
      beatStart: number;
      beatEnd: number;
      intensity: number;
    };
  };
}
```

### Audio: RitualDrone

Modulo singolo `RitualDrone.ts` con due metodi principali: `startEvocation(rank, manifest)` e `startBanishment(rank, manifest)`. Usa WebAudio API direttamente (come VoiceSynth e BackgroundNoise).

Struttura sonora:
- **Oscillatore drone**: frequenza base che sale (evocazione) o scende (congedo)
- **Battito ritmico**: gain modulato da LFO la cui frequenza accelera/decelera
- **Sub-bass** (prince): secondo oscillatore a frequenza molto bassa
- **Armoniche dissonanti** (prince): oscillatori a rapporti non-interi
- **Envelope**: fade-in/fade-out per evitare click

Il drone si sincronizza al timing della sequenza tramite i parametri di durata del rango.

### Shockwave post-processing

Solo per prince. Un `EffectComposer`-style render pass nel canvas di GenesisVoid:

1. Render normale della scena in un render target
2. Shader pass che applica distorsione radiale dal centro
3. Parametri: centro, raggio (si espande nel tempo), intensita' (decade)

Per il congedo: stessa shockwave ma il raggio si contrae anziche' espandersi.

Implementazione leggera: non serve three/postprocessing come dipendenza — un singolo fullscreen quad con shader custom e un render target basta. GenesisVoid gia' ha il suo renderer tramite Scene.tsx.

### Debug panel: ritual simulator

Nuova sezione "RITUAL SIMULATOR" nel DebugPanel, dopo "DEMON FORM SIMULATOR":

```
┌──────────────────────────────────────┐
│ RITUAL SIMULATOR                     │
│                                      │
│ [MINOR] [MAJOR] [PRINCE]            │  ← rank selector
│                                      │
│ [ Evoca random ]                     │  ← genera manifest + parte evocazione
│                                      │
│ ┌──────────────────────────────┐     │
│ │                              │     │  ← area preview con GenesisVoid
│ │    (sequenza in corso o      │     │
│ │     demone manifestato)      │     │
│ │                              │     │
│ └──────────────────────────────┘     │
│                                      │
│ [ BAN ]                              │  ← appare dopo manifestazione
│                                      │
│ stato: idle / evoking / present /    │
│         banishing                    │
└──────────────────────────────────────┘
```

L'area preview contiene un GenesisVoid miniaturizzato + il DemonForm (quando manifestato). I rituali girano completi con audio.

## File map

```
src/
  ritual/
    GenesisVoid.tsx              ← MODIFICA: aggiunta props ritual, sistemi onda/particelle/flash
    RitualConfig.ts              ← NUOVO: parametri per rango (evocazione + congedo)
    transitions/
      Evocation.tsx              ← NUOVO: hook useEvocation che orchestra la sequenza
      Banishment.tsx             ← RISCRITTO: hook useBanishment, restituzione alle galassie
    shaders/
      shockwave.frag.glsl       ← NUOVO: distorsione radiale post-processing
  audio/
    RitualDrone.ts               ← NUOVO: sintesi drone evocazione/congedo
  places/
    Circle/
      index.tsx                  ← MODIFICA: stati evoking/banishing, ritual props
  ui/
    Terminal.tsx                  ← MODIFICA: stato disabled visivo
    DebugPanel.tsx               ← MODIFICA: sezione ritual simulator
```
