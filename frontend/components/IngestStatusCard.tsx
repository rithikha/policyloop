"use client";

import useSWR, { useSWRConfig } from "swr";
import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";

interface StepEntry {
  name: string;
  status: "success" | "error";
  timestamp: string;
  details?: string;
}

interface PipelineStatus {
  datasetUrl?: string;
  datasetUri?: string;
  startedAt?: string;
  completedAt?: string;
  proofId?: string;
  txHash?: string;
  error?: string;
  steps?: StepEntry[];
}

const STEP_LABELS: Record<string, string> = {
  fetchDataset: "Fetch MOENV dataset",
  validateMetadata: "Validate schema",
  pinDataset: "Pin to IPFS",
  publishProof: "Publish proof"
};

const STATUS_CLASS: Record<string, string> = {
  success: "status-success",
  error: "status-error"
};

async function fetchStatus(): Promise<PipelineStatus> {
  const res = await fetch("/api/ingest-status");
  if (!res.ok) {
    throw new Error(`Status request failed (${res.status})`);
  }
  return res.json();
}

export function IngestStatusCard() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(["ingest-status"], fetchStatus, {
    refreshInterval: 30_000
  });
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const triggerIngest = async () => {
    setIsTriggering(true);
    setTriggerError(null);
    try {
      const res = await fetch("/api/ingest-run", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to run ingest pipeline.");
      }
      await mutate(["ingest-status"]);
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsTriggering(false);
    }
  };

  const steps = data?.steps ?? [];

  return (
    <section className="card">
      <header className="card-header">
        <h2>1. Automated Publish Pipeline</h2>
        <button className="link-button" onClick={triggerIngest} disabled={isTriggering}>
          {isTriggering ? "Running…" : "Run pipeline"}
        </button>
      </header>
      {isLoading ? (
        <p>Loading ingest status…</p>
      ) : error ? (
        <p className="error">Unable to load ingest status: {error instanceof Error ? error.message : String(error)}</p>
      ) : (
        <>
          <dl className="ingest-meta">
            {data?.datasetUrl ? (
              <div>
                <dt>Source URL</dt>
                <dd className="mono ingest-url">{data.datasetUrl}</dd>
              </div>
            ) : null}
            {data?.datasetUri ? (
              <div>
                <dt>Pinned URI</dt>
                <dd className="mono ingest-url">{data.datasetUri}</dd>
              </div>
            ) : null}
            {data?.proofId ? (
              <div>
                <dt>Last proof ID</dt>
                <dd className="mono">{data.proofId}</dd>
              </div>
            ) : null}
            {data?.txHash ? (
              <div>
                <dt>Tx hash</dt>
                <dd className="mono">{data.txHash}</dd>
              </div>
            ) : null}
            {data?.startedAt ? (
              <div>
                <dt>Last run</dt>
                <dd>{formatDistanceToNowStrict(new Date(data.startedAt), { addSuffix: true })}</dd>
              </div>
            ) : null}
          </dl>
          <ul className="pipeline-steps">
            {steps.length === 0 ? (
              <li>No pipeline runs recorded yet.</li>
            ) : (
              steps.map((step) => (
                <li key={step.name} className={STATUS_CLASS[step.status] ?? ""}>
                  <div className="pipeline-step-title">{STEP_LABELS[step.name] ?? step.name}</div>
                  <div className="pipeline-step-meta">
                    <span>{step.status === "success" ? "Done" : "Failed"}</span>
                    {step.timestamp ? (
                      <span>{formatDistanceToNowStrict(new Date(step.timestamp), { addSuffix: true })}</span>
                    ) : null}
                  </div>
                  {step.details ? <p className="pipeline-step-details">{step.details}</p> : null}
                </li>
              ))
            )}
          </ul>
          {data?.error ? <p className="error">Last run error: {data.error}</p> : null}
          {triggerError ? <p className="error">Manual run failed: {triggerError}</p> : null}
        </>
      )}
    </section>
  );
}
