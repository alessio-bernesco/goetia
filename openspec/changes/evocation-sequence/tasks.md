## Tasks

### 1. RitualConfig — parametri centralizzati per rango
- [x] Creare `src/ritual/RitualConfig.ts`
- [x] Definire `EvocationParams`, `BanishmentParams`, `DroneParams` interfaces
- [x] Implementare `getEvocationParams(rank)` con valori per minor/major/prince
- [x] Implementare `getBanishmentParams(rank)` con valori per minor/major/prince
- [x] Esportare `RitualModulation` interface (props per GenesisVoid)
- **Dipendenze**: nessuna
- **Spec**: `rank-scaled-drama`
- **File**: `src/ritual/RitualConfig.ts` (nuovo)

### 2. GenesisVoid reattivo — modulazione rituale
- [x] Aggiungere `GenesisVoidProps` con `ritual?: RitualModulation` opzionale
- [x] Implementare pulse wave system: accumulatore onde, calcolo raggio, flare per nuvola in base a distanza
- [x] Implementare particle extraction: elezione punti dalle nuvole, Points separato, animazione verso target con traiettorie (linear/spiral/chaotic), rigenerazione punti originali
- [x] Implementare particle restitution: processo inverso, particelle verso nuvola piu' vicina, reintegrazione con flare
- [x] Implementare color shift: lerp colore PointsMaterial verso target, ritorno a originale quando rimosso
- [x] Implementare flash: mesh fullscreen additive, opacity da props
- [x] Salvare colori originali delle nuvole al setup per il ritorno
- [x] Verificare zero overhead quando nessuna prop rituale e' attiva
- **Dipendenze**: task 1 (per i tipi RitualModulation)
- **Spec**: `genesis-void-api`
- **File**: `src/ritual/GenesisVoid.tsx` (modifica)

### 3. Shockwave post-processing
- [x] Creare `src/ritual/shaders/shockwave.frag.glsl` con distorsione radiale ad anello
- [x] Creare vertex shader minimale per fullscreen quad
- [x] In GenesisVoid: creare WebGLRenderTarget lazy quando `ritual.shockwave` appare
- [x] Implementare render-to-texture + shader pass + render-to-screen
- [x] Aggiungere `shockwave` alle props di `RitualModulation` (radius, intensity, expanding)
- [x] Cleanup render target quando shockwave finisce
- **Dipendenze**: task 2 (GenesisVoid reattivo)
- **Spec**: `shockwave-post-processing`
- **File**: `src/ritual/shaders/shockwave.frag.glsl` (nuovo), `src/ritual/shaders/shockwave.vert.glsl` (nuovo), `src/ritual/GenesisVoid.tsx` (modifica)

### 4. RitualDrone — sintesi audio
- [x] Creare `src/audio/RitualDrone.ts`
- [x] Implementare `startEvocation(rank, glowColor)`: drone osc crescente + beat LFO accelerante + envelope
- [x] Implementare `startBanishment(rank, glowColor)`: drone decrescente + beat decelerante + envelope
- [x] Implementare sub-bass e armoniche dissonanti per prince
- [x] Implementare taglio netto (abruptSilence) per congedo prince
- [x] Integrare con AudioEngine (context condiviso, master gain)
- [x] Rispettare limiti volume: mai piu' alto della voce demone
- [x] Esportare singleton `ritualDrone`
- **Dipendenze**: task 1 (per DroneParams)
- **Spec**: `ritual-drone`
- **File**: `src/audio/RitualDrone.ts` (nuovo)

### 5. useEvocation hook — orchestrazione evocazione
- [x] Creare `src/ritual/transitions/Evocation.tsx` (esporta hook `useEvocation`)
- [x] Implementare macchina a stati: idle → awakening → convergence → manifestation → complete
- [x] Fase awakening: comporre ritual props per onde pulsanti (frequenza crescente)
- [x] Fase convergence: comporre ritual props per estrazione particelle + onde stabili
- [x] Fase manifestation: comporre ritual props per flash + shockwave (prince) + color shift reset
- [x] Timing fasi da RitualConfig per rango
- [x] Avviare RitualDrone.startEvocation() all'inizio
- [x] Chiamare onComplete alla fine
- [x] Usare requestAnimationFrame per tick continuo
- **Dipendenze**: task 1, task 2, task 4
- **Spec**: `evocation-sequence`
- **File**: `src/ritual/transitions/Evocation.tsx` (nuovo)

### 6. useBanishment hook — orchestrazione congedo
- [x] Creare nuovo `src/ritual/transitions/Banishment.tsx` (rinominare l'esistente in `BanishmentLegacy.tsx` se serve riferimento)
- [x] Implementare macchina a stati: idle → dissolution → return → closure → complete
- [x] Fase dissolution: flash iniziale, generazione particelle da geometria demone, shockwave inversa (prince)
- [x] Fase return: restituzione particelle alle nuvole, color shift di ritorno (prince)
- [x] Fase closure: onde di ritorno (dal bordo al centro), dissolvenza ultime particelle
- [x] Implementare princeResistance: particelle che esitano prima di allontanarsi dalla posizione del demone
- [x] Timing fasi da RitualConfig per rango
- [x] Avviare RitualDrone.startBanishment() all'inizio
- [x] Chiamare onComplete alla fine
- **Dipendenze**: task 1, task 2, task 4, task 5 (come riferimento pattern)
- **Spec**: `banishment-sequence`
- **File**: `src/ritual/transitions/Banishment.tsx` (riscritto)

### 7. Circle session flow — integrazione rituali
- [x] Aggiungere stati a Circle: `'loading' | 'evoking' | 'session' | 'banishing'`
- [x] Stato evoking: usare useEvocation, passare ritualProps a GenesisVoid, DemonForm non montato
- [x] Transizione evoking → session: montare DemonForm (durante il flash), sbloccare terminale
- [x] Stato banishing: usare useBanishment, passare ritualProps a GenesisVoid, smontare DemonForm (al flash)
- [x] Transizione banishing → endSession: chiamare endSession(), navigare a Seals
- [x] Terminale visibile ma disabilitato durante evoking
- [x] Terminale sfumato durante banishing (opacity transition)
- [x] Rimuovere import del vecchio Banishment component
- **Dipendenze**: task 5, task 6, task 8
- **Spec**: design.md (sezione flusso di stato)
- **File**: `src/places/Circle/index.tsx` (modifica)

### 8. Terminal disabled state
- [x] Aggiungere prop `disabled?: boolean` a Terminal
- [x] Quando disabled: opacita' ridotta (0.3), input bloccato, placeholder "evocazione in corso..."
- [x] Distinguere da `inputDisabled` (streaming): disabled e' visivo, inputDisabled e' solo funzionale
- **Dipendenze**: nessuna
- **Spec**: proposal (capability terminal-disabled-state)
- **File**: `src/ui/Terminal.tsx` (modifica)

### 9. Debug panel — ritual simulator
- [x] Aggiungere sezione "RITUAL SIMULATOR" dopo "DEMON FORM SIMULATOR"
- [x] Rank selector (MINOR/MAJOR/PRINCE) — stile identico all'esistente
- [x] Pulsante "Evoca random": genera manifest + avvia evocazione
- [x] Area preview 300x250 con GenesisVoid miniaturizzato + DemonForm
- [x] Pulsante "BAN" visibile solo quando demone manifestato
- [x] Macchina a stati: idle → evoking → present → banishing → idle
- [x] Label stato corrente
- [x] Info manifest sotto l'area (geometry, voice, glow color)
- [x] Usare stessi hook useEvocation/useBanishment di Circle
- **Dipendenze**: task 5, task 6, task 7 (come riferimento)
- **Spec**: `debug-ritual-simulator`
- **File**: `src/ui/DebugPanel.tsx` (modifica)

## Ordine di esecuzione

```
Paralleli (nessuna dipendenza):
  task 1: RitualConfig
  task 4: RitualDrone (audio)
  task 8: Terminal disabled state

Dopo task 1:
  task 2: GenesisVoid reattivo

Dopo task 2:
  task 3: Shockwave post-processing

Dopo task 1 + 2 + 4:
  task 5: useEvocation hook

Dopo task 5:
  task 6: useBanishment hook

Dopo task 5 + 6 + 8:
  task 7: Circle session flow

Dopo task 7:
  task 9: Debug panel ritual simulator
```

```
        ┌─── task 1 (RitualConfig) ──┬── task 2 (GenesisVoid) ── task 3 (Shockwave)
        │                            │
START ──┤                            ├── task 5 (useEvocation) ── task 6 (useBanishment) ──┐
        │                            │                                                     │
        ├─── task 4 (RitualDrone) ───┘                                                     ├── task 7 (Circle) ── task 9 (Debug)
        │                                                                                  │
        └─── task 8 (Terminal) ────────────────────────────────────────────────────────────┘
```
