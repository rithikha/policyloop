## firehose-view

Minimal HTTP service that exposes the latest ATProto mirror posts as a JSON feed so the frontend’s “ATProto Feed Mirror” widget can render live activity.

### How it works

1. Logs into the same ATProto handle used by the mirror (or a read-only app password).
2. Polls `app.bsky.feed.getAuthorFeed` every `POLL_INTERVAL_MS`.
3. Filters posts whose text starts with `[CITYOS_NAMESPACE]` and extracts proof/station metadata.
4. Caches the most recent `FEED_LIMIT` entries and serves them via `GET /feed`.

### Setup

```bash
cd services/firehose-view
cp .env.example .env
npm install
```

Fill `.env`:

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port for the feed (`4100` default) |
| `ATPROTO_PDS_URL` | Same PDS base URL you post to (`https://bsky.social`…) |
| `ATPROTO_HANDLE` | Handle whose feed to mirror (e.g., `cityos-taipei.bsky.social`) |
| `ATPROTO_APP_PASSWORD` | App password for that handle (read-only is fine) |
| `CITYOS_NAMESPACE` | Namespace prefix used in mirror posts |
| `POLL_INTERVAL_MS` | How often to refresh (default 20s) |
| `FEED_LIMIT` | Number of entries to retain/serve |

### Run locally

```bash
npm run dev
```

Then hit:

- `GET http://localhost:4100/healthz` → `{ "ok": true }`
- `GET http://localhost:4100/feed` → array of `{ id, proofId, stationId, kind, summary, timestamp, actor }`

Point `NEXT_PUBLIC_FIREHOSE_VIEW_URL` in the frontend to this `/feed` endpoint and the widget will start rendering posts instead of the “configure env” message.

### Notes / future work

- This is a poller, not a true ATProto firehose consumer. For production, swap polling for `com.atproto.sync.subscribeRepos` streaming and consider persistence (Redis) instead of an in-memory cache.
- The cache lives in process memory; run behind a supervisor or container and use health checks to restart if needed.
