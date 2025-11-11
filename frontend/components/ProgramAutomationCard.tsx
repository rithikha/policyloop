import Link from "next/link";
import { PROGRAM_MODULES } from "../lib/programModules";
import { readDemoProofs, readLedger } from "../lib/server-data";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

function formatPercent(permille?: number) {
  if (permille == null) return "—";
  return `${(permille / 10).toFixed(1)}%`;
}

function formatAmount(amount?: number) {
  if (amount == null) return "—";
  return formatter.format(amount);
}

export async function ProgramAutomationCard() {
  const [ledger, proofs] = await Promise.all([readLedger(), readDemoProofs()]);
  const modules = PROGRAM_MODULES;

  const proofByProgram = new Map<number, (typeof proofs)[number]>();
  for (const proof of proofs) {
    proofByProgram.set(proof.programId, proof);
  }

  const latestLedgerByProgram = new Map<number, { event: string; amountNTD: number; proofId: string }>();
  ledger?.entries.forEach((entry) => {
    if (entry.event === "PayoutExecuted" && !latestLedgerByProgram.has(entry.programId)) {
      latestLedgerByProgram.set(entry.programId, entry);
    }
  });

  return (
    <section className="card">
      <header className="card-header">
        <h2>2. IoT Drip Funding</h2>
        <Link
          className="link-button"
          href="https://github.com/rithikha/policyloop/tree/main/docs/phase2_aqi_fund_spec.md"
          target="_blank"
        >
          Add module
        </Link>
      </header>
      <p>
        Phase&nbsp;2 consumes the same `proofId` that Phase&nbsp;1 produced. For every week the IoT network meets MOENV QA/QC
        thresholds, the module automatically pays a slice of the 3.34&nbsp;M NTD budget. More programs can be added without
        touching the evidence layer.
      </p>
      <div className="program-grid">
        {modules.map((module) => {
          const proof = proofByProgram.get(module.id);
          const ledgerEntry = latestLedgerByProgram.get(module.id);
          const coverage = proof?.metrics?.coveragePermille;
          const proofLabel =
            ledgerEntry?.proofId && ledgerEntry.proofId.length > 0
              ? `${ledgerEntry.proofId.slice(0, 10)}…`
              : proof?.proofId
              ? `${proof.proofId.slice(0, 10)}…`
              : "—";
          return (
            <div key={module.id} className="program-stat">
              <div className="program-stat__title">{module.name}</div>
              <p className="program-stat__description">{module.description}</p>
              <dl className="program-stat__metrics">
                <div>
                  <dt>Weekly allocation</dt>
                  <dd>{formatAmount(module.weeklyAllocation)}</dd>
                </div>
                <div>
                  <dt>Threshold</dt>
                  <dd>
                    ≥{(module.minCoveragePermille / 10).toFixed(1)}% coverage · full pay at ≥
                    {(module.bonusCoveragePermille / 10).toFixed(1)}%
                  </dd>
                </div>
                <div>
                  <dt>Latest coverage</dt>
                  <dd>{formatPercent(coverage)}</dd>
                </div>
                <div>
                  <dt>Last payout</dt>
                  <dd>{formatAmount(ledgerEntry?.amountNTD)}</dd>
                </div>
                <div>
                  <dt>Proof</dt>
                  <dd className="mono">{proofLabel}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
