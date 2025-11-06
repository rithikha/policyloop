import { Abi, isAddress } from "viem";
import type { Address } from "viem";

function envAddress(rawValue: string | undefined, envKey: string): Address | undefined {
  const raw = rawValue;
  const value = raw ? raw.trim() : "";
  if (!value) return undefined;
  if (!isAddress(value)) {
    if (typeof window !== "undefined") {
      console.warn(`Environment variable ${envKey} is not a valid address: ${value}`);
    }
    return undefined;
  }
  return value as Address;
}

export const OPEN_DATA_REGISTRY_ADDRESS = envAddress(
  process.env.NEXT_PUBLIC_OPEN_DATA_REGISTRY,
  "NEXT_PUBLIC_OPEN_DATA_REGISTRY"
);
export const ATTESTATION_REGISTRY_ADDRESS = envAddress(
  process.env.NEXT_PUBLIC_ATTESTATION_REGISTRY,
  "NEXT_PUBLIC_ATTESTATION_REGISTRY"
);
export const POLICY_DATA_VIEW_ADDRESS = envAddress(
  process.env.NEXT_PUBLIC_POLICY_DATA_VIEW,
  "NEXT_PUBLIC_POLICY_DATA_VIEW"
);

export const openDataRegistryAbi = [
  {
    inputs: [
      { internalType: "bytes32", name: "contentHash", type: "bytes32" },
      { internalType: "bytes32", name: "metadataHash", type: "bytes32" },
      { internalType: "string", name: "uri", type: "string" },
      { internalType: "string", name: "version", type: "string" },
      { internalType: "string", name: "stationId", type: "string" },
      { internalType: "bytes", name: "sig", type: "bytes" }
    ],
    name: "publish",
    outputs: [{ internalType: "bytes32", name: "proofId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "proofId", type: "bytes32" }],
    name: "statusOf",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "proofId", type: "bytes32" }],
    name: "getProof",
    outputs: [
      { internalType: "bytes32", name: "", type: "bytes32" },
      { internalType: "bytes32", name: "", type: "bytes32" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint64", name: "", type: "uint64" },
      { internalType: "string", name: "", type: "string" },
      { internalType: "string", name: "", type: "string" },
      { internalType: "string", name: "", type: "string" },
      { internalType: "uint8", name: "", type: "uint8" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "stationId", type: "string" }],
    name: "getLatestProof",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "stationId", type: "string" }],
    name: "getLatestAttestedProof",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "proofId", type: "bytes32" }],
    name: "revocation",
    outputs: [
      {
        components: [
          { internalType: "address", name: "auditor", type: "address" },
          { internalType: "string", name: "reason", type: "string" },
          { internalType: "uint64", name: "revokedAt", type: "uint64" }
        ],
        internalType: "struct OpenDataRegistry.Revocation",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "proofId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "publisher", type: "address" },
      { indexed: false, internalType: "string", name: "stationId", type: "string" },
      { indexed: false, internalType: "uint64", name: "ts", type: "uint64" }
    ],
    name: "DatasetPublished",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "proofId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "auditor", type: "address" },
      { indexed: false, internalType: "string", name: "reason", type: "string" },
      { indexed: false, internalType: "uint64", name: "ts", type: "uint64" }
    ],
    name: "Revoked",
    type: "event"
  }
] as const satisfies Abi;

export const attestationRegistryAbi = [
  {
    inputs: [
      { internalType: "bytes32", name: "proofId", type: "bytes32" },
      { internalType: "string", name: "note", type: "string" },
      { internalType: "uint8", name: "timeliness", type: "uint8" },
      { internalType: "bool", name: "markAudited", type: "bool" }
    ],
    name: "attest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "proofId", type: "bytes32" }],
    name: "getSummary",
    outputs: [
      {
        components: [
          { internalType: "uint8", name: "total", type: "uint8" },
          { internalType: "uint8", name: "publicCount", type: "uint8" },
          { internalType: "uint8", name: "ngoCount", type: "uint8" },
          { internalType: "bool", name: "audited", type: "bool" },
          { internalType: "uint8", name: "timeliness", type: "uint8" }
        ],
        internalType: "struct AttestationRegistry.Summary",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "proofId", type: "bytes32" }],
    name: "getAttestations",
    outputs: [
      {
        components: [
          { internalType: "address", name: "reviewer", type: "address" },
          { internalType: "uint64", name: "attestedAt", type: "uint64" },
          { internalType: "string", name: "note", type: "string" },
          { internalType: "uint8", name: "timeliness", type: "uint8" },
          { internalType: "bool", name: "marksAudited", type: "bool" }
        ],
        internalType: "struct AttestationRegistry.Attestation[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "proofId", type: "bytes32" },
      { internalType: "address", name: "reviewer", type: "address" }
    ],
    name: "hasAttested",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
] as const satisfies Abi;

export const policyDataViewAbi = [
  {
    inputs: [{ internalType: "bytes32", name: "proofId", type: "bytes32" }],
    name: "trustScore",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "proofId", type: "bytes32" }],
    name: "trustTier",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "stationId", type: "string" }],
    name: "latestAttestedProof",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  }
] as const satisfies Abi;

export interface DatasetMeta {
  stationId: string;
  capturedAt: bigint;
  format: "json" | "csv";
  schemaUri: string;
  license: string;
  publisherDid?: string;
  contentHash: `0x${string}`;
}

export const datasetMetaTypes = {
  DatasetMeta: [
    { name: "stationId", type: "string" },
    { name: "capturedAt", type: "uint64" },
    { name: "format", type: "string" },
    { name: "schemaUri", type: "string" },
    { name: "license", type: "string" },
    { name: "publisherDid", type: "string" },
    { name: "contentHash", type: "bytes32" }
  ]
} as const;

export function datasetDomain(chainId: number, verifyingContract: Address) {
  return {
    name: "CityOS-OpenData",
    version: "1",
    chainId,
    verifyingContract
  } as const;
}
