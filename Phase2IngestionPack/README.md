# CityOS Phase 2 — Ingestion Pack (v3, Phase‑1 issue style)

## Quick Start
1) Drop `Phase2IngestionPack/` into the root of `policyloop`.
2) Work the issues in order: 00 → 05.
3) Detect Phase‑1 addresses:
   ```bash
   node scripts/programs/phase1-detect.ts
   ```
4) Build + run:
   ```bash
   npx hardhat compile
   npx hardhat run scripts/programs/deploy-adapter.ts
   npx hardhat run scripts/programs/deploy-phase2.ts
   npx hardhat run scripts/programs/metrics/evaluate-all.ts
   npx hardhat run scripts/programs/export-ledger.ts
   npx http-server frontend/policy-ledger -p 8080 -c-1
   ```
5) Open http://localhost:8080

## Notes
- Issue files mirror Phase‑1 style (Objective / Tasks / Acceptance).
- AI verification loop moved into `AGENT_PROMPT.md` (not an issue).
