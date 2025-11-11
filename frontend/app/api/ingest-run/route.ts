import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { promises as fs } from "fs";

function parseEnv(contents: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    env[key] = value.replace(/^"(.*)"$/, "$1");
  }
  return env;
}

async function loadIngestEnv(repoRoot: string) {
  try {
    const envPath = path.join(repoRoot, "services/ingest-moev/.env");
    const contents = await fs.readFile(envPath, "utf8");
    return parseEnv(contents);
  } catch {
    return {};
  }
}

export const runtime = "nodejs";

export async function POST() {
  const repoRoot = path.resolve(process.cwd(), "..");
  const ingestEnv = await loadIngestEnv(repoRoot);

  return await new Promise<NextResponse>((resolve) => {
    const child = spawn("npm", ["run", "--silent", "ingest:once"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...ingestEnv
      }
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve(
        NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        )
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(
          NextResponse.json({
            ok: true,
            log: stdout.trim()
          })
        );
      } else {
        resolve(
          NextResponse.json(
            {
              ok: false,
              error: stderr.trim() || `Ingest exited with code ${code}`
            },
            { status: 500 }
          )
        );
      }
    });
  });
}
