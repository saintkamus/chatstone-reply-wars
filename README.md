# Chatstone: The Reply Wars

A 3D multiplayer card battler prototype. It uses an authoritative Node + `ws` server, a Three.js tabletop client, and no frontend framework.

## Run Locally

```powershell
npm install
$env:PORT="7654"; npm start
```

Then open `http://localhost:7654` in two browser tabs. One tab creates a room, the other joins with the 4-letter code, then either tab can start the game.

Port note for this machine: `4173` and `3000` may be reserved by Windows here, so `7654` is the safer local port.

## Deploy On Render

This app needs a Node web service because multiplayer uses WebSockets and in-memory rooms. It is not a Netlify-style static site.

Render settings:

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`

The included `render.yaml` contains these settings for Render Blueprints.

## How To Play

- Both players start at 30 HP.
- Draw 1 card each turn and gain 1 mana crystal per turn, up to 10.
- Click a card to play it. Targeted spells ask you to click a highlighted target.
- Minions attack after they are ready. Taunt minions must be cleared first.
- Reduce the enemy hero to 0 HP to win.

## Layout

| Path | What it is |
| --- | --- |
| `server.js` | HTTP static server, WebSocket rooms, and authoritative rules engine |
| `public/main.js` | lobby, WebSocket protocol, HUD, and audio |
| `public/scene.js` | Three.js tabletop, raycast input, targeting arrow, tweens, and FX |
| `public/cards.js` | card texture factory and token card rendering |
| `public/lib/` | vendored Three.js files |
| `assets/chatstone/` | generated board, cards, icons, portraits, and manifest |
