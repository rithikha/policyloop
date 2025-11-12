"use client";

import useSWR from "swr";

type DatasetPreview = {
  ok: boolean;
  available: boolean;
  datasetUrl?: string | null;
  datasetPath?: string | null;
  datasetUri?: string | null;
  fetchedFrom?: string | null;
  capturedAt?: string | null;
  totalRecords?: number;
  columns?: string[];
  rows?: Array<Record<string, unknown>>;
  reason?: string;
};

async function fetchPreview(): Promise<DatasetPreview> {
  const res = await fetch("/api/ingest-dataset");
  if (!res.ok) {
    throw new Error(`Dataset preview failed (${res.status})`);
  }
  return res.json();
}

export function IngestDatasetCard() {
  const { data, error, isLoading } = useSWR(["ingest-dataset"], fetchPreview, {
    refreshInterval: 60_000
  });

  return (
    <section className="card">
      <header className="card-header">
        <h2>Dataset Preview</h2>
      </header>
      {isLoading ? (
        <p>Loading latest dataset…</p>
      ) : error ? (
        <p className="error">Unable to load dataset preview: {error.message}</p>
      ) : !data?.available ? (
        <p>
          {data?.reason ?? "No dataset has been ingested yet."} {data?.datasetUrl ? `Source: ${data.datasetUrl}` : null}
        </p>
      ) : (
        <>
          <dl className="dataset-meta">
            {data.datasetUrl ? (
              <div>
                <dt>Source URL</dt>
                <dd className="mono dataset-url">{data.datasetUrl}</dd>
              </div>
            ) : null}
            {data.datasetPath ? (
              <div>
                <dt>Stored file</dt>
                <dd className="mono">{data.datasetPath}</dd>
              </div>
            ) : null}
            {data.datasetUri ? (
              <div>
                <dt>Dataset URI</dt>
                <dd className="mono">{data.datasetUri}</dd>
              </div>
            ) : null}
            {data.fetchedFrom ? (
              <div>
                <dt>Preview source</dt>
                <dd className="mono">{data.fetchedFrom}</dd>
              </div>
            ) : null}
            {data.capturedAt ? (
              <div>
                <dt>Captured at</dt>
                <dd>{new Date(data.capturedAt).toLocaleString()}</dd>
              </div>
            ) : null}
            {typeof data.totalRecords === "number" ? (
              <div>
                <dt>Total records</dt>
                <dd>{data.totalRecords.toLocaleString()}</dd>
              </div>
            ) : null}
          </dl>
          {data.columns && data.columns.length > 0 && data.rows && data.rows.length > 0 ? (
            <div className="dataset-table-wrapper">
              <table className="dataset-table">
                <thead>
                  <tr>
                    {data.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, index) => (
                    <tr key={index}>
                      {data.columns!.map((column) => (
                        <td key={column}>{formatValue(row[column])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="dataset-note">
                Scroll to explore every record (showing {data.rows.length} rows). Download the full payload
                <a className="dataset-download" href="/api/ingest-dataset/download"> here</a>.
              </p>
            </div>
          ) : (
            <p>No previewable rows found in the latest dataset.</p>
          )}
        </>
      )}
    </section>
  );
}

function formatValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
