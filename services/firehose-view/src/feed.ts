import { BskyAgent } from "@atproto/api";
import type { ViewConfig } from "./config";

export interface FeedItem {
  id: string;
  proofId?: string;
  stationId?: string;
  kind: "publish" | "attest" | "revoke" | "other";
  summary: string;
  timestamp: number;
  actor: string;
}

export class FeedCache {
  private items: FeedItem[] = [];

  constructor(
    private readonly config: ViewConfig,
    private readonly agent = new BskyAgent({ service: config.ATPROTO_PDS_URL })
  ) {}

  async init() {
    await this.agent.login({
      identifier: this.config.ATPROTO_HANDLE,
      password: this.config.ATPROTO_APP_PASSWORD
    });
    await this.refresh(true);
  }

  async refresh(initial = false) {
    const response = await this.agent.app.bsky.feed.getAuthorFeed(
      {
        actor: this.config.ATPROTO_HANDLE,
        limit: this.config.FEED_LIMIT
      },
      { headers: { "User-Agent": "cityos-firehose-view/0.1.0" } }
    );

    const now = Date.now();
    const parsed = response.data.feed
      .map((item) => {
        const post = item.post;
        const record = post.record as { text?: string; createdAt?: string };
        const text = record.text ?? "";
        if (!text.startsWith(`[${this.config.CITYOS_NAMESPACE}]`)) {
          return undefined;
        }
        const parts = text.split(" · ");
        const header = parts[0].replace(`[${this.config.CITYOS_NAMESPACE}] `, "");
        const proofMatch = text.match(/proof ([0x[a-fA-F0-9]+]+)/);

        const kind = header.toLowerCase().includes("revocation")
          ? "revoke"
          : header.toLowerCase().includes("attestation")
          ? "attest"
          : header.toLowerCase().includes("dataset")
          ? "publish"
          : "other";

        const stationMatch = text.match(/for ([\w-]+) ·/);

        return {
          id: post.uri,
          proofId: proofMatch ? proofMatch[1] : undefined,
          stationId: stationMatch ? stationMatch[1] : undefined,
          kind,
          summary: text,
          timestamp: record.createdAt ? Date.parse(record.createdAt) : now,
          actor: post.author?.handle ?? this.config.ATPROTO_HANDLE
        } as FeedItem;
      })
      .filter((item): item is FeedItem => Boolean(item));

    this.items = parsed.slice(0, this.config.FEED_LIMIT);

    if (initial) {
      console.log(`[firehose-view] cached ${this.items.length} items from ATProto`);
    }
  }

  list() {
    return this.items;
  }
}
