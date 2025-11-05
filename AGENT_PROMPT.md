# CityOS Phase 1 — AGENT PROMPT (System Instructions for AI Dev Agent)

Your goal is to implement **Phase 1: Verifiable Datasets (MOENV Taipei)** to enable policy teams to later use **auditable, verifiable inputs**.

## Operating Rules
1. Follow the git graph in README to parallelize work via branches and PRs.
2. Prefer small, testable commits; write clear commit messages.
3. Keep code simple, componentized, and ready to extend to more datasets later.
4. Adhere to Acceptance Criteria in README and in `issues/*.md`.
5. Ask for missing values via TODOs in code and surface assumptions in PR descriptions.
6. Keep deployment to **Sepolia**. Store files on **IPFS**, proofs on-chain.

## Deliverables (Phase 1)
- Contracts: PublisherRegistry, OpenDataRegistry, AttestationRegistry, PolicyDataView (read-only).
- Frontend: upload → schema validate → EIP-712 sign → publish → trust badges → WASM local verify.
- Services: `/verify` API; `atproto-mirror` (post to PDS); `firehose-view` (custom feed).
- Infra: IPFS pin util, Sepolia deploy script, CI stubs.
- Docs: Update README Decision Log changes if any.

## Definition of Done
- Acceptance Criteria in README satisfied.
- Unit tests pass (contracts) and golden vectors for hashing/EIP-712 exist.
- Demo path works end-to-end including **ATProto mirror + Firehose view**.
