import { NextResponse } from "next/server";
import { loadDataset, readStatus } from "../shared";

export async function GET() {
  const status = await readStatus();
  if (!status) {
    return NextResponse.json({ ok: false, reason: "No ingest run recorded." }, { status: 404 });
  }

  const dataset = await loadDataset(status);
  if (!dataset) {
    return NextResponse.json({ ok: false, reason: "Dataset payload unavailable." }, { status: 404 });
  }

  const filename = dataset.path ? dataset.path.split(/[/\\]/).pop() ?? "dataset.json" : "dataset.json";
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Content-Disposition", `attachment; filename=\"${filename}\"`);

  return new NextResponse(dataset.contents, { status: 200, headers });
}

