## 1. Schema Rust — DemonManifest e tipi

- [x] 1.1 Ridefinire `DemonManifest` in `src-tauri/src/storage/demons.rs`: campo `geometry` da `String` a `serde_json::Value`, rimuovere `rotation_speed`, rendere `voice` obbligatorio (`serde_json::Value` non Option), aggiornare `color`/`opacity` come opzionali (ignorati per prince)
- [x] 1.2 Aggiornare `VALID_GEOMETRIES` con i cataloghi per rank: minor `[tetrahedron, cube, octahedron, icosahedron, point_cloud]`, major `[torus, moebius, dodecahedron, torus_knot, fragmented_cube]`
- [x] 1.3 Aggiungere validazione strutturale di `geometry` per rank: minor/major devono avere `type` + `rotation`, prince deve avere `type: "composite"` + `pattern` + `bodies` (2-3) + `orbits` + `rotations`
- [x] 1.4 Aggiungere validazione parametri specifici: torus_knot p≠q, indici orbit validi, catalogo forme per body prince

## 2. Genesis registry

- [x] 2.1 Creare modulo `src-tauri/src/storage/genesis_registry.rs` con struct `RegistryEntry` e funzioni `read_registry`, `write_registry`, `append_entry`, `remove_entry`
- [x] 2.2 Implementare cifratura/decifratura del file `genesis_registry.enc` con stessa master key e grimoire hash
- [x] 2.3 Integrare `remove_entry` nel flusso di bandimento (prima di cancellare i file del demone)

## 3. Generatore manifest backend

- [x] 3.1 Creare modulo `src-tauri/src/demons/manifest_generator.rs` con funzione `generate_manifest(rank, &registry) -> DemonManifest`
- [x] 3.2 Implementare selezione forma con random pesato (peso inversamente proporzionale all'uso nel rank)
- [x] 3.3 Implementare generazione colore HSL con repulsione intra-rank (N candidati, scegli il più distante)
- [x] 3.4 Implementare generazione voce per rank (minor: freq alta/veloce, major: media, prince: bassa/lenta)
- [x] 3.5 Implementare generazione parametri forma major (torus radius_ratio, moebius twists, torus_knot p/q)
- [x] 3.6 Implementare assemblaggio composizioni prince: 6 pattern (counter_rotating, orbital, nested, crowned, binary, axis), selezione forme body, orbite e rotazioni coerenti col pattern

## 4. Flusso genesi — integrazione

- [x] 4.1 Aggiornare `GenesisOutput` in `src-tauri/src/demons/genesis.rs`: rimuovere campo `manifest`, aggiungere solo `name` e `seal`
- [x] 4.2 Aggiornare `accept_demon` per chiamare `generate_manifest(rank, &registry)` e poi `create_demon` col manifest generato
- [x] 4.3 Aggiornare `accept_demon` per appendere entry al genesis registry dopo creazione
- [x] 4.4 Aggiornare il protocollo di genesi nel grimoire (§3) — rimuovere tutta la specifica del manifest JSON, il modello produce solo `{ "name", "seal" }`
- [x] 4.5 Aggiornare il frontend `useGenesis.ts` per gestire il nuovo flusso (nessun manifest nel response del modello)

## 5. Frontend — nuove geometrie

- [x] 5.1 Aggiungere geometrie in `src/ritual/geometries/index.ts`: `cube` (BoxGeometry), `octahedron` (OctahedronGeometry), `dodecahedron` (DodecahedronGeometry), `torus_knot` (TorusKnotGeometry con p/q da params)
- [x] 5.2 Aggiornare `GeometryType` union con tutte le nuove forme
- [x] 5.3 Aggiornare `createGeometry` per accettare params opzionali (per torus_knot p/q, moebius twists, torus radius_ratio)

## 6. Frontend — composite renderer prince

- [x] 6.1 Aggiornare `DemonForm.tsx` per riconoscere `geometry.type === "composite"` e creare un `THREE.Group` con N mesh figli
- [x] 6.2 Implementare creazione per-body: geometria, shader material con colore/opacity del body, wireframe overlay
- [x] 6.3 Implementare animazione orbite in `onFrame`: posizione = center + radius * [cos, 0, sin] ruotata sull'asse, con phase e direction
- [x] 6.4 Implementare rotazioni indipendenti per body in `onFrame`
- [x] 6.5 Propagare uniforms condivisi (glow, pulse_frequency, noise_amplitude) e stati (speaking, waiting) a tutti i body
- [x] 6.6 Mantenere compatibilità backward per minor/major — singolo mesh con shader + wireframe come prima

## 7. Frontend — aggiornare interfacce TypeScript

- [x] 7.1 Aggiornare `DemonManifest` interface in `DemonForm.tsx` e `Circle/index.tsx`: geometry da string a oggetto, rimuovere rotation_speed, voice obbligatorio
- [x] 7.2 Aggiungere tipi TypeScript per geometry minor/major/prince, body, orbit, rotation

## 8. Debug panel

- [x] 8.1 Aggiungere sezione "DEMON FORM SIMULATOR" con selettore rank e preview 3D
- [x] 8.2 Implementare bottone "Random" che invoca comando Tauri `debug_generate_manifest(rank)` e mostra il risultato
- [x] 8.3 Implementare controlli manuali: selezione forma, pattern (prince), colore
- [x] 8.4 Esporre comando Tauri `debug_generate_manifest(rank)` — genera manifest random senza persistere nel registry
- [x] 8.5 Aggiungere display versione nella sezione SISTEMA — leggere da Tauri app version o const build-time
- [x] 8.6 Preservare funzionalità debug esistenti (voice test, soundscape, waiting/speaking, session, prompt log)

## 9. Versione e cleanup

- [x] 9.1 Bump versione a `0.2.0` in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
- [x] 9.2 Aggiornare `test-grimoire.txt` con il nuovo formato genesi senza manifest
- [x] 9.3 Verificare compilazione `cargo build` e `npm run build` senza errori
