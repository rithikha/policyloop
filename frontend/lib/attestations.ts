import { AttestationSummary, Timeliness } from "./trust";

export interface AttestationDetail {
  reviewer: `0x${string}`;
  attestedAt: number;
  note: string;
  timeliness: Timeliness;
  marksAudited: boolean;
}

const ZERO_ADDRESS = ("0x" + "0".repeat(40)) as `0x${string}`;

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : fallback;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "string") return value.length > 0 && value !== "0" && value.toLowerCase() !== "false";
  return false;
}

export function normalizeSummary(raw: unknown): AttestationSummary {
  if (!raw) {
    return {
      total: 0,
      publicCount: 0,
      ngoCount: 0,
      audited: false,
      timeliness: Timeliness.Unknown,
    };
  }

  const tuple = Array.isArray(raw)
    ? raw
    : [
        (raw as { total?: unknown }).total,
        (raw as { publicCount?: unknown }).publicCount,
        (raw as { ngoCount?: unknown }).ngoCount,
        (raw as { audited?: unknown }).audited,
        (raw as { timeliness?: unknown }).timeliness,
      ];

  return {
    total: toNumber(tuple[0]),
    publicCount: toNumber(tuple[1]),
    ngoCount: toNumber(tuple[2]),
    audited: toBoolean(tuple[3]),
    timeliness: toNumber(tuple[4], Timeliness.Unknown) as Timeliness,
  };
}

export function normalizeAttestations(raw: unknown): AttestationDetail[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : [raw];

  return items.map((item) => {
    const tuple = Array.isArray(item)
      ? item
      : [
          (item as { reviewer?: unknown }).reviewer,
          (item as { attestedAt?: unknown }).attestedAt,
          (item as { note?: unknown }).note,
          (item as { timeliness?: unknown }).timeliness,
          (item as { marksAudited?: unknown }).marksAudited,
        ];

    const reviewer = (tuple[0] as `0x${string}`) ?? ZERO_ADDRESS;
    const attestedAt = toNumber(tuple[1]);
    const rawNote = tuple[2];
    const note =
      typeof rawNote === "string"
        ? rawNote
        : rawNote == null
        ? ""
        : String(rawNote);
    const timeliness = toNumber(tuple[3], Timeliness.Unknown) as Timeliness;
    const marksAudited = toBoolean(tuple[4]);

    return {
      reviewer,
      attestedAt,
      note,
      timeliness,
      marksAudited,
    };
  });
}
