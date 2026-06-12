# Deploying Chatstone on Render

This app needs a real Node process because multiplayer uses WebSockets and in-memory rooms. Deploy it as a Render Web Service, not as a static site.

## Render settings

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`

The included `render.yaml` has the same settings, so Render can also import it as a Blueprint.

## Files Render needs

- `server.js`
- `package.json`
- `package-lock.json`
- `public/`
- `assets/chatstone/`
- `render.yaml`

Everything else is ignored for deployment.
