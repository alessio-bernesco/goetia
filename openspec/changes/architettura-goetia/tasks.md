## 1. Scaffolding progetto

- [x] 1.1 Inizializzare progetto Tauri v2 con React + TypeScript + Vite
- [x] 1.2 Configurare struttura directory backend Rust (auth/, crypto/, demons/, api/, storage/, sync/, commands/)
- [x] 1.3 Configurare struttura directory frontend (hooks/, state/, places/, ritual/, audio/, ui/)
- [x] 1.4 Aggiungere dipendenze Rust: tauri v2, aes-gcm, sha2, hkdf, serde, serde_json, reqwest, security-framework, uuid, chrono
- [x] 1.5 Aggiungere dipendenze frontend: react, three.js, @types/three, typescript
- [x] 1.6 Configurare tauri.conf.json con permessi necessari (filesystem, shell, iCloud entitlements)
- [x] 1.7 Configurare .gitignore per escludere dati sensibili, chiavi, contenuti demoni

## 2. Autenticazione e Keychain

- [x] 2.1 Implementare modulo Touch ID via LocalAuthentication framework (touchid.rs)
- [x] 2.2 Implementare accesso Keychain per storage/retrieval master key (keychain.rs)
- [x] 2.3 Implementare storage/retrieval API key Anthropic in Keychain
- [x] 2.4 Implementare generazione master key 256-bit al primo avvio
- [x] 2.5 Implementare comandi Tauri: authenticate(), store_api_key(), has_api_key()
- [x] 2.6 Implementare richiesta Touch ID separata per operazioni distruttive (bandimento)

## 3. Cifratura e validazione crittografica

- [x] 3.1 Implementare cifratura AES-256-GCM con formato file: [grimoire_hash | nonce | ciphertext | tag] (cipher.rs)
- [x] 3.2 Implementare derivazione chiavi per-file via HKDF con master key + path come salt
- [x] 3.3 Implementare calcolo grimoire hash (SHA-256 della concatenazione ordinata dei 5 file)
- [x] 3.4 Implementare validazione grimoire_hash nell'header di ogni artefatto decifrato
- [x] 3.5 Implementare hash chain versioning in meta.json (catena di hash per upgrade grimoire)
- [x] 3.6 Implementare secure wipe (overwrite con dati random + delete) per bandimento

## 4. Storage e persistenza

- [x] 4.1 Implementare modulo paths.rs con risoluzione percorsi data store locale e iCloud
- [x] 4.2 Implementare CRUD grimoire: lettura, deploy iniziale (import), validazione struttura
- [x] 4.3 Implementare CRUD demoni: creazione directory, lettura seal/manifest/essence, persistenza cifrata
- [x] 4.4 Implementare CRUD cronache: creazione file per sessione, listing metadati, lettura singola cronaca
- [x] 4.5 Implementare struttura dati cronaca: metadata (demon, date, duration, turns, topics, mood_arc, summary) + conversation

## 5. Lock anti-concorrenza

- [x] 5.1 Implementare lock locale via PID file (lock.pid) con verifica processo attivo e cleanup stale
- [x] 5.2 Implementare lock distribuito via lock.json su iCloud (device_id, timestamp, heartbeat, ttl)
- [x] 5.3 Implementare heartbeat periodico (ogni 30 secondi) per lock distribuito
- [x] 5.4 Implementare acquisizione combinata: PID lock + iCloud lock all'avvio
- [x] 5.5 Implementare rilascio combinato: rimozione PID + lock.json con force sync alla chiusura

## 6. Sincronizzazione iCloud

- [x] 6.1 Implementare mirroring file locale → iCloud container (~/Library/Mobile Documents/iCloud~Goetia/)
- [x] 6.2 Implementare sync da iCloud → locale al primo avvio su nuovo device
- [x] 6.3 Implementare force sync via NSFileCoordinator prima del rilascio lock
- [x] 6.4 Implementare stato sync osservabile dal frontend (in progress / up to date)
- [x] 6.5 Configurare entitlements iCloud per l'app Tauri

## 7. Client API Anthropic

- [x] 7.1 Implementare client HTTP per Anthropic Messages API con autenticazione via Keychain (client.rs)
- [x] 7.2 Implementare streaming SSE per ricezione token-by-token (streaming.rs)
- [x] 7.3 Implementare parser incrementale JSON per estrazione progressiva di text e state dal flusso di token
- [x] 7.4 Implementare composizione system prompt per modalità genesi (grimoire §1 + §2 + §3)
- [x] 7.5 Implementare composizione system prompt per modalità evocazione (grimoire §1 + §2 + §4 + §5 + seal + essence)
- [x] 7.6 Implementare prompt caching headers per sezioni grimoire stabili
- [x] 7.7 Implementare gestione errori: JSON malformato, stream interrotto, rate limiting

## 8. Protocollo demoniaco — Genesi

- [x] 8.1 Implementare comando start_genesis(): apre sessione con system prompt genesi
- [x] 8.2 Implementare comando send_genesis_message(): invia messaggio nella conversazione di genesi
- [x] 8.3 Implementare parsing dell'output di genesi: estrazione seal.md e manifest.json dal modello
- [x] 8.4 Implementare comando accept_demon(): cifra e persisti seal + manifest + essence vuota, con grimoire_hash
- [x] 8.5 Implementare comando reject_genesis(): cleanup senza traccia

## 9. Protocollo demoniaco — Evocazione

- [x] 9.1 Implementare comando start_session(): carica demon context, componi system prompt, apri stream
- [x] 9.2 Implementare comando send_message(): invia al demone, ritorna stream JSON strutturato
- [x] 9.3 Implementare iniezione cronache selettive nel contesto (chronicle injection)
- [x] 9.4 Implementare comando end_session(): richiedi aggiornamento essence + genera cronaca + cifra + persisti
- [x] 9.5 Implementare vincolo: un solo demone evocato per volta (rifiuta evocazione se sessione attiva)

## 10. Protocollo demoniaco — Bandimento

- [x] 10.1 Implementare comando banish_demon(): richiedi Touch ID, wipe sicuro tutti i file, rimuovi da locale e iCloud
- [x] 10.2 Verificare assenza totale di tracce dopo bandimento (nessun file, metadato, riferimento)

## 11. Comandi Tauri — bridge IPC

- [x] 11.1 Registrare tutti i comandi Tauri in lib.rs con typing corretto
- [x] 11.2 Implementare auth_commands.rs: authenticate, store_api_key, has_api_key
- [x] 11.3 Implementare demon_commands.rs: list_demons, get_demon, get_essence
- [x] 11.4 Implementare chronicle_commands.rs: list_chronicles, get_chronicle
- [x] 11.5 Implementare genesis_commands.rs: start_genesis, send_genesis_message, accept_demon, reject_genesis
- [x] 11.6 Implementare session_commands.rs: start_session, send_message, end_session, inject_chronicle
- [x] 11.7 Implementare sync_commands.rs: acquire_lock, release_lock, sync_status

## 12. Frontend — Stato applicativo e hook

- [x] 12.1 Definire stato applicativo globale (appState.ts): auth, demon list, active session, navigation
- [x] 12.2 Definire stato sessione (sessionState.ts): conversation, demon state, streaming flag
- [x] 12.3 Implementare hook useTauriCommand per invocazione comandi Tauri tipizzati
- [x] 12.4 Implementare hook useSession per gestione sessione attiva (start, message, end, streaming)
- [x] 12.5 Implementare hook useGenesis per gestione genesi (start, message, accept, reject)
- [x] 12.6 Implementare hook useStreaming per ricezione e parsing stream (testo progressivo + stato)

## 13. Frontend — Scena 3D e shader

- [x] 13.1 Implementare Scene.tsx: setup Three.js, camera, renderer, loop di animazione
- [x] 13.2 Implementare GenesisVoid.tsx: void nero, griglia sottile, nubi di punti distanti rotanti, testo pulsante
- [x] 13.3 Implementare geometrie demone: IcosahedronForm, PointCloudForm, MoebiusForm, TorusForm, FragmentedCubeForm, TetrahedronForm
- [x] 13.4 Implementare DemonForm.tsx: carica geometria da manifest, applica colore/scala/opacità/glow base
- [x] 13.5 Implementare modulazione visiva transiente: mappa state → parametri shader (intensity, valence, arousal, color_shift, overrides)
- [x] 13.6 Implementare shader GLSL custom: glow, pulse, noise displacement, wireframe emissivo
- [x] 13.7 Implementare transizione cristallizzazione: dal void genesi alla forma del demone accettato
- [x] 13.8 Implementare transizione bandimento: dissoluzione/frammentazione della forma

## 14. Frontend — Audio engine

- [x] 14.1 Implementare AudioEngine.ts: inizializzazione AudioContext, gestione nodi audio
- [x] 14.2 Implementare Ambient.ts: soundscape generativo che risponde allo stato app (idle, genesis, evocation)
- [x] 14.3 Implementare VoiceSynth.ts: sintesi vocale generativa da parametri manifest + state del demone

## 15. Frontend — Navigazione e luoghi

- [x] 15.1 Implementare NavigationBar.tsx: 4 macro bottoni non-canonici (Cerchio, Evoca, Cronache, Sigilli)
- [x] 15.2 Implementare Circle place: scena demone + terminale conversazione + input mago + pulsante inject cronaca
- [x] 15.3 Implementare Evoke place: void genesi + conversazione creazione + accept/reject
- [x] 15.4 Implementare Chronicles place: selezione demone + timeline sessioni + vista dettaglio conversazione
- [x] 15.5 Implementare Seals place: galleria demoni (miniature 3D) + lettura seal + lettura essence + bandimento
- [x] 15.6 Implementare transizioni fluide tra luoghi (animazioni 3D: zoom, dissolve, morph)

## 16. Frontend — Componenti UI base

- [x] 16.1 Implementare Terminal.tsx: componente testo stile terminale per conversazioni e log
- [x] 16.2 Implementare GlowText.tsx: testo con glow pulsante per genesi e titoli
- [x] 16.3 Implementare interfaccia chronicle injection: lista cronache con selezione durante sessione attiva
- [x] 16.4 Implementare interfaccia import grimoire per primo avvio
- [x] 16.5 Implementare interfaccia inserimento API key per primo avvio
- [x] 16.6 Implementare indicatore stato sync iCloud

## 17. Integrazione e primo flusso end-to-end

- [ ] 17.1 Test end-to-end: primo avvio → Touch ID → import grimoire → inserimento API key
- [ ] 17.2 Test end-to-end: genesi completa → intervista → generazione demone → accettazione → persistenza cifrata
- [ ] 17.3 Test end-to-end: evocazione → conversazione streaming → stato visivo reattivo → congedo → essence + cronaca
- [ ] 17.4 Test end-to-end: consultazione cronache → timeline → dettaglio sessione → injection in sessione attiva
- [ ] 17.5 Test end-to-end: bandimento → Touch ID → wipe → verifica assenza tracce
- [ ] 17.6 Test end-to-end: sync iCloud → lock → scrittura → force sync → rilascio → verifica su secondo device simulato
