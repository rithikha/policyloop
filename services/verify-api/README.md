# verify-api

Server-side endpoint that replays the CityOS dataset verification flow:

1. Fetch latest proof fields from `OpenDataRegistry`.
2. Recompute the uploaded dataset’s `contentHash`.
3. Recompute the submitted metadata hash (after deterministic key ordering).
4. Optionally check the publisher’s `eth_sign` signature against the registry digest.

## Setup

```bash
cd services/verify-api
cp .env.example .env
npm install
```

Fill `.env` with:

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default `4000`) |
| `RPC_URL` | HTTPS RPC endpoint for the target chain (e.g. Sepolia) |
| `CHAIN_ID` | Chain id that the proofs were published on |
| `OPEN_DATA_REGISTRY_ADDRESS` | Deployed OpenDataRegistry address |
| `MAX_UPLOAD_MB` | Guard rail for uploaded dataset size |

## Development

```bash
npm run dev
```

The server exposes:

- `GET /healthz` — readiness probe
- `POST /verify` — accepts either `multipart/form-data` with a `dataset` file field or JSON with `datasetUrl`

Example `curl` (multipart):

```bash
curl -X POST http://localhost:4000/verify \
  -F proofId=0x1234... \
  -F signature=0xabc... \
  -F metadata='{"stationId":"taipei-city","capturedAt":1700000000,"format":"csv","schemaUri":"ipfs://schema/moenv","license":"CC-BY-4.0","payload":{}}' \
  -F dataset=@hourly.csv
```

Example JSON (server downloads the dataset before hashing):

```bash
curl -X POST http://localhost:4000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "proofId": "0x1234...",
    "datasetUrl": "https://example.com/hourly.csv",
    "metadata": {
      "stationId": "taipei-city",
      "capturedAt": 1700000000,
      "format": "csv",
      "schemaUri": "ipfs://schema/moenv",
      "license": "CC-BY-4.0",
      "payload": {}
    }
  }'
```

Response payload:

```json
{
  "proofId": "0x...",
  "verified": true,
  "checks": {
    "content": true,
    "metadata": true,
    "signature": true
  },
  "onChain": {
    "contentHash": "0x...",
    "metadataHash": "0x...",
    "publisher": "0x...",
    "uri": "ipfs://...",
    "version": "1.0.0",
    "stationId": "taipei-city"
  },
  "computed": {
    "contentHash": "0x...",
    "metadataHash": "0x...",
    "signer": "0x..."
  },
  "reasons": []
}
```

If any check fails, `verified=false` and `reasons` enumerates the mismatches (e.g. `["content hash mismatch"]`).
