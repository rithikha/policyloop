import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";

const DATASET_TYPEHASH = keccak256(
  toUtf8Bytes(
    "Dataset(bytes32 contentHash,bytes32 metadataHash,string uri,string version,string stationId,address publisher,address registry)"
  )
);

const abi = AbiCoder.defaultAbiCoder();

export function computeDatasetDigest(params: {
  contentHash: `0x${string}`;
  metadataHash: `0x${string}`;
  uri: string;
  version: string;
  stationId: string;
  publisher: `0x${string}`;
  registry: `0x${string}`;
}): `0x${string}` {
  return keccak256(
    abi.encode(
      ["bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "address", "address"],
      [
        DATASET_TYPEHASH,
        params.contentHash,
        params.metadataHash,
        keccak256(toUtf8Bytes(params.uri)),
        keccak256(toUtf8Bytes(params.version)),
        keccak256(toUtf8Bytes(params.stationId)),
        params.publisher,
        params.registry
      ]
    )
  ) as `0x${string}`;
}

export function computeMetadataHash(metadata: Record<string, unknown>): `0x${string}` {
  const normalized = normalize(metadata);
  const json = JSON.stringify(normalized);
  return keccak256(toUtf8Bytes(json)) as `0x${string}`;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function normalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item as JsonValue)) as JsonValue;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, JsonValue>).sort(([a], [b]) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    const normalized: Record<string, JsonValue> = {};
    for (const [key, val] of entries) {
      normalized[key] = normalize(val as JsonValue);
    }
    return normalized;
  }

  return value;
}
