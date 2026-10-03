# ARACHNE

An AI agent shaped like a spider, living at the center of a web of 72 claimable
nodes.

## Running locally

Two processes: the Vite frontend and an Express backend. Both need to be
running for the web to show live, shared state (otherwise the frontend just
shows an empty web — it has no local-only fallback anymore).

```bash
# terminal 1 — backend (http://localhost:8787)
cd server
npm install
npm run dev

# terminal 2 — frontend (http://localhost:5183)
npm install
npm run dev
```

The frontend reads the backend's URL from `VITE_API_URL` (see `.env`,
defaults to `http://localhost:8787`).

## Backend

`server/` is a small Express API backed by SQLite (via Node's built-in
`node:sqlite`, no native build step). It owns:

- the 72 lots — status, owner, custom name, whisper — shared by every visitor
- wallet login: a signed-challenge flow for real wallets (EIP-191 for EVM via
  `viem`, ed25519 for Solana via `tweetnacl`), plus an unauthenticated demo
  path for browsers with no wallet extension installed
- user profiles (nickname, created/last-login timestamps)

See `server/src/index.ts` for the full route list. The chat agent and the
data-archive flavor text are still generated client-side — standing up a real
language model for that is the next phase (see the brief's Phase 3).

## Frontend

Vite + React + TypeScript. Canvas-free: the web is SVG, the spider is a
sprite walking a real graph of threads. State:

- `src/state/WalletContext.tsx` — wallet connection + session
- `src/state/useLotsStore.ts` — lots, synced with the backend (polls every 6s,
  optimistic updates on claim/sell/transfer/rename/whisper)
- `src/state/ChatContext.tsx`, `src/state/ArchiveContext.tsx` — client-only
  flavor systems, not backed by the server
- `src/i18n/` — English/Russian UI strings and content; `src/state/LanguageContext.tsx`
  holds the active language
