# Issue: Services — /verify API, ATProto Mirror, Firehose View

## Objective
Provide a server-side verification endpoint, automated MOENV ingestion/publish, and ATProto integrations.

## Tasks
- [ ] `ingest-moev`: cron/service to fetch MOENV Taipei dataset, validate schema, hash, sign with publisher key, publish proof
- [ ] Pin dataset files to IPFS and persist URIs
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
- Automated ingest publishes new proofs within 5 minutes of MOENV updates (happy path)
- API verify returns correct results for known-good and tampered files
- Mirror posts upon publish/attest/revoke
- Firehose view serves a filtered feed of recent dataset events
