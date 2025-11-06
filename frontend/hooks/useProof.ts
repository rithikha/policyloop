"use client";

import useSWR from "swr";
import { usePublicClient } from "wagmi";
import {
  ATTESTATION_REGISTRY_ADDRESS,
  OPEN_DATA_REGISTRY_ADDRESS,
  attestationRegistryAbi,
  openDataRegistryAbi,
} from "../lib/contracts";
import { AttestationSummary, Timeliness } from "../lib/trust";

export interface AttestationDetail {
  reviewer: `0x${string}`;
  attestedAt: number;
  note: string;
  timeliness: Timeliness;
  marksAudited: boolean;
}

export interface ProofDetailData {
  proofId: `0x${string}`;
  contentHash: `0x${string}`;
  metadataHash: `0x${string}`;
  publisher: `0x${string}`;
  publishedAt: number;
  uri: string;
  version: string;
  stationId: string;
  status: number;
  summary: AttestationSummary;
  attestations: AttestationDetail[];
  revocation?: {
    auditor: `0x${string}`;
    reason: string;
    revokedAt: number;
  };
}

async function fetchProofDetail(publicClient: ReturnType<typeof usePublicClient>, proofId: `0x${string}`): Promise<ProofDetailData> {
  const registryAddress = OPEN_DATA_REGISTRY_ADDRESS;
  if (!publicClient || !registryAddress) {
    throw new Error("OpenDataRegistry address missing");
  }

  const proofTuple = (await publicClient.readContract({
    address: registryAddress,
    abi: openDataRegistryAbi,
    functionName: "getProof",
    args: [proofId],
  })) as unknown as [`0x${string}`, `0x${string}`, `0x${string}`, bigint, string, string, string, number];

  const status = (await publicClient.readContract({
    address: registryAddress,
    abi: openDataRegistryAbi,
    functionName: "statusOf",
    args: [proofId],
  })) as unknown as number;

  let summary: AttestationSummary = {
    total: 0,
    publicCount: 0,
    ngoCount: 0,
    audited: false,
    timeliness: Timeliness.Unknown,
  };
  let attestations: AttestationDetail[] = [];

  if (ATTESTATION_REGISTRY_ADDRESS) {
    const [summaryTuple, attestationTuples] = await Promise.all([
      publicClient.readContract({
        address: ATTESTATION_REGISTRY_ADDRESS,
        abi: attestationRegistryAbi,
        functionName: "getSummary",
        args: [proofId],
      }) as unknown as Promise<[bigint, bigint, bigint, boolean, number]>,
      publicClient.readContract({
        address: ATTESTATION_REGISTRY_ADDRESS,
        abi: attestationRegistryAbi,
        functionName: "getAttestations",
        args: [proofId],
      }) as unknown as Promise<[
        `0x${string}`,
        bigint,
        string,
        number,
        boolean
      ][]>,
    ]);

    summary = {
      total: Number(summaryTuple[0]),
      publicCount: Number(summaryTuple[1]),
      ngoCount: Number(summaryTuple[2]),
      audited: summaryTuple[3],
      timeliness: summaryTuple[4] as Timeliness,
    };

    attestations = attestationTuples.map((item) => ({
      reviewer: item[0],
      attestedAt: Number(item[1]),
      note: item[2],
      timeliness: item[3] as Timeliness,
      marksAudited: item[4],
    }));
  }

  let revocation: ProofDetailData["revocation"];
  if (status === 3) {
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
    contentHash: proofTuple[0],
    metadataHash: proofTuple[1],
    publisher: proofTuple[2],
    publishedAt: Number(proofTuple[3]),
    uri: proofTuple[4],
    version: proofTuple[5],
    stationId: proofTuple[6],
    status,
    summary,
    attestations,
    revocation,
  };
}

export function useProof(proofId: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const registryAddress = OPEN_DATA_REGISTRY_ADDRESS;

  return useSWR(proofId && registryAddress ? ["proof", proofId] : null, () => fetchProofDetail(publicClient, proofId!), {
    refreshInterval: 30_000,
  });
}
