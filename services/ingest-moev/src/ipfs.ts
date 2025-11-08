import { FormData, File, fetch } from "undici";
import type { IngestConfig } from "./config";

export interface PinResult {
  uri: string;
  gateway?: string;
}

export async function pinToIpfs(buffer: Buffer, fileName: string, config: IngestConfig): Promise<PinResult> {
  if (!config.IPFS_API_URL) {
    throw new Error("IPFS_API_URL missing");
  }

  const form = new FormData();
  form.append("file", new File([buffer], fileName));

  const response = await fetch(config.IPFS_API_URL, {
    method: "POST",
    headers: config.IPFS_API_AUTH ? { Authorization: config.IPFS_API_AUTH } : undefined,
    body: form
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IPFS pin failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { IpfsHash?: string; Hash?: string; cid?: string };
  const cid = json.IpfsHash ?? json.Hash ?? json.cid;
  if (!cid) {
    throw new Error("IPFS response missing CID");
  }

  return {
    uri: `ipfs://${cid}`,
    gateway: config.IPFS_GATEWAY ? `${trimTrailingSlash(config.IPFS_GATEWAY)}/${cid}` : undefined
  };
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
