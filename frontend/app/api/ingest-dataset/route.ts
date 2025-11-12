import { NextResponse } from "next/server";
import { readStatus, loadDataset, toRelativePath, type StatusFile } from "./shared";

export async function GET() {
  const status = await readStatus();
  if (!status) {
    return NextResponse.json({
      ok: false,
      available: false,
      reason: "Ingest pipeline has not produced status yet."
    });
  }

  try {
    const preview = await buildPreview(status);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      available: false,
      datasetUrl: status.datasetUrl,
      reason: (error as Error).message
    });
  }
}

async function buildPreview(status: StatusFile) {
  const dataset = await loadDataset(status);
  if (!dataset) {
    throw new Error("Dataset payload unavailable. Run ingest again or pin locally.");
  }

  const contents = dataset.contents;

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    parsed = null;
  }

  const records = extractRecords(parsed) ?? [];
  const totalRecords = records.length;
  const columns = deriveColumns(records);
  const rows = records.map((record) => {
    const shaped: Record<string, unknown> = {};
    for (const column of columns) {
      shaped[column] = record[column];
    }
    return shaped;
  });

  return {
    ok: true,
    available: true,
    datasetUrl: status.datasetUrl ?? null,
    datasetPath: dataset.path ? toRelativePath(dataset.path) : null,
    datasetUri: status.datasetUri ?? null,
    fetchedFrom: dataset.source ?? null,
    capturedAt: status.startedAt ?? status.completedAt ?? null,
    totalRecords,
    columns,
    rows
  };
}

function extractRecords(value: unknown): Array<Record<string, any>> | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.filter((entry) => entry && typeof entry === "object");
  }
  if (typeof value === "object" && value !== null) {
    const maybeRecords = (value as any).records;
    if (Array.isArray(maybeRecords)) {
      return maybeRecords.filter((entry) => entry && typeof entry === "object");
    }
  }
  return null;
}

function deriveColumns(records: Array<Record<string, any>>) {
  if (records.length === 0) return [];
  const seen = new Set<string>();
  for (const record of records) {
    Object.keys(record).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
      }
    });
    if (seen.size > 48) break;
  }
  return Array.from(seen);
}
