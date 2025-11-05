# Issue: Governance — Allowlists, Thresholds, Revocation SOP, Trust Tiers

## Objective
Operationalize roles and thresholds for Phase 1.

## Tasks
- [ ] Configure allowlists: Publisher, Reviewers (3), Auditor (1)
- [ ] Set k-of-n = **2-of-3** reviewers for Attested
- [ ] Document **Revocation SOP** (who, when, how; public reason)
- [ ] Document **Trust score/tier** mapping for UI
- [ ] Set timeliness thresholds in config:
      ON_TIME=600s, SLIGHT_DELAY=1800s, LATE=+∞ (adjustable)

## Acceptance
- Governance config committed
- README Decision Log updated
- Demo flow shows clear roles & thresholds
