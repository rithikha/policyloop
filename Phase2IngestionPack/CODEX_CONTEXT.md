PHASE: 2 — Decision Integrity (Taipei APCF)
REPO: policyloop (contains Phase‑1 verifiable data substrate)

DELIVERABLES
- Contracts: FundRegistry + ProgramModules (IoT, Vehicle, Fixed, Construction)
- Phase‑1 adapters: IOpenDataRegistry, PolicyDataViewAdapter
- Scripts: deploy‑adapter, deploy‑phase2, metrics/{resolve,parse,evaluate-all}, export‑ledger, phase1‑detect
- Config: policy-config.taipei.yaml, aqi_demo.json, phase1.addresses.json (autodetected)
- Frontend: /frontend/policy-ledger/index.html (renders ledger.json)
- Docs: /docs/phase2_aqi_fund_spec.md (paste latest spec)
- Issues: 00–05 (Objective / Tasks / Acceptance), matching Phase‑1 pattern

SUCCESS CRITERIA
- Hardhat compile OK
- ≥4 EligibilityIssued + ≥2 PayoutExecuted (auto-pay ≤ 300k)
- ledger.json exists and renders
- Uses Phase‑1 addresses (detected from repo or provided)
