import { ProofDetailClient } from "../../../components/ProofDetailClient";
import { AppShell } from "../../../components/AppShell";

export default function ProofDetailPage({ params }: { params: { id: string } }) {
  const rawId = params.id.startsWith("0x") ? params.id : `0x${params.id}`;
  return (
    <AppShell>
      <ProofDetailClient proofId={rawId as `0x${string}`} />
    </AppShell>
  );
}
