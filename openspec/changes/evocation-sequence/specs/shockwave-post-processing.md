## shockwave-post-processing

Shader pass post-processing per distorsione radiale — solo prince, sia in evocazione (espansione) che congedo (contrazione).

### Approccio

Niente dipendenze esterne (no three/postprocessing). Setup minimale:

1. `WebGLRenderTarget` per catturare il render normale della scena
2. Fullscreen quad con shader custom che legge la texture e applica distorsione
3. GenesisVoid attiva il pass solo quando `shockwave` e' nelle ritual props

### Shader — shockwave.frag.glsl

```glsl
uniform sampler2D tDiffuse;
uniform vec2 uCenter;       // centro in UV space (0.5, 0.5)
uniform float uRadius;      // raggio corrente dell'onda (0 → 2)
uniform float uIntensity;   // forza distorsione (decade con tempo)
uniform float uWidth;       // spessore dell'anello di distorsione

varying vec2 vUv;

void main() {
  vec2 dir = vUv - uCenter;
  float dist = length(dir);
  
  // Distorsione nell'anello attorno al raggio
  float ring = smoothstep(uRadius - uWidth, uRadius, dist) 
             - smoothstep(uRadius, uRadius + uWidth, dist);
  
  vec2 offset = normalize(dir) * ring * uIntensity * 0.1;
  
  gl_FragColor = texture2D(tDiffuse, vUv + offset);
}
```

### Parametri temporali

**Evocazione (espansione)**:
- Trigger: inizio fase manifestation
- `uRadius`: 0 → 2 in 0.8s (ease-out)
- `uIntensity`: 0.8 → 0 in 0.8s (decay lineare)
- `uWidth`: 0.15

**Congedo (contrazione)**:
- Trigger: inizio fase dissolution
- `uRadius`: 2 → 0 in 0.8s (ease-in)
- `uIntensity`: 0.6 → 0 in 0.8s
- `uWidth`: 0.12

### Integrazione con GenesisVoid

GenesisVoid gestisce il render target e il pass internamente:

```
Frame normale (no shockwave):
  renderer.render(scene, camera) → schermo

Frame con shockwave:
  renderer.setRenderTarget(renderTarget)
  renderer.render(scene, camera) → texture
  renderer.setRenderTarget(null)
  renderer.render(quadScene, quadCamera) → schermo con distorsione
```

Il render target viene creato lazy (solo quando serve la prima shockwave) e distrutto quando il rituale finisce. Zero overhead quando non in uso.

### Props

```typescript
// Aggiunto a RitualModulation
shockwave?: {
  radius: number;     // 0-2
  intensity: number;  // 0-1
  expanding: boolean; // true = evocazione, false = congedo
};
```
