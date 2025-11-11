# Issue 00 — Layout & Namespacing

## Objective
Ensure Phase‑2 lives under namespaced folders without changing Phase‑1.

## Tasks
- Create folders:
  - contracts/programs/{FundRegistry.sol, modules/*, phase1_adapters/*}
  - scripts/programs/{deploy-adapter.ts, deploy-phase2.ts, export-ledger.ts, metrics/*, phase1-detect.ts}
  - config/programs/{policy-config.taipei.yaml, aqi_demo.json, phase1.addresses.json}
  - frontend/policy-ledger/index.html
  - docs/phase2_aqi_fund_spec.md
- Add npm scripts:
  - phase2:compile, phase2:deploy:adapter, phase2:deploy, phase2:evaluate, phase2:export, phase2:serve
- Keep PR small; no Phase‑1 edits.

## Acceptance
- All Phase‑2 files reside only under `/phase2` namespaces.
- `npm run phase2:compile` compiles successfully.
