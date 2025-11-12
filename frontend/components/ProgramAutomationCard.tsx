import Link from "next/link";
import { loadProgramModules } from "../lib/programModules";
import { loadRecipients } from "../lib/recipients";
import { readDemoProofs, readLedger, readWeeklyAggregation } from "../lib/server-data";
import { AutomationControls } from "./AutomationControls";

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
  const [ledger, proofs, modules] = await Promise.all([readLedger(), readDemoProofs(), loadProgramModules()]);

  const moduleBundles = await Promise.all(
    modules.map(async (module) => ({
      module,
      recipients: await loadRecipients(module.recipientsFile),
      weekly: await readWeeklyAggregation(module.weeklyDataset)
    }))
  );

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
        <h2>2. Policy Modules</h2>
        <Link
          className="link-button"
          href="https://github.com/rithikha/policyloop/tree/main/docs/phase2_aqi_fund_spec.md"
          target="_blank"
        >
          Add module
        </Link>
      </header>
      <p>
        Phase&nbsp;2 modules consume the same `proofId` that Phase&nbsp;1 produces. Each card shows the weekly aggregation →
        payout pipeline, and new modules drop in by editing `config/programs/modules.json`.
      </p>
      <div className="program-grid">
        {moduleBundles.map(({ module, recipients, weekly }) => {
          const proof = proofByProgram.get(module.id);
          const ledgerEntry = latestLedgerByProgram.get(module.id);
          const coverage = proof?.metrics?.coveragePermille;
          const proofLabel =
            ledgerEntry?.proofId && ledgerEntry.proofId.length > 0
              ? `${ledgerEntry.proofId.slice(0, 10)}…`
              : proof?.proofId
              ? `${proof.proofId.slice(0, 10)}…`
              : "—";
          const payoutStatus = ledger?.entries.filter((entry) => entry.programId === module.id && entry.event === "PayoutExecuted");
          const lastPayoutTs = payoutStatus?.[0]?.ts;
          const lastPayoutAmount = payoutStatus?.[0]?.amountNTD;
          return (
            <div key={module.id} className="program-stat">
              <div className="program-stat__title">{module.name}</div>
              <p className="program-stat__description">{module.description}</p>
              {module.docsUrl ? (
                <Link className="program-spec-link" href={module.docsUrl} target="_blank">
                  View spec ↗
                </Link>
              ) : null}
              <AutomationControls programName={module.name} defaultAutoApprove={module.autoApprove} />
              <div className="automation-status">
                <div>
                  <span className="automation-status__label">Weekly batch</span>
                  <strong>
                    {weekly
                      ? `${weekly.intervalsSimulated?.toLocaleString() ?? weekly.entries.length} sensor intervals`
                      : "n/a"}
                  </strong>
                </div>
                <div>
                  <span className="automation-status__label">Last payout</span>
                  <strong>{lastPayoutTs ? new Date(lastPayoutTs).toLocaleString() : "No payouts yet"}</strong>
                </div>
                <div>
                  <span className="automation-status__label">Latest proof</span>
                  <strong className="mono">{proofLabel}</strong>
                </div>
              </div>

              <ul className="policy-checklist">
                <li className="pass">Phase 1 proof verified ({proofLabel})</li>
                <li className={coverage && coverage >= module.minCoveragePermille ? "pass" : "pending"}>
                  Sensor coverage {formatPercent(coverage)} (target ≥{(module.minCoveragePermille / 10).toFixed(1)}%)
                </li>
                <li className="pass">Dataset published every 3 minutes</li>
                <li className="pass">Uploaded to MOENV within 5 minutes</li>
                <li className="pass">Payout proof posted to Bluesky feed</li>
                <li className={lastPayoutAmount ? "pass" : "pending"}>
                  {lastPayoutAmount ? `Payout executed ${formatAmount(lastPayoutAmount)} on-chain` : "Payout pending"}
                </li>
              </ul>
              <dl className="program-stat__metrics">
                <div>
                  <dt>Weekly allocation</dt>
                  <dd>{formatAmount(module.weeklyAllocation)}</dd>
                </div>
                <div>
                  <dt>Threshold</dt>
                  <dd>Coverage target ≥{(module.minCoveragePermille / 10).toFixed(1)}%</dd>
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
              {recipients.length > 0 ? (
                <div className="drip-chart">
                  <div className="drip-chart__total">Weekly budget {formatAmount(module.weeklyAllocation)}</div>
                  <div className="drip-chart__segments">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.address}
                        className="drip-chart__segment"
                        style={{ flex: recipient.share }}
                      >
                        <span>{recipient.name}</span>
                        <strong>{formatAmount(module.weeklyAllocation * recipient.share)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {recipients.length > 0 ? (
                <table className="recipient-table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Share</th>
                      <th>Wallet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((recipient) => (
                      <tr key={recipient.address}>
                        <td>{recipient.name}</td>
                        <td>{(recipient.share * 100).toFixed(0)}%</td>
                        <td className="mono">{recipient.address.slice(0, 10)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {weekly ? (
                <p className="program-stat__footnote">
                  Aggregated {weekly.intervalsSimulated?.toLocaleString() ?? weekly.entries.length} intervals from
                  {" "}
                  {weekly.station ?? "Taipei"} sensors · generated {new Date(weekly.generatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
