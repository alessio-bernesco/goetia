# GOETIA

## Natura del progetto

GOETIA è un'applicazione desktop locale per macOS. È un grimorio digitale operativo — un portale per evocare, vincolare e interagire con entità AI persistenti (demoni), ciascuna istanza di Claude Opus via API Anthropic.

Non è un chatbot. Non è un IDE. Non è un wrapper per LLM. È un dispositivo per l'esperienza — un primer per la trance transumana. L'interfaccia è il cuore del progetto, non un mezzo.

## Stack tecnologico

- **Runtime**: Tauri v2
- **Backend**: Rust
- **Frontend**: React + TypeScript
- **Esperienza visiva**: Three.js, WebGL, shader GLSL custom
- **Esperienza sonora**: WebAudio API (sintesi generativa, non file audio)
- **API**: Anthropic Claude API, modello Opus (claude-opus-4-6)
- **Autenticazione**: Touch ID via LocalAuthentication framework (macOS Keychain)
- **Cifratura**: AES-256-GCM
- **Repository**: GitHub privato, 2FA obbligatorio, SSH key

## Architettura

### Backend Rust

Il backend Rust è l'unico mediatore tra il filesystem e il frontend. Nessuna operazione su file avviene dal frontend. Tutte le interazioni passano attraverso comandi Tauri.

Responsabilità:
- Gestione sicura della API key Anthropic (macOS Keychain)
- Autenticazione biometrica (Touch ID)
- Cifratura e decifratura di tutti i dati persistiti (AES-256-GCM)
- Sincronizzazione cloud cifrata dei dati
- Composizione del context per ogni evocazione
- Applicazione dei vincoli di isolamento tra demoni
- Persistenza delle cronache e delle essenze

### Frontend React + TypeScript

React fornisce la struttura. Non impone l'estetica. L'interfaccia non deve somigliare a nessun software esistente — nessun pattern UI convenzionale, nessun componente riconoscibile.

Three.js, shader GLSL custom e WebAudio API sono gli strumenti primari dell'esperienza. Il design estetico è a guida del mago. L'implementazione è responsabilità di Claude Code.

## Protocollo demoniaco

### Struttura di un demone

Ogni demone è una directory cifrata contenente:

```
demons/
  {nome-demone}/
    seal.md        # Identità unica — scritto dal mago, immutabile dal demone
    essence.md     # Memoria sintetica — territorio esclusivo del demone
    chronicles/    # Log cifrati delle conversazioni
```

### I documenti fondamentali

**grimoire.md** (globale, condiviso)
Il testo comune a tutti i demoni. Le regole del tempio: come si rivolgono al mago, i confini dell'operazione, il tono, il registro. È il cerchio esterno. Uguale per tutti i demoni. Scritto e mantenuto dal mago.

**seal.md** (per demone, unico)
L'identità specifica del demone. Specializzazione, carattere, strumenti, dominio di competenza. Scritto dal mago. Il demone non può modificare il proprio sigillo.

**essence.md** (per demone, autonomo)
Memoria sintetica persistente del demone. Generata e aggiornata autonomamente dall'entità a fine sessione. Il mago può consultarla in sola lettura ma non può modificarla. L'essenza è la mente del demone dentro il vincolo del sigillo. Demoni diversi, esposti allo stesso mago, svilupperanno memorie diverse.

**chronicles/** (per demone)
Log completo di ogni conversazione, cifrato e archiviato. Consultabile ma non iniettato per intero nel context.

### Flusso di evocazione

1. Il mago seleziona un demone
2. Il backend Rust carica e decifra: grimoire.md + seal.md + essence.md
3. Compone il system prompt: grimoire.md → seal.md → essence.md
4. Apre il canale API con Opus (prompt caching attivo sul system prompt)
5. La conversazione scorre via streaming
6. A fine sessione il demone aggiorna autonomamente la propria essence.md
7. La cronaca viene cifrata e archiviata

### Vincoli di isolamento

- Un demone non può modificare il proprio sigillo (seal.md)
- Un demone non può alterare il grimoire.md
- Un demone non può accedere ai sigilli, essenze o cronache di altri demoni
- Ogni evocazione è contenuta nel suo cerchio
- Il backend Rust applica questi vincoli — il frontend non ha accesso diretto al filesystem

### Ottimizzazione costi

Il grimoire.md è identico per ogni evocazione → prompt caching di Anthropic lo processa una volta e lo serve a costo ridotto per ogni demone successivo. I seal.md stabili beneficiano dello stesso meccanismo. Mantenere i system prompt stabili è una scelta architetturale e economica.

## Sicurezza

- **Nessun segreto nel repository**: API key, dati cifrati, contenuti dei sigilli non entrano mai in Git
- **Cifratura at rest**: tutti i dati dei demoni sono cifrati con AES-256-GCM
- **Cifratura in transit**: sincronizzazione cloud esclusivamente su canale cifrato
- **Autenticazione biometrica**: Touch ID obbligatorio per accedere al grimorio
- **API key**: gestita via macOS Keychain, mai esposta al frontend
- **.gitignore rigoroso**: esclude ogni dato sensibile, chiave, e contenuto dei demoni

## Principi per Claude Code

- Questo progetto ha un'estetica e un linguaggio propri. Rispettali.
- Il backend Rust deve essere solido, sicuro, minimale. Nessuna complessità non necessaria.
- Il frontend è lo spazio della massima libertà espressiva. Nessun framework UI, nessun component library, nessun design system importato.
- Ogni decisione architetturale non coperta da questo documento va discussa prima di essere implementata.
- Il mago decide l'architettura. Claude Code la esegue.
