# Issue 05 — Governance (Thresholds, Approvals, Phase‑1 Integration)

## Objective
Finalize thresholds, auto‑pay limit, approval policy, and proof linkage.

## Tasks
- Set `autoPayBelowNTD = 300,000`; everything above requires ApprovalGate (optional later).
- Confirm demo thresholds (coverage 90%, events 500, CEMS 95%, PM2.5 35.0).
- Ensure all events include `proofId` from Phase‑1 ODR.
- Update docs: decision integrity story; paste full spec into `/docs/phase2_aqi_fund_spec.md`.

## Acceptance
- Payouts below limit auto‑execute; caps enforced.
- ledger.json shows `proofId` on every event.
- Spec is present and matches implementation.
