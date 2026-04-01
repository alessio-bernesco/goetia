## banishment-sequence

Hook `useBanishment` che orchestra la sequenza di congedo — simmetria invertita dell'evocazione.

### Interface

```typescript
interface UseBanishmentResult {
  ritualProps: RitualModulation | undefined;
  phase: 'idle' | 'dissolution' | 'return' | 'closure' | 'complete';
  progress: number;
}

function useBanishment(
  active: boolean,
  rank: string,
  manifest: DemonManifest,
  onComplete: () => void,
): UseBanishmentResult;
```

### Fasi

**Fase 1: DISSOLUTION (disgregazione)**
- Durata: ~30% del tempo totale
- Flash iniziale (maschera l'unmount di DemonForm)
- La forma del demone si disgrega in particelle nel canvas di GenesisVoid
  - Le particelle partono dalle posizioni della geometria del demone (campionate come in Banishment attuale)
  - Per prince: le particelle esitano brevemente prima di allontanarsi (princeResistance)
- Drone inizia a calare
- Shockwave inversa per prince (raggio si contrae)

**Fase 2: RETURN (restituzione alle galassie)**
- Durata: ~50% del tempo totale
- Le particelle tornano alle nuvole piu' vicine
- Traiettorie inverse per rango
- Color shift di ritorno per prince (dal glow color ai colori originali)
- Drone continua a scendere, battito decelera

**Fase 3: CLOSURE (chiusura del vuoto)**
- Durata: ~20% del tempo totale
- Onde di ritorno: dalle nuvole verso il centro (ogni nuvola flare quando la particella la raggiunge)
- Le ultime particelle si dissolvono nelle nuvole
- Drone si spegne
- Per prince: silenzio improvviso (il drone si taglia netto, non sfuma)
- `onComplete` chiamato alla fine

### Timing per rango

- minor: 2.5s totali (0.75s + 1.25s + 0.5s)
- major: 3.5s totali (1.05s + 1.75s + 0.7s)
- prince: 5s totali (1.5s + 2.5s + 1s)

### Differenza con Banishment attuale

Il Banishment attuale (`Banishment.tsx`) e' un componente autonomo con il suo canvas `<Scene>`. Il nuovo sistema:
- Non ha un canvas proprio — usa GenesisVoid
- Le particelle non si disperdono nel nulla — tornano alle galassie
- Ha tre fasi anziche' una sola animazione
- Reagisce al rango
- Ha accompagnamento sonoro
- Per prince: le particelle resistono, come se il principe non volesse andarsene

### Transizione DemonForm → particelle

Al trigger del congedo:
1. Flash nel canvas di GenesisVoid (maschera lo smontaggio)
2. DemonForm si smonta (sparisce dal canvas sovrapposto)
3. Nello stesso frame del flash, GenesisVoid crea le particelle di dissoluzione alle posizioni della geometria del demone
4. Le posizioni vengono calcolate dal manifest (stessa logica di `samplePoints` in Banishment.tsx)
5. Le particelle iniziano il viaggio di ritorno
