"use client";

import useSWR from "swr";
import { usePublicClient } from "wagmi";
import {
  ATTESTATION_REGISTRY_ADDRESS,
  OPEN_DATA_REGISTRY_ADDRESS,
  POLICY_DATA_VIEW_ADDRESS,
  attestationRegistryAbi,
  openDataRegistryAbi,
  policyDataViewAbi,
} from "../lib/contracts";
import { AttestationSummary, ProofStatus, Timeliness, computeTrustScore, computeTrustTier } from "../lib/trust";
import { normalizeSummary } from "../lib/attestations";

const ZERO_PROOF = "0x0000000000000000000000000000000000000000000000000000000000000000";

export interface LatestProofData {
  proofId: `0x${string}`;
  contentHash: `0x${string}`;
  metadataHash: `0x${string}`;
  publisher: `0x${string}`;
  publishedAt: number;
  uri: string;
  version: string;
  stationId: string;
  status: ProofStatus;
  summary: AttestationSummary;
  trustScore: number;
  trustTier: number;
  revocation?: {
    auditor: `0x${string}`;
    reason: string;
    revokedAt: number;
  };
}

async function fetchLatestProof(publicClient: ReturnType<typeof usePublicClient>): Promise<LatestProofData | null> {
  const registryAddress = OPEN_DATA_REGISTRY_ADDRESS;
  if (!publicClient || !registryAddress) {
    return null;
  }

  const proofId = (await publicClient.readContract({
    address: registryAddress,
    abi: openDataRegistryAbi,
    functionName: "getLatestProof",
    args: ["taipei-city"],
  })) as `0x${string}`;

  if (!proofId || proofId === ZERO_PROOF) {
    return null;
  }

  const [proofTuple, statusValue] = await Promise.all([
    publicClient.readContract({
      address: registryAddress,
      abi: openDataRegistryAbi,
      functionName: "getProof",
      args: [proofId],
    }),
    publicClient.readContract({
      address: registryAddress,
      abi: openDataRegistryAbi,
      functionName: "statusOf",
      args: [proofId],
    }),
  ]);

  const [contentHash, metadataHash, publisher, publishedAt, uri, version, stationId] = proofTuple as [
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    bigint,
    string,
    string,
    string,
    number,
  ];

  let summary: AttestationSummary = normalizeSummary(undefined);

  if (ATTESTATION_REGISTRY_ADDRESS) {
    const summaryRaw = await publicClient.readContract({
      address: ATTESTATION_REGISTRY_ADDRESS,
      abi: attestationRegistryAbi,
      functionName: "getSummary",
      args: [proofId],
    });

    summary = normalizeSummary(summaryRaw);
  }

  let trustScore = computeTrustScore(summary);
  let trustTier = computeTrustTier(statusValue as ProofStatus, summary);

  if (POLICY_DATA_VIEW_ADDRESS) {
    const [scoreFromChain, tierFromChain] = await Promise.all([
      publicClient.readContract({
        address: POLICY_DATA_VIEW_ADDRESS,
        abi: policyDataViewAbi,
        functionName: "trustScore",
        args: [proofId],
      }),
      publicClient.readContract({
        address: POLICY_DATA_VIEW_ADDRESS,
        abi: policyDataViewAbi,
        functionName: "trustTier",
        args: [proofId],
      }),
    ]);
    trustScore = Number(scoreFromChain);
    trustTier = Number(tierFromChain);
  }

  let revocation: LatestProofData["revocation"];
  if (statusValue === ProofStatus.Revoked) {
    const revocationTuple = (await publicClient.readContract({
      address: registryAddress,
      abi: openDataRegistryAbi,
      functionName: "revocation",
      args: [proofId],
    })) as unknown as [`0x${string}`, string, bigint];

    revocation = {
      auditor: revocationTuple[0],
      reason: revocationTuple[1],
      revokedAt: Number(revocationTuple[2]),
    };
  }

  return {
    proofId,
    contentHash,
    metadataHash,
    publisher: publisher as `0x${string}`,
    publishedAt: Number(publishedAt),
    uri,
    version,
    stationId,
    status: statusValue as ProofStatus,
    summary,
    trustScore,
    trustTier,
    revocation,
  };
}

export function useLatestProof() {
  const publicClient = usePublicClient();

  return useSWR(
    publicClient && OPEN_DATA_REGISTRY_ADDRESS ? ["latest-proof", OPEN_DATA_REGISTRY_ADDRESS] : null,
    () => fetchLatestProof(publicClient),
    {
      refreshInterval: 30_000,
    }
  );
}
