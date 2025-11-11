export type ProgramModuleMeta = {
  id: number;
  name: string;
  description: string;
  weeklyAllocation: number;
  minCoveragePermille: number;
  bonusCoveragePermille: number;
};

export const PROGRAM_MODULES: ProgramModuleMeta[] = [
  {
    id: 101,
    name: "IoT Coverage Boost",
    description: "Pays the maintenance vendor every week the network meets MOENV QA/QC thresholds.",
    weeklyAllocation: 64_230,
    minCoveragePermille: 900,
    bonusCoveragePermille: 980,
  },
];
