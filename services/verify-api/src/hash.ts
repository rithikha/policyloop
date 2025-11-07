import { keccak256, toUtf8Bytes } from "ethers";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

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

export function computeMetadataHash(metadata: Record<string, unknown>): `0x${string}` {
  const normalized = normalize(metadata as JsonValue);
  const payload = JSON.stringify(normalized);
  return keccak256(toUtf8Bytes(payload)) as `0x${string}`;
}
