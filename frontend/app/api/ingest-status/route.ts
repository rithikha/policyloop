import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const STATUS_PATH = path.resolve(process.cwd(), "../artifacts/ingest/status.json");

export async function GET() {
  try {
    const raw = await fs.readFile(STATUS_PATH, "utf8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT") {
      return NextResponse.json(
        {
          steps: []
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      {
        error: "Ingest status unavailable",
        details: err instanceof Error ? err.message : String(err),
        steps: []
      },
      { status: 200 }
    );
  }
}
