# Crypto Vertex — Vertex Hunter

Vertex Hunter is a research dashboard and **paper-trading-only** scanner for MEXC USDT-margined perpetual futures. It uses public market data and a virtual $100 wallet; it does not place real orders.

## Project location

The application is in [vertex-hunter/](./vertex-hunter/). Its README contains the architecture, feature list, run instructions, risk limitations, and deployment details.

## Important: hosting

This is **not a static website**. It needs a long-running Node.js server, WebSocket market feed, and persistent SQLite storage. GitHub Pages cannot run the backend.

### Deploy on Railway

1. In Railway, create a project and deploy this GitHub repository.
2. Set the service **Root Directory** to `/vertex-hunter`. This is important because the Dockerfile and `railway.json` are inside that folder.
3. Add a persistent Volume mounted at `/data`.
4. Set environment variables:
   - `DATA_DIR=/data`
   - `DASHBOARD_TOKEN` to a long, randomly generated secret (recommended).
5. Keep the service at **one replica** because the scanner holds live state in memory and SQLite is single-writer.
6. After deployment, check `https://YOUR-DOMAIN/api/health`.

See [vertex-hunter/README.md](./vertex-hunter/README.md) for recovery guidance and validation caveats.

## Run locally

Requires Node.js 22.18 or newer.

```bash
cd vertex-hunter
npm ci
npm start
npm test
```

Open http://localhost:3000.

## Safety and limitations

- Paper trading only; no exchange API keys are required or used.
- Scores rank setups; they are not probabilities of success.
- Backtests and paper results do not establish future profitability.
- Never commit `.env` files, access tokens, private keys, or other secrets.
