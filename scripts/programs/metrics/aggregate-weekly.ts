import { promises as fs } from "fs";
import path from "path";
import { parseDataset } from "./parse-dataset";

type DailyRecord = {
  proofId: `0x${string}`;
  stationId: string;
  coveragePermille: number;
  amountNTD: number;
  recipient?: string;
};

const OUTPUT_PATH = path.resolve(__dirname, "../../../config/programs/iot_weekly_demo.json");
const SENSOR_COUNT = 90;
const INTERVAL_MINUTES = 3;
const DAYS = 7;

async function main() {
  const entries = await parseDataset();
  const iotEntries = entries.filter((entry) => entry.programId === 101);
  if (iotEntries.length === 0) {
    console.log("[aggregate] no IoT entries to aggregate");
    return;
  }

  const weekly: DailyRecord[] = iotEntries.map((entry) => ({
    proofId: entry.proofId,
    stationId: entry.stationId ?? "taipei-city",
    coveragePermille: entry.coveragePermille,
    amountNTD: entry.amountNTD ?? 0,
    recipient: entry.recipient,
  }));

  const intervalsSimulated =
    SENSOR_COUNT * (60 / INTERVAL_MINUTES) * 24 * DAYS;

  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        station: "taipei-city",
        intervalMinutes: INTERVAL_MINUTES,
        intervalsSimulated,
        entries: weekly,
      },
      null,
      2
    )
  );

  console.log(`[aggregate] wrote weekly demo -> ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("[aggregate] failed", error);
  process.exitCode = 1;
});
