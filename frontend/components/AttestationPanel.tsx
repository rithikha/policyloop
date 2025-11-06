"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ATTESTATION_REGISTRY_ADDRESS, attestationRegistryAbi } from "../lib/contracts";
import { reviewerProfiles } from "../lib/reviewers";
import { timelinessLabel, Timeliness } from "../lib/trust";
import { useLatestProof } from "../hooks/useLatestProof";

interface ReviewerStatus {
  address: `0x${string}`;
  hasAttested: boolean;
}

export function AttestationPanel() {
  const { data: proofData } = useLatestProof();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [noteOverrides, setNoteOverrides] = useState<Record<string, string>>({});
  const [timelinessOverrides, setTimelinessOverrides] = useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const proofId = proofData?.proofId;
  const attestationAddress = ATTESTATION_REGISTRY_ADDRESS;

  const { data: reviewerStatuses, mutate } = useSWR(
    proofId && publicClient && attestationAddress ? ["reviewer-status", proofId] : null,
    async () => {
      if (!publicClient || !proofId || !attestationAddress) {
        return [] as ReviewerStatus[];
      }

      const results = await Promise.all(
        reviewerProfiles.map(async (profile) => {
          const hasAttested = await publicClient.readContract({
            address: attestationAddress,
            abi: attestationRegistryAbi,
            functionName: "hasAttested",
            args: [proofId, profile.address],
          });
          return {
            address: profile.address,
            hasAttested: Boolean(hasAttested),
          };
        })
      );

      return results;
    },
    {
      refreshInterval: 15_000,
    }
  );

  const statusMap = useMemo(() => {
    return new Map(reviewerStatuses?.map((item) => [item.address.toLowerCase(), item.hasAttested]));
  }, [reviewerStatuses]);

  const handleAttest = useCallback(
    async (reviewerAddress: `0x${string}`) => {
      if (!proofId) return;
      if (!attestationAddress) {
        setErrorMessage("AttestationRegistry address missing (NEXT_PUBLIC_ATTESTATION_REGISTRY).");
        return;
      }
      if (!address || address.toLowerCase() !== reviewerAddress.toLowerCase()) {
        setErrorMessage("Connect the reviewer wallet that matches this profile before attesting.");
        return;
      }

      const profile = reviewerProfiles.find((item) => item.address.toLowerCase() === reviewerAddress.toLowerCase());
      if (!profile) {
        setErrorMessage("Reviewer configuration missing.");
        return;
      }

      const note = noteOverrides[profile.address] ?? profile.defaultNote;
      const timeliness = Number(timelinessOverrides[profile.address] ?? profile.defaultTimeliness);

      try {
        setStatusMessage("Submitting attestation transaction...");
        setErrorMessage(null);

        await writeContractAsync({
          address: attestationAddress,
          abi: attestationRegistryAbi,
          functionName: "attest",
          args: [proofId, note, timeliness, profile.canAudit],
        });

        setStatusMessage("Attestation submitted. Waiting for confirmation...");
        await mutate();
        setStatusMessage("Attestation confirmed.");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to submit attestation.");
      }
    },
    [attestationAddress, proofId, address, noteOverrides, timelinessOverrides, writeContractAsync, mutate]
  );

  if (!proofId) {
    return (
      <section className="card">
        <header className="card-header">
          <h2>3. Reviewer Attestations</h2>
        </header>
        <p>Publish a proof first to unlock reviewer attestations.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <header className="card-header">
        <h2>3. Reviewer Attestations (2-of-3)</h2>
      </header>
      <div className="reviewer-grid">
        {reviewerProfiles.map((profile) => {
          const hasAttested = statusMap?.get(profile.address.toLowerCase()) ?? false;
          const isViewer = address?.toLowerCase() === profile.address.toLowerCase();

          return (
            <div key={profile.address} className="reviewer-card">
              <header>
                <h3>{profile.label}</h3>
                <span className={`pill ${profile.badgeClass}`}>{profile.badgeLabel}</span>
              </header>
              <p className="reviewer-address mono">{profile.address}</p>
              <label className="form-textarea compact">
                <span>Review Note</span>
                <textarea
                  rows={3}
                  value={noteOverrides[profile.address] ?? profile.defaultNote}
                  onChange={(event) =>
                    setNoteOverrides((prev) => ({
                      ...prev,
                      [profile.address]: event.target.value,
                    }))
                  }
                  disabled={!isViewer}
                />
              </label>
              <label className="form-field compact">
                <span>Timeliness</span>
                <select
                  value={timelinessOverrides[profile.address] ?? profile.defaultTimeliness}
                  onChange={(event) =>
                    setTimelinessOverrides((prev) => ({
                      ...prev,
                      [profile.address]: Number(event.target.value),
                    }))
                  }
                  disabled={!isViewer}
                >
                  <option value={Timeliness.OnTime}>{timelinessLabel(Timeliness.OnTime)}</option>
                  <option value={Timeliness.SlightDelay}>{timelinessLabel(Timeliness.SlightDelay)}</option>
                  <option value={Timeliness.Late}>{timelinessLabel(Timeliness.Late)}</option>
                </select>
              </label>
              {profile.canAudit ? <p className="audit-flag">This reviewer can mark a dataset as Audited.</p> : null}
              <button
                type="button"
                className="primary"
                disabled={!isViewer || hasAttested || isPending}
                onClick={() => handleAttest(profile.address)}
              >
                {hasAttested ? "Already Attested" : isViewer ? "Submit Attestation" : "Connect Reviewer Wallet"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="form-feedback">
        {statusMessage ? <span className="status">{statusMessage}</span> : null}
        {errorMessage ? <span className="error">{errorMessage}</span> : null}
      </div>
    </section>
  );
}
