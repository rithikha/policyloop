import { resolvePhase2Proofs, DemoProof } from "./resolve-proof";

export interface ParsedEvaluation extends DemoProof {
  amountNTD: number;
  coveragePermille: number;
  eventsProcessed: number;
  cemsValidPermille: number;
  pm25x10: number;
}

function toInt(value: number | undefined, fallback = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.round(value);
}

export async function parseDataset(): Promise<ParsedEvaluation[]> {
  const proofs = await resolvePhase2Proofs();
  return proofs.map((proof) => {
    const metrics = proof.metrics || {};
    return {
      ...proof,
      amountNTD: proof.amountNTD ?? 0,
      coveragePermille: toInt(metrics.coveragePermille),
      eventsProcessed: toInt(metrics.eventsProcessed),
      cemsValidPermille: toInt(metrics.cemsValidPermille),
      pm25x10: toInt(metrics.pm25x10),
    };
  });
}
