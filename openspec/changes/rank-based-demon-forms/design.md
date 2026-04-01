## Context

Oggi ogni demone ha un campo `geometry: string` piatto che punta a una delle 6 forme hardcoded. Il modello AI genera l'intero manifest (geometria, colore, voce) durante la genesi. Non esiste legame tra rank e complessità visiva.

File chiave attuali:
- `src-tauri/src/storage/demons.rs` — `DemonManifest` struct, validazione, CRUD cifrato
- `src-tauri/src/demons/genesis.rs` — `GenesisSession`, `GenesisOutput`, parsing JSON dal modello
- `src-tauri/src/demons/context.rs` — composizione system prompt per genesi ed evocazione
- `src/ritual/geometries/index.ts` — factory `createGeometry()`, `GeometryType` union
- `src/ritual/DemonForm.tsx` — rendering Three.js, shader material, animazione
- `src/ui/DebugPanel.tsx` — pannello debug con preview forme
- `test-grimoire.txt` — protocollo di genesi con schema manifest per il modello

Versione attuale: `0.1.0` in `package.json`, `Cargo.toml`, `tauri.conf.json`.

## Goals / Non-Goals

**Goals:**
- La complessità visiva di un demone manifesta il suo rango senza dichiararlo
- Minor: 1 solido platonico. Major: 1 forma topologica con parametri. Prince: 2-3 corpi compositi con orbite e rotazioni indipendenti
- Geometria, colore e voce generati dal backend Rust con randomizzazione vincolata per rank
- Registro cifrato delle combinazioni assegnate per ridurre duplicazioni visive intra-rank
- Voce sempre presente, con range per rank (minor stridula, major media, prince profonda)
- Debug: simulatore forme per rank (random e manuale) + display versione release
- Bump a `0.2.0`

**Non-Goals:**
- Il mago NON può influenzare la scelta della forma — ogni genesi è una sorpresa
- Nessuna migrazione dei demoni esistenti (0.1.0 è pre-release, dati di test)
- Nessuna nuova forma beyond il catalogo definito in questa iterazione
- Nessun cambiamento al flusso di evocazione (solo genesi)

## Decisions

### D1: Schema `geometry` strutturato per rank

Il campo `manifest.geometry` passa da `string` a `serde_json::Value` (oggetto JSON). Lo schema interno dipende dal rank.

**Minor** — 1 corpo platonico:
```json
{
  "type": "tetrahedron|cube|octahedron|icosahedron|point_cloud",
  "rotation": { "speed": 0.01, "axis": [0, 1, 0] }
}
```

**Major** — 1 corpo topologico con params:
```json
{
  "type": "torus|moebius|dodecahedron|torus_knot|fragmented_cube",
  "params": { "radius_ratio": 0.35 },
  "rotation": { "speed": 0.012, "axis": [0.3, 1, 0] }
}
```
Params per forma: `torus` → `radius_ratio [0.2-0.5]`, `moebius` → `twists [1-3]`, `torus_knot` → `p ∈ {2,3,5}, q ∈ {2,3,7}, p≠q`, `dodecahedron` → nessuno, `fragmented_cube` → nessuno.

**Prince** — 2-3 corpi compositi:
```json
{
  "type": "composite",
  "pattern": "counter_rotating|orbital|nested|crowned|binary|axis",
  "bodies": [
    { "shape": "...", "scale": 0.8, "color": { "base": "#8a3a5a", "variance": 0.15 }, "opacity": 0.7, "params": {} }
  ],
  "orbits": [
    { "body": 1, "center": [0,0,0], "axis": [0,1,0], "speed": 0.005, "direction": 1, "radius": 1.2, "phase": 0 }
  ],
  "rotations": [
    { "body": 0, "speed": 0.01, "axis": [0, 1, 0] }
  ]
}
```

6 pattern compositivi:
| Pattern | Corpi | Descrizione |
|---------|-------|-------------|
| `counter_rotating` | 2 | sovrapposti, rotazioni opposte |
| `orbital` | 2-3 | 1 fisso + N orbitanti con fase equidistante |
| `nested` | 2 | uno dentro l'altro, scale diverse |
| `crowned` | 2 | solido + anello/torus inclinato |
| `binary` | 2 | co-orbitanti, nessuno fisso |
| `axis` | 2-3 | allineati su asse, rotazioni indipendenti |

**Alternativa considerata**: enum Rust tipizzato per ogni variante. Scartata perché richiederebbe 3 struct separate e match ovunque. Un `serde_json::Value` validato manualmente nel generatore è più flessibile e il JSON arriva al frontend senza conversione.

### D2: Riorganizzazione campi manifest

`rotation_speed` rimosso dal livello top — assorbito dentro `geometry.rotation`.

Per minor/major: `color` e `opacity` restano al livello top (un solo corpo).
Per prince: `color` e `opacity` al livello top vengono ignorati — ogni body ha i propri. `glow`, `pulse_frequency`, `noise_amplitude` restano globali (effetti shader sull'intera composizione).

Il campo `voice` diventa obbligatorio (`Option<Value>` → `Value`, sempre presente).

### D3: Generazione backend — il modello non tocca la geometria

Il modello produce solo `{ "name": "...", "seal": "..." }` durante la genesi. Nessun campo `manifest`.

Il backend Rust:
1. Riceve `GenesisOutput` dal modello (ora senza manifest)
2. Genera il manifest completo: `generate_manifest(rank, &registry)` 
3. Compone geometria random per rank, colore con repulsione, voce per rank
4. Persiste tutto cifrato

Questo semplifica il system prompt di genesi (§3 nel grimoire) — rimuovere tutta la specifica del manifest JSON e dei vincoli geometrici.

**Alternativa considerata**: far generare al modello solo le preferenze (palette, "aggressivo/calmo") e usarle come seed. Scartata — il mago ha esplicitamente chiesto nessuna influenza.

### D4: Genesis registry — file cifrato dedicato

File `genesis_registry.enc` nella directory del grimorio, cifrato con la stessa master key.

Struttura interna (JSON array):
```json
[
  {
    "demon_name": "asmodeus",
    "rank": "prince",
    "geometry_type": "torus",
    "pattern": "counter_rotating",
    "body_shapes": ["torus", "torus"],
    "primary_color_hsl": [320, 55, 38],
    "created_at": "2026-03-31T14:22:00Z"
  }
]
```

Operazioni:
- **read**: all'inizio della genesi, decifra e deserializza
- **append**: dopo creazione demone, aggiungi entry e ri-cifra
- **remove**: quando un demone viene bandito, rimuovi entry per nome

Repulsione cromatica solo intra-rank: un minor rosso e un prince rosso sono ok (visivamente distinti per complessità).

### D5: Algoritmo di generazione con repulsione

```
1. Carica registry entries per il rank corrente
2. FORMA: peso inversamente proporzionale all'uso → random pesato
3. PATTERN (prince): stessa logica
4. COLORE: genera N candidati HSL, calcola distanza minima da colori esistenti nello stesso rank, scegli il più distante
   - Distanza HSL: √(ΔH² + ΔS² + ΔL²) con H normalizzato su [0,1]
   - Se registry vuoto per quel rank → colore puramente random entro range per rank
5. VOCE: range fissi per rank, random entro i range
   - Minor: baseFreq [280-400], speed [1.2-1.6], breathiness [0.1-0.25]
   - Major: baseFreq [140-200], speed [0.9-1.1], breathiness [0.2-0.4]
   - Prince: baseFreq [70-110], speed [0.5-0.8], breathiness [0.3-0.6]
```

### D6: Frontend — composite renderer

`DemonForm.tsx` deve supportare sia la forma singola (minor/major) che la composizione (prince).

Per i prince: il componente crea un `THREE.Group` come root, con N mesh figli. Ogni mesh ha la propria geometria, materiale (colore/opacity), e rotazione. Le orbite sono animate nel loop `onFrame` usando trigonometria (posizione = center + radius * [cos(angle), 0, sin(angle)] ruotata sull'asse).

Gli shader restano invariati — si applicano a ciascun corpo indipendentemente. `glow`, `pulse_frequency`, `noise_amplitude` sono condivisi via uniforms comuni.

### D7: Debug — simulatore forme e versione

Nuova sezione nel `DebugPanel.tsx`: "DEMON FORM SIMULATOR"

- Selettore rank (minor / major / prince)
- Bottone "Random" → genera manifest con lo stesso algoritmo del backend (chiamata Tauri `debug_generate_manifest(rank)`)
- Controlli manuali: selezione forma, pattern (prince), colore per body
- Preview 3D con `DemonForm`
- Waiting/speaking toggle (già esistenti)

Sezione "SISTEMA" estesa con display versione: legge da `package.json` o da una const iniettata a build time.

### D8: Versione 0.2.0

Bump simultaneo in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.

## Risks / Trade-offs

**[BREAKING] Schema manifest incompatibile con demoni 0.1.0** → Non serve migrazione, siamo in pre-release con dati di test. I demoni esistenti vanno ricreati.

**[Performance] Prince con 3 corpi = 3x draw calls + wireframe** → Con 3 corpi siamo a ~6 draw calls totali. Irrilevante per Three.js su hardware moderno.

**[Complessità] Il generatore random potrebbe produrre composizioni prince visivamente brutte** → I 6 pattern sono strutturalmente vincolati (non combinazioni arbitrarie). Il debug simulator serve esattamente a validare prima del merge.

**[Registry stale] Se un bandimento fallisce a metà, il registry potrebbe non essere aggiornato** → Il bandimento prima rimuove dal registry, poi cancella i file. Se la cancellazione file fallisce, il registry è già pulito (meglio un colore "disponibile" in più che uno "occupato" da un demone inesistente).
