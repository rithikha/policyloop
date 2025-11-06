"use client";

import { ProofStatus, TrustTier, trustTierLabel } from "../lib/trust";
import clsx from "clsx";

interface TrustBadgeProps {
  tier: TrustTier;
  status: ProofStatus;
}

function tierColor(tier: TrustTier) {
  switch (tier) {
    case TrustTier.Audited:
      return "badge-audited";
    case TrustTier.EligibleForPolicy:
      return "badge-eligible";
    case TrustTier.Attested:
      return "badge-attested";
    case TrustTier.Submitted:
      return "badge-submitted";
    case TrustTier.Revoked:
      return "badge-revoked";
    default:
      return "badge-neutral";
  }
}

function statusLabel(status: ProofStatus) {
  switch (status) {
    case ProofStatus.Submitted:
      return "Submitted";
    case ProofStatus.Attested:
      return "Attested";
    case ProofStatus.Revoked:
      return "Revoked";
    default:
      return "Unknown";
  }
}

export function TrustBadge({ tier, status }: TrustBadgeProps) {
  return (
    <div className={clsx("trust-badge", tierColor(tier))}>
      <span>{trustTierLabel(tier)}</span>
      <span className="status-chip">{statusLabel(status)}</span>
    </div>
  );
}
