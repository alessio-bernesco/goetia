## Why

La forma 3D di un demone è attualmente scollegata dal suo rango. Un minor può avere un toroide, un prince un tetraedro. La complessità visiva dovrebbe **essere** il rango — non dichiararlo, ma manifestarlo. Inoltre la generazione della geometria è delegata al modello AI nel system prompt, con rischio di manifest invalidi e complessità inutile nel prompt. La geometria deve essere generata dal backend Rust, deterministicamente corretta e visivamente unica per ogni demone.

## What Changes

- **BREAKING**: il campo `manifest.geometry` passa da `string` a oggetto strutturato, con schema diverso per rank (minor: solido singolo, major: forma topologica con params, prince: composizione multi-corpo)
- **BREAKING**: i campi `rotation_speed`, `color`, `opacity` al livello top del manifest vengono riorganizzati — per prince, colore e opacità si spostano dentro ogni body
- **BREAKING**: il campo `voice` diventa obbligatorio e generato dal backend con range per rank (minor: frequenza alta/veloce, major: media, prince: bassa/lenta)
- La generazione di geometria, colore e voce viene rimossa dal modello AI e spostata nel backend Rust con randomizzazione vincolata per rank
- Nuovo file cifrato `genesis_registry.enc` per tracciare forme/colori assegnati e ridurre duplicazioni visive per rank
- Nuove forme: `octahedron`, `cube` (minor), `torus_knot`, `fragmented_cube` reclassificato (major), 6 pattern compositivi prince (`counter_rotating`, `orbital`, `nested`, `crowned`, `binary`, `axis`)
- Debug panel: simulatore forme demone (random per rank o manuale) e visualizzazione versione release
- Bump versione a `0.2.0`

## Capabilities

### New Capabilities
- `rank-geometry-schema`: schema `geometry` strutturato per rank — minor (platonici), major (topologici con params), prince (compositi 2-3 corpi con orbite/rotazioni)
- `backend-geometry-generation`: generazione random vincolata di geometria, colore e voce nel backend Rust, con repulsione cromatica per rank
- `genesis-registry`: registro cifrato delle combinazioni forma/colore assegnate per ridurre sovrapposizioni visive
- `prince-composite-renderer`: renderer Three.js per composizioni multi-corpo con orbite, controrotazioni e pattern compositivi
- `debug-form-simulator`: strumento debug per simulare e validare visivamente le forme demone per rank
- `debug-release-version`: visualizzazione versione release nel pannello debug

### Modified Capabilities
- `genesis-prompt-update`: il protocollo di genesi (§3 del grimoire) viene semplificato — il modello produce solo `{ "name", "seal" }`, tutta la specifica manifest/geometria/voce viene rimossa dal prompt

## Impact

- **Backend Rust** (`src-tauri/src/storage/demons.rs`): nuovo schema `DemonManifest`, `DemonGeometry` enum per rank, generatore random, validazione, genesis registry
- **Backend Rust** (`src-tauri/src/api/`): rimozione geometria/colore/voce dal prompt di genesi inviato al modello
- **Frontend** (`src/ritual/geometries/`): nuove geometrie (octahedron, cube, torus_knot), factory aggiornata
- **Frontend** (`src/ritual/DemonForm.tsx`): supporto composizioni multi-corpo, orbite, rotazioni indipendenti
- **Frontend** (`src/places/Circle/`): adattamento a nuovo schema geometry oggetto
- **Frontend debug**: nuovo simulatore forme + display versione
- **Schema**: `test-grimoire.txt` e qualsiasi doc di riferimento per il formato manifest
- **Versione**: `package.json`, `Cargo.toml`, `tauri.conf.json` → `0.2.0`
