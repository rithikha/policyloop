"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLatestProof } from "../../hooks/useLatestProof";
import { AppShell } from "../../components/AppShell";

export default function ProofIndexPage() {
  const router = useRouter();
  const { data: latest } = useLatestProof();
  const [input, setInput] = useState("" as `0x${string}` | "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!input) return;
    const normalized = input.startsWith("0x") ? input : (`0x${input}` as `0x${string}`);
    router.push(`/proof/${normalized}`);
  };

  return (
    <AppShell>
      <section className="card">
        <header className="card-header">
          <h2>Proof Explorer</h2>
        </header>
        <p>Enter a proof ID to inspect its hashes, attestations, and revocation history.</p>
        {latest ? (
          <p>
            Latest taipei-city proof:{" "}
            <button className="link-button" type="button" onClick={() => router.push(`/proof/${latest.proofId}`)}>
              {latest.proofId}
            </button>
          </p>
        ) : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Proof ID</span>
            <input type="text" value={input} onChange={(event) => setInput(event.target.value as `0x${string}`)} placeholder="0x..." />
          </label>
          <div className="form-actions">
            <button type="submit" className="primary">
              View Proof
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
