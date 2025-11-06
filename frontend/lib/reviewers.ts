export type ReviewerKind = "public-sector" | "ngo";

export interface ReviewerProfile {
  label: string;
  address: `0x${string}`;
  kind: ReviewerKind;
  defaultNote: string;
  defaultTimeliness: number;
  canAudit: boolean;
}

function envAddress(key: string, fallback: string): `0x${string}` {
  const value = process.env[key];
  if (value && value.startsWith("0x")) {
    return value as `0x${string}`;
  }
  return fallback as `0x${string}`;
}

export const reviewerProfiles: ReviewerProfile[] = [
  {
    label: "City Admin",
    address: envAddress("NEXT_PUBLIC_CITY_REVIEWER", "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"),
    kind: "public-sector",
    defaultNote: "City Admin review · data cross-checked",
    defaultTimeliness: 1,
    canAudit: true,
  },
  {
    label: "Env Dept",
    address: envAddress("NEXT_PUBLIC_ENV_REVIEWER", "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"),
    kind: "public-sector",
    defaultNote: "Environmental Department verification",
    defaultTimeliness: 1,
    canAudit: false,
  },
  {
    label: "Clean Air NGO",
    address: envAddress("NEXT_PUBLIC_NGO_REVIEWER", "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"),
    kind: "ngo",
    defaultNote: "NGO partner attested · community sampling aligned",
    defaultTimeliness: 2,
    canAudit: false,
  },
];
