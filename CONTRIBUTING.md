# Contributing & Running (Phase 1)

## Dev quickstart
- Node 18+, pnpm or npm
- Foundry/Hardhat for contracts

### Contracts
```
pnpm install
pnpm hardhat compile
pnpm hardhat test
pnpm hardhat run scripts/deploy.ts --network sepolia
```

### Frontend
```
cd frontend
pnpm install
pnpm dev
```

### Services
```
cd services/verifier-api && pnpm dev
cd services/atproto-mirror && pnpm dev
cd services/firehose-view && pnpm dev
```

## Conventions
- Small PRs, conventional commits
- Keep interfaces stable; prefer extending view contracts
- Reflect decisions in README Decision Log
