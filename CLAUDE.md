# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tikka is a decentralized raffle platform on Stellar/Soroban. This monorepo contains five packages: a React frontend (**client**), NestJS API (**backend**), blockchain event indexer (**indexer**), randomness oracle (**oracle**), and a Soroban contract SDK (**sdk**). Smart contracts (Rust) live in a separate repo.

## Commands

### Root-level
```bash
npm run install:all          # Install deps for all packages
npm run build                # Build all packages
npm run build:<package>      # Build one: client, sdk, backend, indexer, oracle
```

### Client (React 19 + Vite + TailwindCSS v4)
```bash
cd client
npm run dev                  # Vite dev server (port 5173)
npm run build                # tsc -b && vite build
npm run lint                 # eslint .
```

### Backend (NestJS + Fastify, port 3001)
```bash
cd backend
npm run start:dev            # nest start --watch
npm run test                 # jest (unit)
npm run test:e2e             # jest --config ./test/jest-e2e.json
npm run lint                 # eslint "{src,test}/**/*.ts"
```

### Indexer (NestJS + TypeORM + PostgreSQL + Redis, port 3002)
```bash
cd indexer
npm run start:dev            # nest start --watch
npm run test                 # jest
npm run test:watch           # jest --watch
npm run test:cov             # jest --coverage
npm run migration:run        # typeorm migration:run
npm run migration:revert     # typeorm migration:revert
npm run migration:generate   # typeorm migration:generate
```

### Oracle (NestJS, port 3003)
```bash
cd oracle
npm run start:dev            # nest start --watch
npm run lint                 # eslint "{src,test}/**/*.ts"
```

### SDK (@tikka/sdk — NestJS library)
```bash
cd sdk
npm run build                # nest build
npm run lint                 # eslint "{src,test}/**/*.ts"
```

### Running a single test (backend/indexer)
```bash
cd backend && npx jest --testPathPattern=<pattern>
cd indexer && npx jest --testPathPattern=<pattern>
```

## Architecture

### Data flow
```
Reads:  Client → Backend REST API → Indexer DB (PostgreSQL) + Supabase (metadata)
Writes: Client → @tikka/sdk → Soroban RPC → Stellar blockchain
Events: Stellar ledger → Indexer (Horizon SSE) → PostgreSQL + Redis cache
Draws:  Contract emits RandomnessRequested → Oracle → VRF/PRNG → receive_randomness() callback
```

### Backend (NestJS + Fastify)
- **Auth:** SIWS (Sign-In With Stellar) → JWT. Flow: `GET /auth/nonce` → wallet signs → `POST /auth/verify` → JWT issued.
- **Data merging:** Endpoints like `GET /raffles/:id` merge indexer contract state with Supabase off-chain metadata.
- **Rate limiting:** Three throttle tiers (default, auth, nonce) via `@nestjs/throttler` with custom `TikkaThrottlerGuard`.
- **Validation:** Zod schemas through custom pipes, not class-validator.
- Modules: `auth/`, `api/rest/{raffles,users,leaderboard,stats}/`, `services/` (indexer client, metadata, storage).

### Client (React 19 + Vite)
- **Routing:** React Router DOM with `LandingLayout` wrapper.
- **State:** Context providers (`AuthProvider`, `WalletProvider`) — no Redux/Zustand.
- **Hooks:** `useAuth`, `useWallet`, `useRaffles`, `useLeaderboard`.
- **Services layer:** `apiClient.ts` (HTTP with auth), `contractService.ts` (Soroban), `rpcService.ts`, `walletService.ts`.
- **Wallet integration:** `@creit.tech/stellar-wallets-kit` supporting Freighter, xBull, Albedo, LOBSTR.
- **Env vars:** Prefixed with `VITE_`. See `client/.env.example`. Run `npm run validate-env` to check.

### Indexer
- **Ingestion pipeline:** `EventIngestorService` polls Horizon → decodes XDR → processors (raffle, user) → PostgreSQL upsert → Redis invalidation → cursor saved.
- **TypeORM entities:** `raffle`, `ticket`, `user`, `raffle-event`, `platform-stat`, `indexer-cursor`.
- **Migrations:** Timestamped in `src/database/migrations/`. Auto-run on startup.
- **Health:** `/health` checks DB, Redis, and indexer lag.

### Oracle
- **Dual randomness:** VRF (Ed25519) for high-stakes (≥500 XLM), deterministic PRNG for low-stakes.
- **Commit-reveal:** `CommitmentService` manages two-phase scheme to prevent front-running.
- **Queue workers:** `randomness.worker.ts` and `commit-reveal.worker.ts` process jobs async.
- **Flow:** Listen for `RandomnessRequested` → enqueue → compute seed+proof → `TxSubmitterService` submits `receive_randomness()`.

### SDK
- **Modules:** `UserModule` (registration/profiles), `TicketModule` (buy/refund/query).
- **Network layer:** `rpc.service.ts` (Soroban RPC), `horizon.service.ts` (Stellar Horizon).
- **Wallet adapters:** Factory pattern in `wallet.factory.ts` — extensible for new wallets.
- Uses `bignumber.js` for token amounts (avoids floating-point).

## Raffle State Machine (Contract)
```
OPEN → DRAWING → FINALIZED
  └→ CANCELLED ←───────┘
```
States govern which contract methods are callable. See `docs/ARCHITECTURE.md` for the full contract interface.

## Key Config Files
- `client/.env.example` — Stellar network, Soroban RPC, Supabase, feature flags
- `backend/.env.example` — Supabase, JWT, SIWS, indexer URL, throttle settings
- `indexer/src/config/database.config.ts` — TypeORM/PostgreSQL config
- `indexer/src/data-source.ts` — TypeORM data source for migrations

## Conventions
- All NestJS services (backend, indexer, oracle, sdk) use `nest build` / `nest start --watch`.
- TypeScript strict mode across all packages. Target: ES2021 (NestJS packages), ES2022 (client).
- Client uses TailwindCSS v4 with `@tailwindcss/vite` plugin (no separate config file).
- Backend uses Fastify adapter (not Express) — `@nestjs/platform-fastify`.
