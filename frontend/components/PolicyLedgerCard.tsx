import { readLedger } from "../lib/server-data";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function PolicyLedgerCard() {
  const ledger = await readLedger();
  const entries = ledger?.entries ?? [];
  const latest = entries.slice(0, 6);

  return (
    <section className="card">
      <header className="card-header">
        <h2>3. Public Ledger</h2>
        <span className="ledger-meta">
          {ledger?.generatedAt ? `Generated ${formatDate(ledger.generatedAt)}` : "Run programs:export to refresh"}
        </span>
      </header>
      {latest.length === 0 ? (
        <p>No payouts recorded yet. Run `npm run programs:evaluate` followed by `npm run programs:export`.</p>
      ) : (
        <ul className="ledger-list">
          {latest.map((entry) => {
            const label = ledger?.programs?.[String(entry.programId)] ?? `Program ${entry.programId}`;
            return (
              <li key={`${entry.event}-${entry.txHash}-${entry.proofId}`} className="ledger-entry">
                <div className="ledger-entry__pill" data-kind={entry.event}>
                  {entry.event === "PayoutExecuted" ? "Payout" : "Eligibility"}
                </div>
                <div className="ledger-entry__body">
                  <div className="ledger-entry__title">
                    {label} · {currency.format(entry.amountNTD)}
                  </div>
                  <div className="ledger-entry__meta">
                    <span>{formatDate(entry.ts)}</span>
                    <span className="mono">proof {entry.proofId.slice(0, 10)}…</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
