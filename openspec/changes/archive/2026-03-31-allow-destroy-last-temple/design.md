## Context

Il comando `destroy_temple` attualmente rifiuta la distruzione se esiste un solo tempio. Il frontend nasconde il bottone × quando `temples.length <= 1`. Il mago vuole poter azzerare tutto.

## Goals / Non-Goals

**Goals:**
- Permettere la distruzione dell'ultimo tempio
- Dopo la distruzione, mostrare la schermata di creazione tempio

**Non-Goals:**
- Aggiungere conferme extra oltre al Touch ID già presente

## Decisions

### 1. Rimozione check backend
Rimuovere la guardia `registry.len() <= 1` dal comando `destroy_temple`. Il Touch ID resta l'unica protezione.

### 2. Frontend: stato "zero templi"
Quando la lista templi è vuota dopo una distruzione, il TempleGate mostra solo il bottone "ERIGERE NUOVO TEMPIO" — stesso comportamento del primo avvio.

## Risks / Trade-offs

**[Distruzione accidentale dell'ultimo tempio]** → Mitigato da Touch ID obbligatorio. Il mago può sempre creare un nuovo tempio subito dopo.
