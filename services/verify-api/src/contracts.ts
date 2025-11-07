import { AbiCoder, keccak256, toUtf8Bytes } from "ethers";

export const openDataRegistryAbi = [
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
  }
] as const;

const DATASET_TYPEHASH = keccak256(
  toUtf8Bytes(
    "Dataset(bytes32 contentHash,bytes32 metadataHash,string uri,string version,string stationId,address publisher,address registry)"
  )
);

const abi = AbiCoder.defaultAbiCoder();

export function computeDatasetDigest(params: {
  contentHash: `0x${string}`;
  metadataHash: `0x${string}`;
  uri: string;
  version: string;
  stationId: string;
  publisher: `0x${string}`;
  registry: `0x${string}`;
}): `0x${string}` {
  return keccak256(
    abi.encode(
      ["bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "address", "address"],
      [
        DATASET_TYPEHASH,
        params.contentHash,
        params.metadataHash,
        keccak256(toUtf8Bytes(params.uri)),
        keccak256(toUtf8Bytes(params.version)),
        keccak256(toUtf8Bytes(params.stationId)),
        params.publisher,
        params.registry
      ]
    )
  ) as `0x${string}`;
}
