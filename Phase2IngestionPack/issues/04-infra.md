# Issue 04 — Infra (Phase‑1 Address Detection, CI Hook)

## Objective
Autodetect Phase‑1 addresses and wire Phase‑2 to read proofs cleanly.

## Tasks
- `scripts/programs/phase1-detect.ts`:
  - read `config/phase1.addresses.json` if present; otherwise scan `deployments/` or prompt
  - write `config/programs/phase1.addresses.json`
- Add simple CI/lint hook for phase2 compilation.
- Document troubleshooting in README.

## Acceptance
- `node scripts/programs/phase1-detect.ts` writes `config/programs/phase1.addresses.json` with ODR address.
- `npm run phase2:compile` passes in CI.
