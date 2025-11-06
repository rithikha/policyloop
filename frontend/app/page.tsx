import Link from "next/link";
import { PublishForm } from "../components/PublishForm";
import { ProofExplorer } from "../components/ProofExplorer";
import { AttestationPanel } from "../components/AttestationPanel";
import { VerifyTool } from "../components/VerifyTool";
import { FeedWidget } from "../components/FeedWidget";
import { AppShell } from "../components/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <div className="page-grid">
        <PublishForm />
        <ProofExplorer />
        <AttestationPanel />
        <VerifyTool />
        <FeedWidget />
        <section className="card">
          <header className="card-header">
            <h2>Documentation & Next Steps</h2>
          </header>
          <ul className="next-steps">
            <li>
              Verify proofs for other stations or downstream policy tooling via the <Link href="/verify">standalone verify tool</Link>.
            </li>
            <li>
              Inspect per-proof history and attestations inside the <Link href="/proof">proof explorer</Link>.
            </li>
            <li>Keep the ATProto mirror and /verify API healthy—both surface trust to external policy teams.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
