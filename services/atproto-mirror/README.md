## atproto-mirror

Bridges on-chain dataset events into the ATProto network so downstream feeds (PDS + firehose) can show publish/attest/revoke activity.

### What it does

1. Subscribes to `DatasetPublished` events on `OpenDataRegistry` and `Attested`/`AttestationRevoked` events on `AttestationRegistry`.
2. Generates short text summaries with a `CITYOS_NAMESPACE` prefix.
3. Uses an ATProto service account (handle + app password) to post `app.bsky.feed.post` records to your PDS.

### Setup

```bash
cd services/atproto-mirror
cp .env.example .env
npm install
```

Fill `.env`:

| Variable | Description |
| --- | --- |
| `RPC_URL`, `CHAIN_ID` | RPC endpoint & chain targeted by the mirror |
| `OPEN_DATA_REGISTRY_ADDRESS`, `ATTESTATION_REGISTRY_ADDRESS` | Contract addresses on that chain |
| `ATPROTO_PDS_URL` | Base URL of the PDS (e.g., `https://bsky.social` or your self-hosted service) |
| `ATPROTO_HANDLE` | Service account handle (e.g., `cityos.test`) |
| `ATPROTO_APP_PASSWORD` | App password for that handle |
| `CITYOS_NAMESPACE` | Prefix used in mirror text (e.g., `cityos.dataset.v1`) |
| `STATION_ALLOWLIST` | Optional comma-delimited list of station IDs to mirror |

### Run locally

```bash
npm run dev
```

You should see:

```
[mirror] watching on-chain events…
[mirror] posted publish for 0xabc...
```

Whenever `OpenDataRegistry.publish` fires, the service posts a new ATProto record; reviewer attestations and revocations behave similarly. Errors from the PDS are logged but don’t crash the process so the watcher can keep listening.

### Production considerations

- Run under a supervisor (PM2/systemd) or as a container so it restarts on failure.
- Use a dedicated ATProto account/app password; rate limit via station allowlist if needed.
- Once the firehose view service is live, it can consume these mirrored posts and expose them via the frontend feed widget.
