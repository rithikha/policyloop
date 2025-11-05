# Issue: Services — /verify API, ATProto Mirror, Firehose View

## Objective
Provide a server-side verification endpoint and ATProto integrations.

## Tasks
- [ ] `/verify` POST: { url|upload, expectedProofId } -> { verified, reasons[] }
- [ ] Rate-limit + structured logs
- [ ] `atproto-mirror`: subscribe to chain events, post signed summaries to PDS
- [ ] `firehose-view`: subscribe to PDS firehose, expose custom feed endpoint for frontend
- [ ] Env:
      ATPROTO_PDS_URL=
      ATPROTO_HANDLE=
      ATPROTO_DID=
      ATPROTO_SIGNING_KEY=
      CITYOS_NAMESPACE=cityos.dataset.v1

## Acceptance
- API verify returns correct results for known-good and tampered files
- Mirror posts upon publish/attest/revoke
- Firehose view serves a filtered feed of recent dataset events
