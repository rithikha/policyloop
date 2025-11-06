import { keccak256, toUtf8Bytes } from "ethers";
export async function keccakFileChunked(file: File, chunkSize = 1024 * 1024): Promise<`0x${string}`> {
  if (typeof window === "undefined") {
    throw new Error("keccakFileChunked must run in the browser");
  }

  const { createKeccak } = await import("hash-wasm");
  const hasher = await createKeccak();
  hasher.init();

  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const buffer = await slice.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    offset += chunkSize;
  }

  const digest = hasher.digest("hex");
  return `0x${digest}` as `0x${string}`;
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export function computeMetadataHash(metadata: Record<string, unknown>): `0x${string}` {
  const normalized = normalize(metadata);
  const json = JSON.stringify(normalized);
  return keccak256(toUtf8Bytes(json)) as `0x${string}`;
}
