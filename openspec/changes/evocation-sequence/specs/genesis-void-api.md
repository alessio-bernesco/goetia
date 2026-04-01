## genesis-void-api

GenesisVoid diventa un componente reattivo che accetta modulazione rituale esterna tramite props opzionali.

### Props interface

```typescript
interface RitualModulation {
  waves?: {
    origin: [number, number, number];
    speed: number;        // unita' three.js al secondo
    intensity: number;    // 0-1, moltiplicatore flare
    frequency: number;    // onde al secondo (cresce nel tempo)
  };
  colorShift?: {
    target: string;       // hex
    intensity: number;    // 0-1
  };
  flash?: {
    intensity: number;    // 0-1
    color: string;        // hex
  };
  extraction?: {
    count: number;
    target: [number, number, number];
    progress: number;     // 0-1
    trajectoryType: 'linear' | 'spiral' | 'chaotic';
  };
  restitution?: {
    count: number;
    origin: [number, number, number];
    progress: number;
    trajectoryType: 'linear' | 'spiral' | 'chaotic';
  };
}

interface GenesisVoidProps {
  ritual?: RitualModulation;
}
```

### Pulse wave system

- Un accumulatore interno traccia le onde emesse (timestamp di emissione)
- Ogni frame, per ogni onda attiva, calcola il raggio corrente: `radius = (time - emitTime) * speed`
- Per ogni nuvola, calcola distanza dal centro: `dist = length(cloud.position - origin)`
- Se `|dist - radius| < threshold`: applica flare
  - `pointMaterial.size *= 1 + intensity * falloff`
  - `pointMaterial.opacity = min(1, baseOpacity + intensity * falloff)`
  - `falloff = 1 - |dist - radius| / threshold`
- Le onde decadono dopo aver superato tutte le nuvole
- Nuove onde vengono emesse a intervalli decrescenti: `interval = 1 / frequency`

### Particle extraction

- Al primo frame con `extraction` attivo, elegge `count` punti dalle nuvole
  - Distribuzione proporzionale al count di ogni nuvola
  - Salva posizioni iniziali (world space, inclusa posizione nuvola + rotazione corrente)
- Crea un `THREE.Points` separato nella scena per le particelle in volo
- Ogni frame, interpola le posizioni in base a `progress`:
  - `linear`: lerp diretto da start a target
  - `spiral`: lerp + offset circolare che decresce con progress (`radius * (1 - progress)`)
  - `chaotic`: come spiral ma con noise perturbation e occasionale rallentamento (progress remappato con ease-in random per particella)
- I punti originali nella nuvola vengono nascosti (opacity 0) e rigenerati gradualmente dopo l'estrazione
- Quando `extraction` viene rimosso dalle props, cleanup del Points aggiuntivo

### Particle restitution

- Processo inverso dell'estrazione
- Crea particelle alla posizione `origin`, le anima verso le nuvole
- Ogni particella sceglie la nuvola piu' vicina come destinazione
- Traiettorie inverse (spirali verso fuori anziche' verso il centro)
- Al raggiungimento della nuvola, la particella si dissolve e un punto nella nuvola fa flare

### Color shift

- Per ogni nuvola: `material.color.lerp(targetColor, intensity)` ogni frame
- Quando `colorShift` viene rimosso, lerp di ritorno al colore originale (salvato al setup)

### Flash

- Mesh fullscreen (plane grande quanto il frustum della camera) con material additive
- `material.opacity = flash.intensity`
- Colore dal flash color
- Quando `flash` viene rimosso dalle props, la mesh viene rimossa

### Vincoli

- Nessuna prop attiva = comportamento identico a oggi (zero overhead)
- Le particelle estratte non devono svuotare visivamente le nuvole — rigenerazione con fade-in
- Il flash non deve bloccare il rendering — e' additive, non opaco
- Tutte le animazioni devono essere smooth a 60fps su M2 Max
