import { BskyAgent } from "@atproto/api";
import type { MirrorConfig } from "./config";

export interface MirrorPayload {
  kind: "publish" | "attest" | "revoke" | "payout";
  proofId: string;
  stationId?: string;
  note?: string;
  actor?: string;
  programId?: number;
  amount?: string;
  timestamp: number;
}

export class AtprotoPoster {
  constructor(private readonly config: MirrorConfig, private readonly agent = new BskyAgent({ service: config.ATPROTO_PDS_URL })) {}

  async init() {
    await this.agent.login({
      identifier: this.config.ATPROTO_HANDLE,
      password: this.config.ATPROTO_APP_PASSWORD
    });
  }

  async publish(payload: MirrorPayload) {
    const text = this.formatText(payload);
    const record = {
      $type: "app.bsky.feed.post",
      text,
      createdAt: new Date(payload.timestamp * 1000).toISOString(),
      langs: ["en"],
      facets: [],
      embed: undefined
    };
    await this.agent.post(record);
  }

  private formatText(payload: MirrorPayload): string {
    const ns = this.config.CITYOS_NAMESPACE;
    switch (payload.kind) {
      case "publish":
        return `[${ns}] Dataset published for ${payload.stationId ?? "unknown station"} · proof ${payload.proofId}`;
      case "attest":
        return `[${ns}] Attestation posted for proof ${payload.proofId} by ${payload.actor ?? "reviewer"} · note: ${payload.note ?? "n/a"}`;
      case "revoke":
        return `[${ns}] Revocation for proof ${payload.proofId} by ${payload.actor ?? "auditor"} · reason: ${payload.note ?? "n/a"}`;
      case "payout": {
        const amount = payload.amount ? Number(payload.amount).toLocaleString() : "0";
        return `[${ns}] Payout executed (program ${payload.programId ?? "?"}) · ${amount} NTD · recipient ${payload.actor ?? "wallet"} · proof ${payload.proofId}`;
      }
      default:
        return `[${ns}] Event for proof ${payload.proofId}`;
    }
  }
}
