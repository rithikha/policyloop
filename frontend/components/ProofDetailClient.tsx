"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useProof } from "../hooks/useProof";
import { ProofStatus, timelinessLabel, computeTrustTier, computeTrustScore } from "../lib/trust";
import { reviewerProfiles } from "../lib/reviewers";
import { useLatestProof } from "../hooks/useLatestProof";
import { TrustBadge } from "./TrustBadge";

interface ProofDetailClientProps {
  proofId: `0x${string}`;
}

function statusLabel(status: number) {
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

export function ProofDetailClient({ proofId }: ProofDetailClientProps) {
  const { data, error, isLoading } = useProof(proofId);
  const latest = useLatestProof();

  if (isLoading) {
    return (
      <section className="card">
        <p>Loading proof {proofId}...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card">
        <p className="error">Failed to load proof: {error instanceof Error ? error.message : String(error)}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="card">
        <p>No proof data found for {proofId}.</p>
      </section>
    );
  }

  const trustTier = computeTrustTier(data.status as ProofStatus, data.summary);
  const trustScore = computeTrustScore(data.summary);
  const isLatest = latest.data?.proofId === proofId;

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Proof Detail</h2>
          <p className="proof-meta">
            Proof ID: <span className="mono">{data.proofId}</span>
          </p>
        </div>
        <TrustBadge tier={trustTier} status={data.status as ProofStatus} />
      </header>
      <dl className="proof-details">
        <div>
          <dt>Station</dt>
          <dd>{data.stationId}</dd>
        </div>
        <div>
          <dt>Publisher</dt>
          <dd className="mono">{data.publisher}</dd>
        </div>
        <div>
          <dt>Published At</dt>
          <dd>{format(new Date(data.publishedAt * 1000), "yyyy-MM-dd HH:mm:ssXXX")}</dd>
        </div>
        <div>
          <dt>URI</dt>
          <dd>
            <a href={data.uri} target="_blank" rel="noreferrer">
              {data.uri}
            </a>
          </dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{data.version}</dd>
        </div>
        <div>
          <dt>contentHash</dt>
          <dd className="mono">{data.contentHash}</dd>
        </div>
        <div>
          <dt>metadataHash</dt>
          <dd className="mono">{data.metadataHash}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{statusLabel(data.status)}</dd>
        </div>
        <div>
          <dt>Trust Score</dt>
          <dd>{trustScore}</dd>
        </div>
        <div>
          <dt>Timeliness</dt>
          <dd>{timelinessLabel(data.summary.timeliness)}</dd>
        </div>
        <div>
          <dt>Audited</dt>
          <dd>{data.summary.audited ? "Yes" : "No"}</dd>
        </div>
      </dl>
      <div className="attestation-table">
        <h3>Attestations ({data.summary.total})</h3>
        {data.attestations.length === 0 ? (
          <p>No attestations recorded.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reviewer</th>
                <th>Address</th>
                <th>Attested At</th>
                <th>Timeliness</th>
                <th>Audited</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {data.attestations.map((attestation) => {
                const profile = reviewerProfiles.find((item) => item.address.toLowerCase() === attestation.reviewer.toLowerCase());
                return (
                  <tr key={`${attestation.reviewer}-${attestation.attestedAt}`}>
                    <td>{profile?.label ?? "Reviewer"}</td>
                    <td className="mono">{attestation.reviewer}</td>
                    <td>{format(new Date(attestation.attestedAt * 1000), "yyyy-MM-dd HH:mm:ss")}</td>
                    <td>{timelinessLabel(attestation.timeliness)}</td>
                    <td>{attestation.marksAudited ? "Yes" : "No"}</td>
                    <td>{attestation.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {data.revocation ? (
        <div className="revocation-block">
          <h3>Revocation</h3>
          <p>
            Revoked by <span className="mono">{data.revocation.auditor}</span> on {format(new Date(data.revocation.revokedAt * 1000), "yyyy-MM-dd HH:mm:ssXXX")} with
            reason: {data.revocation.reason}
          </p>
        </div>
      ) : null}
      <footer className="detail-footer">
        {isLatest ? <span className="pill public">Latest proof</span> : null}
        <Link href="/" className="link-button">
          Back to dashboard
        </Link>
      </footer>
    </section>
  );
}
