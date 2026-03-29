# Reset completo — distruzione del tempio

Questa procedura elimina tutti i dati di GOETIA: grimoire, demoni, cronache, chiavi crittografiche, API key. Irreversibile.

## Quando usarla

- Dopo i test, prima di andare in produzione con il grimoire reale
- Per ripartire da zero su un device
- Per rimuovere completamente GOETIA da un sistema

## Procedura

### 1. Chiudi l'applicazione

GOETIA deve essere chiusa prima di procedere. Se è in esecuzione, il lock file impedirà operazioni pulite.

### 2. Cancella il data store locale

```bash
rm -rf ~/Library/Application\ Support/Goetia/
```

Contiene: grimoire cifrato, directory demoni (sigilli, manifesti, essenze, cronache), lock file, device ID.

### 3. Cancella il data store iCloud

```bash
rm -rf ~/Library/Mobile\ Documents/iCloud~com~goetia~app/
```

Contiene: mirror cifrato del data store locale, lock.json distribuito.

### 4. Cancella le chiavi dal Keychain macOS

```bash
security delete-generic-password -s "com.goetia.app" -a "master-key"
security delete-generic-password -s "com.goetia.app" -a "anthropic-api-key"
security delete-generic-password -s "com.goetia.app" -a "touchid-sentinel"
```

Se una chiave non esiste, il comando stampa un errore — è normale, ignoralo.

### 5. Cancella il grimoire di test (se presente)

```bash
rm -f test-grimoire.txt
```

## Cosa succede al prossimo avvio

1. Touch ID / autenticazione
2. Generazione nuova master key (256-bit, salvata nel Keychain)
3. Richiesta deploy grimoire (quello reale, questa volta)
4. Richiesta API key Anthropic
5. Il tempio è vuoto — pronto per la prima genesi

## Note

- La master key è la radice di tutta la cifratura. Eliminandola, anche se i file cifrati restassero su disco, sarebbero irrecuperabili.
- Su un altro device con lo stesso Apple ID, il Keychain iCloud potrebbe ancora contenere le chiavi. Esegui la procedura su ogni device.
- Non esiste undo. Non esiste backup. Questo è il bandimento del tempio stesso.
