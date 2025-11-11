# Issue 02 — Frontend (Policy Ledger Viewer)

## Objective
Render on‑chain fund decisions from a JSON ledger as public transparency.

## Tasks
- Create `/frontend/policy-ledger/index.html` to read `/frontend/policy-ledger/ledger.json`.
- Card view per event: event type, programId, proofId, amountNTD, ts, tx, toWallet.
- Minimal CSS; no framework required.

## Acceptance
- After export step, page renders ≥6 events (≥4 eligibilities + ≥2 payouts).
- Layout works on desktop/mobile.
