# CODEX CONTEXT — One-File Summary for AI Dev Agent

Project: CityOS — Phase 1: Verifiable Datasets (MOENV Taipei). Build verifiable inputs (authorship, integrity, timeliness).

Key Files:
- README.md — architecture, diagrams, acceptance criteria, Decision Log.
- issues/*.md — concrete tasks (contracts, frontend, services, infra, governance).
- AGENT_PROMPT.md — your guardrails.

Minimal Interfaces (Solidity):
- publish(contentHash, metadataHash, uri, version, stationId, sig) returns proofId
- revoke(proofId, reason)
- getProof(proofId); getLatestProof(stationId)
- attest(proofId, note); isAttested(proofId) (k-of-n = 2-of-3)
- latestAttestedProof(stationId); trustScore(proofId); trustTier(proofId)

Events:
- DatasetPublished(proofId, publisher, stationId, ts)
- Attested(proofId, reviewer, note)
- Revoked(proofId, auditor, reason, ts)

Trust & Tiers:
- Score (0–100): +35/public-sector reviewer, +25/NGO, +15 OnTime, +5 SlightDelay, +0 Late, +20 Audited.
- Tiers: Submitted (<50), Attested (>=50 + k-of-n), EligibleForPolicy (>=70 + composition), Audited, Revoked.

ATProto:
- Mirror chain events to PDS.
- Firehose view filters to a custom feed for the frontend widget.

Acceptance (must pass):
- Publish → on-chain proof.
- 2-of-3 attestations → Attested.
- Revocation (Auditor) works with public reason.
- WASM verify + /verify API succeed.
- ATProto mirror + firehose view functional.
- latestAttestedProof("taipei-city") works.
- Trust scores & tiers displayed.
