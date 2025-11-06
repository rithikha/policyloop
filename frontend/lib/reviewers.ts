export type ReviewerKind = "public-sector" | "ngo" | "citizen";

export interface ReviewerProfile {
  label: string;
  address: `0x${string}`;
  badgeLabel: string;
  badgeClass: "public" | "ngo" | "citizen";
  kind: ReviewerKind;
  defaultNote: string;
  defaultTimeliness: number;
  canAudit: boolean;
}

function envAddress(rawValue: string | undefined, fallback: string, key: string): `0x${string}` {
  const value = rawValue?.trim();
  if (value && value.startsWith("0x")) {
    return value as `0x${string}`;
  }
  if (typeof window !== "undefined" && rawValue) {
    console.warn(`Environment variable ${key} is not a valid hex address: ${rawValue}`);
  }
  return fallback as `0x${string}`;
}

export const reviewerProfiles: ReviewerProfile[] = [
  {
    label: "DEP Taipei City",
    address: envAddress(
      process.env.NEXT_PUBLIC_CITY_REVIEWER,
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      "NEXT_PUBLIC_CITY_REVIEWER"
    ),
    badgeLabel: "Public Sector",
    badgeClass: "public",
    kind: "public-sector",
    defaultNote: "DEP Taipei City verified dataset integrity and timeliness.",
    defaultTimeliness: 1,
    canAudit: true,
  },
  {
    label: "Green Citizen Alliance",
    address: envAddress(
      process.env.NEXT_PUBLIC_ENV_REVIEWER,
      "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      "NEXT_PUBLIC_ENV_REVIEWER"
    ),
    badgeLabel: "NGO",
    badgeClass: "ngo",
    kind: "ngo",
    defaultNote: "Green Citizen Alliance cross-checks readings with independent monitors.",
    defaultTimeliness: 2,
    canAudit: false,
  },
  {
    label: "Citizen",
    address: envAddress(
      process.env.NEXT_PUBLIC_NGO_REVIEWER,
      "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
      "NEXT_PUBLIC_NGO_REVIEWER"
    ),
    badgeLabel: "Citizen",
    badgeClass: "citizen",
    kind: "citizen",
    defaultNote: "Citizen spot-check attestation backed by community air sensors.",
    defaultTimeliness: 2,
    canAudit: false,
  },
];
