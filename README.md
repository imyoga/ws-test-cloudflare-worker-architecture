# Cloudflare Workers WebSocket Ping-Pong

Real-time `wss://` WebSocket communication running on the Cloudflare Workers Free Tier.

## Features
- **Native `WebSocketPair` API**: Terminated directly at the Cloudflare Edge.
- **1-Second Roundtrip Exchange**: Server generates a random string with timestamp, UI receives it, strips the old timestamp, attaches a new client timestamp after 1 second, and sends it back. Server strips old timestamp, attaches a new server timestamp, and returns it.
- **Modern Responsive UI**: Built directly into the Worker (served at `/`), featuring live connection badge, roundtrip counters, manual string injection, and real-time color-coded message logging.
- **Zero Additional Request Charges for Messages**: Under Cloudflare Workers pricing, only the initial handshake counts as an HTTP request (against the 100k daily free tier limit). Data frames do not count as extra requests.
- **Automated CI/CD**: GitHub Actions workflow (`.github/workflows/deploy.yml`) to deploy to Cloudflare on push to `main`.

## Local Development
```bash
# Start local development server
npm run dev
```
Open [http://localhost:8787](http://localhost:8787) in your browser.

## Deployment via GitHub Actions
GitHub Actions automatically deploys this Worker on every push to `main`. Ensure the following repository secrets are set on GitHub:
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with `Workers:Edit` permission.
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID (`2c67e5f86906cd8d813f11218fdd22dc`).
