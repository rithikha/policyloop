import { Contract } from "ethers";

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
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "proofId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "publisher", type: "address" },
      { indexed: false, internalType: "string", name: "stationId", type: "string" },
      { indexed: false, internalType: "uint64", name: "ts", type: "uint64" }
    ],
    name: "DatasetPublished",
    type: "event"
  }
] as const;

export type OpenDataRegistry = Contract;
