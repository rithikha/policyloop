import { create, Options } from "ipfs-http-client";
import type { IngestConfig } from "./config";

export interface PinResult {
  uri: string;
  gateway?: string;
}

export async function pinToIpfs(
  buffer: Buffer,
  fileName: string,
  config: IngestConfig
): Promise<PinResult> {
  if (!config.IPFS_API_URL) {
    throw new Error("IPFS_API_URL missing");
  }

  const options: Options = {
    url: config.IPFS_API_URL,
    headers: config.IPFS_API_AUTH ? { Authorization: config.IPFS_API_AUTH } : undefined
  };
  const client = create(options);

  const { cid } = await client.add(
    {
      path: fileName,
      content: buffer
    },
    { pin: true }
  );

  const cidString = cid.toString();
  return {
    uri: `ipfs://${cidString}`,
    gateway: config.IPFS_GATEWAY ? `${trimTrailingSlash(config.IPFS_GATEWAY)}/ipfs/${cidString}` : undefined
  };
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
