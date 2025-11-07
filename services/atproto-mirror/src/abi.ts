export const openDataRegistryAbi = [
  "event DatasetPublished(bytes32 indexed proofId, address indexed publisher, string stationId, uint64 ts)",
  "event Revoked(bytes32 indexed proofId, address indexed auditor, string reason, uint64 ts)"
] as const;

export const attestationRegistryAbi = [
  "event Attested(bytes32 indexed proofId, address indexed reviewer, string note)"
] as const;
