"use client";

import useSWR from "swr";
import { formatDistanceToNowStrict } from "date-fns";

interface FeedItem {
  id: string;
  proofId: string;
  stationId: string;
  type: "publish" | "attest" | "revoke" | string;
  timestamp: number;
  summary?: string;
  actor?: string;
}

const FEED_ENDPOINT = process.env.NEXT_PUBLIC_FIREHOSE_VIEW_URL;

async function fetchFeed(): Promise<FeedItem[]> {
  if (!FEED_ENDPOINT) {
    return [];
  }

  const response = await fetch(FEED_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status})`);
  }
  return response.json();
}

export function FeedWidget() {
  const { data, error, isLoading } = useSWR(FEED_ENDPOINT ? ["atproto-feed", FEED_ENDPOINT] : null, fetchFeed, {
    refreshInterval: 45_000,
  });

  return (
    <section className="card">
      <header className="card-header">
        <h2>5. ATProto Feed Mirror</h2>
      </header>
      {!FEED_ENDPOINT ? (
        <p>
          Configure <code>NEXT_PUBLIC_FIREHOSE_VIEW_URL</code> to surface mirrored publish/attest/revoke events from the
          firehose-view service.
        </p>
      ) : isLoading ? (
        <p>Loading feed…</p>
      ) : error ? (
        <p className="error">Feed unavailable: {error instanceof Error ? error.message : String(error)}</p>
      ) : data && data.length > 0 ? (
        <ul className="feed-list">
          {data.map((item) => {
            const typeLabel = (item.type ?? "event").toUpperCase();
            const station = item.stationId ?? "unknown station";
            const timestamp =
              item.timestamp > 1_000_000_000_000
                ? new Date(item.timestamp)
                : new Date(item.timestamp * 1000);
            return (
              <li key={item.id}>
                <div className={`feed-pill feed-${item.type ?? "event"}`}>{typeLabel}</div>
              <div className="feed-body">
                <p className="feed-summary">{item.summary ?? `${typeLabel} · proof ${item.proofId ?? "unknown"}`}</p>
                <p className="feed-meta">
                  Station {station} · {item.actor ?? "unknown actor"} · {formatDistanceToNowStrict(timestamp, { addSuffix: true })}
                </p>
              </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No mirrored events found yet.</p>
      )}
    </section>
  );
}
