# Issue 03 — Scripts & Metrics & Ledger Export

## Objective
Deploy Phase‑2, compute metrics, evaluate modules, and export a public ledger.

## Tasks
- `scripts/programs/deploy-adapter.ts`: deploy Phase‑1 adapter with detected ODR address.
- `scripts/programs/deploy-phase2.ts`: deploy registry + 4 modules; register caps.
- `scripts/programs/metrics/{resolve-proof.ts, parse-dataset.ts, evaluate-all.ts}`:
  - use `config/programs/aqi_demo.json` for demo metrics
  - ABI‑encode payloads per module; call evaluate(proofId, metrics)
- `scripts/programs/export-ledger.ts` → write `/frontend/policy-ledger/ledger.json`.

## Acceptance
- ≥4 `EligibilityIssued` and ≥2 `PayoutExecuted` recorded in ledger.json.
- Amounts do not exceed caps.
