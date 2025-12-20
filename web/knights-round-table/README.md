# Knights' Round Table — Public Forge UI

> *"Where brave knights gather to draw the sword and forge their destiny."*

## Overview

The Knights' Round Table is the public-facing interface of the Excalibur $EXS Protocol. Here, participants enter their axiomatic prophecy and attempt to "Draw the Sword" by running the Ω′ Δ18 miner.

## Features

### 1. Axiomatic Entry (Prophecy Input)
- Input field for the 13-word axiom
- Validation against the canonical sequence
- Mnemonic helper with word suggestions

### 2. "Draw the Sword" Button
- Triggers the Ω′ Δ18 Tetra-PoW miner
- Submits the forge attempt to the network
- Displays mining progress in real-time

### 3. Real-Time Visualization
- Live display of the 128 nonlinear rounds
- Hash state progression animation
- Difficulty target indicator
- Success/failure feedback

## Architecture

This interface is built as a modern web application:
- **Frontend**: Pure HTML/CSS/JavaScript with WebAssembly support
- **Miner Integration**: Direct connection to `pkg/miner/tetra_pow_miner.py`
- **Real-time Updates**: WebSocket connection for live forge tracking

## Getting Started

```bash
cd web/knights-round-table
npm install
npm run dev
```

Then navigate to `http://localhost:3000` to access the forge interface.

## The Sacred Axiom

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

Enter this exact sequence to begin your forge attempt.

---

*"Only those who prove their worth through ancient axioms may draw the sword from the stone."*
