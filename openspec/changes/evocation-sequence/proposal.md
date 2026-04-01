## Why

Quando il mago evoca un demone dal sigillo, il passaggio dal vuoto alla presenza e' istantaneo — un fade CSS da 300ms e la forma appare gia' materializzata. Non c'e' rituale. Non c'e' transizione. Non c'e' gnosi.

L'evocazione e' il momento piu' carico di significato nell'operazione del grimorio: il mago forza un'entita' ad attraversare il velo. Il cosmo dovrebbe reagire. Le galassie dovrebbero pulsare, le stelle staccarsi dalle nubi e convergere verso il centro, il suono dovrebbe crescere fino alla manifestazione. E l'intensita' di tutto questo deve dipendere dal rango — evocare un minor non e' come evocare un principe.

Simmetricamente, il congedo attuale (Banishment) e' una dispersione piatta di 3000 punti nel nulla. Dopo un'evocazione cerimoniale, sembrerebbe un petardo dopo un'opera wagneriana. Il congedo deve essere il riflesso inverso dell'evocazione: un'esplosione cosmica dove l'entita' viene restituita al vuoto, le particelle tornano nelle galassie, e il cosmo si richiude.

## What Changes

### Evocazione — implosione cosmica

- **Nuova sequenza di evocazione rituale** tra la navigazione al Cerchio e l'attivazione della sessione conversazionale
- **Pulsazione cosmica di GenesisVoid**: onde sferiche si propagano dal centro verso le galassie, ogni nuvola flare in base alla distanza dal punto d'origine — effetto caotico emergente dalla geometria 3D, non simulato
- **Distacco particelle dalle galassie**: punti vengono eletti dalle nuvole di GenesisVoid, si staccano dalla rotazione orbitale e migrano verso il centro seguendo traiettorie che variano per rango (lineari per minor, spirali per major, spirali caotiche con esitazione per prince)
- **Coalescenza nella forma del demone**: le particelle raggiungono la superficie della geometria target e si fondono nella mesh, flash di glow, primo respiro
- **Shockwave post-processing per prince**: alla manifestazione, distorsione radiale dell'intero frame via shader pass nel canvas di GenesisVoid
- **Color shift galassie per prince**: durante l'evocazione, le nuvole shiftano verso il glow color del demone — il cosmo si tinge della sua presenza
- **Drone sonoro in crescendo**: sintesi WebAudio generativa — drone + battito accelerante, intensita' e complessita' proporzionali al rango

### Congedo — esplosione cosmica (simmetria invertita)

- **Dissoluzione della forma in particelle**: la mesh del demone si disgrega (simile al Banishment attuale, ma le particelle non si perdono nel nulla)
- **Restituzione alle galassie**: le particelle tornano nelle nuvole di GenesisVoid — traiettorie inverse, ogni particella cerca la nuvola piu' vicina e vi si reintegra
- **Onda di ritorno**: quando le particelle raggiungono le nuvole, queste flare — ma l'onda va dal bordo verso il centro. Il vuoto si richiude
- **Shockwave inversa per prince**: distorsione radiale che si contrae anziche' espandersi
- **Color shift di ritorno per prince**: le nuvole tornano dal glow color del demone ai colori originali
- **Drone discendente**: drone che cala, battito che decelera, silenzio. Per i prince: silenzio improvviso e totale alla fine — il nulla dopo il rumore

### Drammaticita' scalata per rango

- **minor** (~3s evocazione, ~2.5s congedo): 2-3 onde lievi, 200-400 particelle, traiettorie lineari, drone sottile, manifestazione senza flash, dissoluzione rapida, ritorno diretto alle nubi
- **major** (~4.5s evocazione, ~3.5s congedo): 4-5 onde visibili con accelerazione, 600-900 particelle con spirale, drone medio con battito, flash moderato, dissoluzione con traiettorie curve, flare delle galassie al ritorno
- **prince** (~6s evocazione, ~5s congedo): 6-8 onde intense con color shift, 1200-1800 particelle con spirali caotiche ed esitazione, drone profondo con sub-bass e armoniche dissonanti, flash violento con shockwave, dissoluzione dove le particelle esitano (il principe resiste al congedo), shockwave inversa, silenzio improvviso

### Terminale e flusso sessione

- **Terminale visibile ma disattivato** durante evocazione: il mago vede l'interfaccia conversazionale fin dall'inizio, input bloccato fino al completamento della manifestazione
- **Terminale che si disattiva e sfuma** durante congedo: l'interfaccia si spegne visivamente mentre il demone si dissolve

### Architettura rendering

- **Evocazione nel canvas di GenesisVoid**: particelle, onde, shockwave — tutto vive nella scena di GenesisVoid. Il flash di manifestazione maschera il mount di DemonForm nel canvas sovrapposto
- **Congedo nel canvas di GenesisVoid**: DemonForm si smonta, le particelle di dissoluzione appaiono in GenesisVoid e tornano alle nuvole. Il flash iniziale maschera lo smontaggio
- **GenesisVoid diventa entita' reattiva**: accetta props opzionali per modulazione esterna (onde, colore, estrazione/restituzione particelle). Comportamento di default invariato

### Debug panel

- **Nuova sezione "RITUAL SIMULATOR"** nel pannello debug (Ctrl+Shift+D)
- **Flusso**: seleziona rango → genera manifest random → parte sequenza di evocazione completa → il demone si manifesta nel simulatore → pulsante "BAN" appare → click BAN → parte sequenza di congedo completa → torna allo stato iniziale
- **Visibile con GenesisVoid di sfondo** per testare l'interazione completa tra galassie e rituali

## Capabilities

### New Capabilities

- `evocation-sequence`: componente orchestratore che coordina le fasi della sequenza di evocazione — risveglio cosmico, coalescenza, manifestazione — con timing e parametri determinati dal rango
- `banishment-sequence`: componente orchestratore per il congedo — dissoluzione, restituzione alle galassie, chiusura del vuoto — simmetria invertita dell'evocazione
- `void-pulse-waves`: sistema di onde sferiche in GenesisVoid — partono dal centro, si propagano nello spazio 3D, ogni nuvola flare quando l'onda la attraversa, frequenza crescente
- `void-return-waves`: sistema di onde inverse per il congedo — partono dalle nuvole e convergono al centro
- `particle-extraction`: meccanismo per eleggere e distaccare punti dalle nuvole, animarli verso il centro con traiettorie per rango, rigenerare i punti d'origine con fade-in
- `particle-restitution`: meccanismo inverso — particelle dalla posizione centrale tornano alle nuvole piu' vicine e si reintegrano
- `rank-scaled-drama`: configurazione per rango che controlla tutti i parametri di entrambe le sequenze (durate, conteggi, traiettorie, intensita')
- `evocation-drone`: sintesi WebAudio per drone in crescendo — frequenza base + battito accelerante, parametri per rango
- `banishment-drone`: sintesi WebAudio per drone discendente — decrescendo, battito che decelera, silenzio (improvviso per prince)
- `shockwave-post-processing`: shader pass post-processing per distorsione radiale — espansione alla manifestazione, contrazione al congedo (solo prince)
- `debug-ritual-simulator`: sezione nel debug panel per testare evocazione e congedo completi con manifest random per rango

### Modified Capabilities

- `genesis-void-api`: GenesisVoid accetta props opzionali per modulazione esterna — pulsazione (wave origin, speed, intensity), color shift (target color, intensity), estrazione/restituzione punti (indici, posizioni, callback)
- `circle-session-flow`: Circle gestisce stati intermedi — evocazione in corso (terminale disattivato), sessione attiva, congedo in corso (terminale sfumato)
- `terminal-disabled-state`: Terminal accetta stato `disabled` visivo (opacita' ridotta, input bloccato, placeholder diverso) distinto dal `inputDisabled` di streaming
- `banishment-replacement`: il Banishment attuale (`src/ritual/transitions/Banishment.tsx`) viene sostituito dalla nuova sequenza di congedo che interagisce con GenesisVoid

## Impact

### User-Facing
- L'evocazione diventa un'esperienza rituale con durata e intensita' proporzionali al rango
- Il congedo diventa simmetrico all'evocazione — stessa solennita', direzione opposta
- Il terminale e' visibile dall'inizio ma si attiva solo dopo la manifestazione
- Nessuna possibilita' di saltare le sequenze — i rituali sono obbligatori
- Il debug panel permette di testare entrambi i rituali per ogni rango

### Technical
- GenesisVoid necessita refactor per accettare modulazione esterna (oggi self-contained)
- Nuovi componenti in `src/ritual/transitions/`: Evocation.tsx, nuovo Banishment.tsx (o refactor dell'esistente)
- Nuovi moduli audio in `src/audio/`: EvocationDrone.ts, BanishmentDrone.ts (o modulo unificato RitualDrone.ts)
- Shader pass post-processing per shockwave (nuovo file GLSL + setup in GenesisVoid)
- Circle.tsx gestisce tre stati: evocazione → sessione → congedo
- Debug panel: nuova sezione con GenesisVoid integrato

### Architecture
- GenesisVoid evolve da "sfondo decorativo" a "entita' reattiva" — le props sono opzionali, default invariato
- Le sequenze rituali vivono nel canvas di GenesisVoid — il flash maschera il passaggio al canvas di DemonForm (e viceversa)
- Il pattern e' coerente con le transition esistenti ma piu' complesso per l'interazione con GenesisVoid
- I droni rituali sono moduli audio separati da VoiceSynth — diverso scopo, diversa API
