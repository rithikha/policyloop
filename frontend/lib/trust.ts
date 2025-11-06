export enum ProofStatus {
  None = 0,
  Submitted = 1,
  Attested = 2,
  Revoked = 3,
}

export enum Timeliness {
  Unknown = 0,
  OnTime = 1,
  SlightDelay = 2,
  Late = 3,
}

export enum TrustTier {
  None = 0,
  Submitted = 1,
  Attested = 2,
  EligibleForPolicy = 3,
  Audited = 4,
  Revoked = 5,
}

export interface AttestationSummary {
  total: number;
  publicCount: number;
  ngoCount: number;
  audited: boolean;
  timeliness: Timeliness;
}

export function computeTrustScore(summary: AttestationSummary): number {
  let score = 0;
  score += summary.publicCount * 35;
  score += summary.ngoCount * 25;

  if (summary.timeliness === Timeliness.OnTime) {
    score += 15;
  } else if (summary.timeliness === Timeliness.SlightDelay) {
    score += 5;
  }

  if (summary.audited) {
    score += 20;
  }

  return Math.min(score, 100);
}

export function computeTrustTier(status: ProofStatus, summary: AttestationSummary): TrustTier {
  if (status === ProofStatus.None) {
    return TrustTier.None;
  }
  if (status === ProofStatus.Revoked) {
    return TrustTier.Revoked;
  }
  if (status === ProofStatus.Submitted) {
    return TrustTier.Submitted;
  }
  if (summary.audited) {
    return TrustTier.Audited;
  }

  const score = computeTrustScore(summary);
  if (score >= 70 && summary.publicCount >= 1 && summary.ngoCount >= 1) {
    return TrustTier.EligibleForPolicy;
  }

  return TrustTier.Attested;
}

export function trustTierLabel(tier: TrustTier): string {
  switch (tier) {
    case TrustTier.Submitted:
      return "Submitted";
    case TrustTier.Attested:
      return "Attested";
    case TrustTier.EligibleForPolicy:
      return "Eligible For Policy";
    case TrustTier.Audited:
      return "Audited";
    case TrustTier.Revoked:
      return "Revoked";
    default:
      return "Unknown";
  }
}

export function timelinessLabel(timeliness: Timeliness): string {
  switch (timeliness) {
    case Timeliness.OnTime:
      return "On Time (≤10m)";
    case Timeliness.SlightDelay:
      return "Slight Delay (≤30m)";
    case Timeliness.Late:
      return "Late (>30m)";
    default:
      return "Unknown";
  }
}
