# Issue: Frontend — Upload, Sign, Publish, Badges, WASM Verify

## Objective
Next.js UI to publish and verify MOENV Taipei datasets with trust badges and local verification.

## Tasks
- [ ] Scaffold Next.js app, wallet connect
- [ ] Upload screen (Taipei station only)
- [ ] JSON Schema validation (public/schema/moenv-taipei.json)
- [ ] EIP-712 signature request (DatasetMeta)
- [ ] Compute `contentHash` (chunked hashing) + `metadataHash`
- [ ] Call `publish` -> show Submitted badge + tx link
- [ ] Reviewer attestation UI (simulate 3 reviewers)
- [ ] Trust score/tier component (Submitted/Attested/Eligible/Audited/Revoked)
- [ ] WASM local verify tool (file picker -> hash+compare -> signature check)
- [ ] Proof detail page: hashes, timestamps, stationId, status history, attestations, revocations
- [ ] ATProto feed widget pulls from services/firehose-view endpoint
- [ ] Confirm JSON Schema path: /public/schema/moenv-taipei.json

## Acceptance
- Publish works end-to-end; trust badges and detail page render.
- WASM verify succeeds on demo file.
- Attestation flips to Attested (2-of-3).
