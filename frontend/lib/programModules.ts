import { promises as fs } from "fs";
import path from "path";

export type ProgramModuleMeta = {
  id: number;
  name: string;
  description: string;
  weeklyAllocation: number;
  minCoveragePermille: number;
  bonusCoveragePermille: number;
  docsUrl?: string;
  recipientsFile?: string;
  weeklyDataset?: string;
  autoApprove?: boolean;
};

let cachedModules: ProgramModuleMeta[] | null = null;

export async function loadProgramModules(): Promise<ProgramModuleMeta[]> {
  if (cachedModules) return cachedModules;

  const modulesPath = path.resolve(process.cwd(), "../config/programs/modules.json");
  try {
    const raw = await fs.readFile(modulesPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedModules = parsed as ProgramModuleMeta[];
      return cachedModules;
    }
  } catch (error) {
    console.warn("[programs] unable to read modules.json", error);
  }

  cachedModules = [];
  return cachedModules;
}
