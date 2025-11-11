import { promises as fs } from "fs";
import path from "path";

const LEDGER_LOG_PATH = path.resolve(__dirname, "../../../frontend/policy-ledger/ledger.log");

function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export async function appendPipelineLog(step: string, data: Record<string, unknown> = {}) {
  const segments = [`step=${step}`];
  for (const [key, value] of Object.entries(data)) {
    segments.push(`${key}=${formatValue(value)}`);
  }
  const line = `[${new Date().toISOString()}] ${segments.join(" ")}`;
  await fs.mkdir(path.dirname(LEDGER_LOG_PATH), { recursive: true });
  await fs.appendFile(LEDGER_LOG_PATH, `${line}\n`);
}
