# CityOS — Taipei AQI Evidence → Policy Automation

This repo now shows the entire chain for Taipei’s Air Pollution Control Fund:

```
MOENV dataset ──► Phase‑1 proofs (authorship + hash) ──► Phase‑2 IoT “drip” module ──► Public ledger/dashboard
```

- **Layer 1 — Verifiable Evidence:** `PublisherRegistry`, `OpenDataRegistry`, `AttestationRegistry`, and `PolicyDataView` anchor every MOENV dataset (`proofId`) on-chain. The ingest daemon (`services/ingest-moev`) fetches hourly data, hashes it, gets an allow‑listed signature, and publishes it.
- **Layer 2 — Policy Logic:** `contracts/programs` adds `FundRegistry` plus modular program contracts. The initial module (`ProgramModule_IoT`) consumes Phase‑1 proofs, checks weekly coverage/latency targets, and disburses ≤ 300 k NTD tranches automatically. More modules can be added later without touching Layer 1.
- **Public Transparency:** Scripts under `scripts/programs` evaluate proofs, export `frontend/policy-ledger/ledger.json`, and the Next.js dashboard renders the whole flow (evidence, automation metrics, payouts) on a single page.

---

## Repo Layout

```
contracts/                             # Phase-1 registries live at root
  programs/                            # FundRegistry + ProgramModule_* (phase-2)
frontend/
  app/                                 # Next.js App Router
    components/                        # shared cards/widgets
    api/ingest-*                       # ingest controls
  policy-ledger/                       # ledger assets (read by UI)
services/
  ingest-moev/                         # fetch + hash + publish + status JSON
  verify-api/, atproto-mirror/, ...    # supporting services
scripts/programs/                      # deploy + evaluator + ledger exporter
config/programs/                       # addresses, demo datasets, module metadata
docs/
  phase2_aqi_fund_spec.md              # full spec you’re reading now
```

*(Phase‑1 documentation from the earlier demo lives in `/issues` and the Git history. This README replaces the conflicting versions.)*

---

## Run Everything Locally

```
npm install
npm run dev:all              # spins up Hardhat + ingest + verify + mirror + firehose + frontend
```

That script:
1. Starts a local Hardhat chain on `127.0.0.1:8545`.
2. Deploys Phase‑1 contracts and seeds allowlists.
3. Launches:
   - `services/ingest-moev` (writes `artifacts/ingest/status.json`).
   - `services/verify-api`, `services/atproto-mirror`, `services/firehose-view`.
   - `frontend` (Next.js) — visit http://localhost:3000 to see the combined Evidence→Policy dashboard.

When ingest runs, `/api/ingest-status` pulls the JSON so the “Automated Publish Pipeline” card stays live. You can also trigger `npm run ingest:once` via the UI button.

---

## IoT “Dripping Funding” Program

- **Weekly allocation:** 3.34 M NTD / 52 ≈ 64,230 NTD.
- **Rule encoded on-chain:**
  - If ≥ 98 % of 3‑minute intervals have ≥ 90 % sensor coverage → pay 100% of the weekly allocation.
  - If 90–98 % → pay the pro‑rata share.
  - If < 90 % → pay 0 for that week.
- The evaluator (`scripts/programs/metrics/evaluate-all.ts`) aggregates Phase‑1 proofs for the week, calculates coverage, constructs an `EvaluationProof`, and calls `ProgramModule_IoT.evaluate`. The module verifies the metrics and computes the payout deterministically.
- `scripts/programs/export-ledger.ts` pulls all `EligibilityIssued`/`PayoutExecuted` events, writes `frontend/policy-ledger/ledger.json`, and appends to `frontend/policy-ledger/ledger.log` for audit trails.

You can add more programs by dropping new Solidity modules under `contracts/programs/modules`, registering them through the FundRegistry, and pointing an evaluator script at the relevant data source. The frontend reads module metadata from `config/programs/modules.json`, so new modules automatically appear with an “Add module” CTA placeholder.

---

## Frontend (Single Flow View)

The default route (`app/page.tsx`) now contains:

1. **Layer 1 – Verifiable Evidence**  
   Publish form, ingest status, proof explorer, attestations, verify tool, and ATProto feed widget.

2. **Layer 2 – IoT Automation Card**  
   Shows the latest weekly metrics, payout tiers, and an “Add module” button that links to the contribution guide (so additional APCF programs can be added without redesigning the page).

3. **Public Ledger**  
   React component that renders `ledger.json` (ported from the previous static microsite) with timeline, funding caps, and summaries.

Citizens can click a payout entry → view `proofId` → re-open the Phase‑1 evidence, proving the data→decision link.

---

## Key npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:all` | Boot entire stack locally. |
| `npm run ingest:once` | One-off MOENV fetch → publish → status update. |
| `npm run programs:deploy:adapter` | Deploy Phase‑1 adapter (reads OpenDataRegistry proofs). |
| `npm run programs:deploy` | Deploy FundRegistry + program modules. |
| `npm run programs:evaluate` | Calculate weekly metrics + call module `evaluate`. |
| `npm run programs:export` | Export ledger + append pipeline logs. |
| `npm run programs:serve` | Serve the static ledger page (legacy). |

---

## Want to Add Another Program?

1. **Contract:** Copy `ProgramModule_Base`, implement `_isEligible` and (optionally) `_calculateAward`. Register the module + cap in `FundRegistry`.
2. **Evaluator:** Add a script in `scripts/programs` that reads verified data (Phase‑1 proofs or other evidence), computes metrics, and submits an `EvaluationProof`.
3. **Config + UI:** Append metadata to `config/programs/modules.json`. The dashboard will list it automatically with an “Activate module” button; hook up your evaluator/runbook.
4. **Ledger:** Ensure your module emits `EligibilityIssued`/`PayoutExecuted` so `export-ledger` picks it up automatically.

Everything stays in this single repo so policy teams and auditors only have to read one codebase to verify the entire story.

---

Need more detail? See `docs/phase2_aqi_fund_spec.md` for the full 10-part spec, diagrams, and AI-looping runbook. The old Phase‑1 issue files remain under `/issues` for historical reference.
