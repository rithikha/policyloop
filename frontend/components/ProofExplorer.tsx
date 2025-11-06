"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { timelinessLabel } from "../lib/trust";
import { TrustBadge } from "./TrustBadge";
import { useLatestProof } from "../hooks/useLatestProof";

export function ProofExplorer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const { data, error, isLoading } = useLatestProof();

  if (!mounted) {
    return (
      <section className="card">
        <header className="card-header">
          <h2>2. Latest Proof · taipei-city</h2>
        </header>
        <p>Loading latest proof...</p>
      </section>
    );
  }

  let body: JSX.Element;

  if (isLoading) {
    body = <p>Loading latest proof...</p>;
  } else if (error) {
    body = <p className="error">Failed to load proof: {error instanceof Error ? error.message : String(error)}</p>;
  } else if (!data) {
    body = <p>No proofs published for taipei-city yet.</p>;
  } else {
    const publishedAgo = formatDistanceToNowStrict(new Date(data.publishedAt * 1000), { addSuffix: true });
    body = (
      <div className="proof-summary">
        <div className="proof-header">
          <div>
            <p className="proof-station">Station: {data.stationId}</p>
            <p className="proof-meta">
              Published {publishedAgo} by <span className="mono">{data.publisher}</span>
            </p>
          </div>
          <TrustBadge tier={data.trustTier} status={data.status} />
        </div>
        <dl className="proof-details">
          <div>
            <dt>contentHash</dt>
            <dd className="mono">{data.contentHash}</dd>
          </div>
          <div>
            <dt>metadataHash</dt>
            <dd className="mono">{data.metadataHash}</dd>
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
            <dt>Trust Score</dt>
            <dd>{data.trustScore}</dd>
          </div>
          <div>
            <dt>Timeliness</dt>
            <dd>{timelinessLabel(data.summary.timeliness)}</dd>
          </div>
          <div>
            <dt>Attestations</dt>
            <dd>
              {data.summary.total} (Public: {data.summary.publicCount} · NGO: {data.summary.ngoCount})
            </dd>
          </div>
          {data.revocation ? (
            <div>
              <dt>Revocation</dt>
              <dd>
                Revoked by <span className="mono">{data.revocation.auditor}</span> · reason: {data.revocation.reason}
              </dd>
            </div>
          ) : null}
        </dl>
        <footer>
          <Link href={data.proofId ? `/proof/${data.proofId}` : "#"} className="link-button">
            View proof detail
          </Link>
        </footer>
      </div>
    );
  }

  return (
    <section className="card">
      <header className="card-header">
        <h2>2. Latest Proof · taipei-city</h2>
      </header>
      {body}
    </section>
  );
}
