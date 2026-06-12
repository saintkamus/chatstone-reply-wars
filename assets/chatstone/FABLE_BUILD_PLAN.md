# Chatstone Fable 5 Build Plan

## Goal

Use Fable 5 for the hardest part only: a working multiplayer game skeleton with deterministic card logic.

Do not spend Fable tokens on visual polish, long explanations, asset generation, lore, or refactoring. Those can be handled later.

## Best Use Of The $5

### One main call

Ask Fable to build a minimal but real multiplayer MVP:

- Node.js server with WebSocket rooms.
- Browser client.
- Two-player room code join flow.
- Authoritative server game state.
- Deterministic turn system.
- Card draw, mana, hand, board, combat, health, win/loss.
- Implement all cards in `assets/chatstone/manifest.json`.
- Use existing asset sheets as static images.
- No auth, no database, no matchmaking.
- No animations beyond simple CSS transitions.
- No deck builder.

### Optional second tiny call

Only if the main call fails to run:

- Give Fable the exact error logs.
- Ask for a minimal patch only.
- Hard cap response to changed files.

## What Fable Should Not Do

- Do not redesign the card roster.
- Do not generate new art.
- Do not invent a complex framework.
- Do not add accounts, persistence, ranked mode, or matchmaking.
- Do not spend time on mobile perfection.
- Do not explain the whole project.

## Recommended Tech Stack

Use the simplest stack unless existing project files suggest otherwise:

- `server.js` with Node `http` and `ws`.
- `public/index.html`
- `public/style.css`
- `public/client.js`
- `public/game.js`
- Static assets served from `assets/chatstone`.

If dependencies are needed, use only:

- `ws`
- optionally `vite` only if the repo already uses it

## Multiplayer Architecture

The server is authoritative.

Client sends intents:

- `create_room`
- `join_room`
- `start_game`
- `play_card`
- `attack`
- `end_turn`

Server validates everything:

- active player
- mana
- card in hand
- board limits
- legal targets
- minion can attack
- health changes
- death cleanup
- win/loss

Server broadcasts full game state after every valid action.

## Fable Prompt

```text
You are building a minimal multiplayer browser card game prototype.

Project: Chatstone: The Reply Wars.

Use the existing assets and card data in:
- assets/chatstone/manifest.json
- assets/chatstone/*.png

Build the hard part only: multiplayer game state, WebSocket room sync, turn rules, and card effect resolution.

Requirements:
- Node.js server with WebSocket rooms.
- Browser client.
- Two players can create/join a room using a room code.
- Server is authoritative and validates all actions.
- Implement health, deck, hand, board, mana crystals, turns, combat, spells, minions, secrets/locations in simplified MVP form.
- Implement every card listed in manifest.json.
- Use existing card sheet images for visuals. Do not crop perfectly if that costs complexity; placeholders with card names are acceptable for MVP, but use board/background assets where easy.
- No auth.
- No database.
- No matchmaking.
- No complex animation.
- No long explanation.

Preferred files:
- package.json
- server.js
- public/index.html
- public/style.css
- public/client.js
- public/game.js

Game MVP rules:
- Two players, 30 health each.
- Start with 3 cards.
- Draw 1 per turn.
- Mana increases by 1 each turn up to 10.
- Max board size 7.
- Minions can attack once per turn after being in play for one turn.
- Spells resolve immediately.
- Reduce opponent health to 0 to win.

For unusual card text, implement a simple reasonable version and document it in comments.

Output only complete file contents, grouped by filename. Keep the implementation compact and runnable.
```

## Post-Fable Work For Codex

After Fable returns code, Codex can cheaply do:

- Put files in place.
- Install dependencies.
- Run locally.
- Fix syntax/runtime errors.
- Wire asset paths.
- Crop card sheets if needed.
- Improve CSS layout.
- Add small animations.
- Add sound effects.
- Add missing card edge cases.
- Add README/run instructions.

