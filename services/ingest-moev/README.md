## ingest-moev

Automates the Phase 1 “sign & publish” flow for Taipei MOENV hourly datasets:

1. Fetch the latest dataset (local file or HTTP URL).
2. Validate metadata against `frontend/public/schema/moenv-taipei.json`.
3. Compute `contentHash` + `metadataHash`, persist the dataset, and assemble metadata.
4. Sign the registry digest with the publisher key and call `OpenDataRegistry.publish`.

### Setup

```bash
cd services/ingest-moev
cp .env.example .env
npm install
```

Edit `.env`:

| Variable | Description |
| --- | --- |
| `RPC_URL`, `CHAIN_ID` | RPC endpoint + chain ID (Hardhat localhost or Sepolia) |
| `OPEN_DATA_REGISTRY_ADDRESS` | Deployed registry address |
| `PUBLISHER_KEY` | Private key for the allowlisted publisher (hex) |
| `DATASET_URL` or `DATASET_FILE` | Source of the MOENV payload (HTTP or local path) |
| `STATION_ID`, `DATASET_VERSION`, `DATASET_FORMAT` | Metadata defaults (format = `json` or `csv`) |
| `SCHEMA_URI`, `SCHEMA_PATH`, `LICENSE`, `PUBLISHER_DID` | Values stored alongside the proof |
| `CAPTURED_AT` | Optional epoch seconds override (defaults to dataset payload or `Date.now()`) |
| `DATASET_URI` | Skip pinning and force a predefined URI |
| `PIN_WRITE_DIR` | Local folder used to mimic pinning when `DATASET_URI` is absent |

### Run once

```bash
npm run dev
```

The script prints the tx hash, proof ID, and hashes once the transaction confirms. If `DATASET_URI` is unset, the dataset file is copied into `artifacts/pins/<contentHash>.json` (or `.csv`) and the on-chain URI becomes `ipfs://local/<contentHash>`.

### Notes

- The worker expects JSON payloads by default (it serializes the entire body under `metadata.payload`). For CSV data, set `DATASET_FORMAT=csv`; the payload becomes `{ "csv": "<raw file contents>" }`.
- Any schema validation errors will abort the run and log the offending fields so we don’t push malformed metadata on-chain.
- Future improvements: swap the local pinning stub for a real IPFS pin API and schedule runs (cron/queue) so we ingest hourly updates automatically.
