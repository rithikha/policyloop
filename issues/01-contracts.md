# Issue: Contracts — Registries, Events, k-of-n, Revocation

## Objective
Implement smart contracts for verifiable datasets:
- `PublisherRegistry`
- `OpenDataRegistry`
- `AttestationRegistry`
- `PolicyDataView` (read-only helper: latestAttestedProof, trustScore/tier)

## Tasks
- [ ] PublisherRegistry: allowlist CRUD, roles (PUBLISHER, REVIEWER, AUDITOR)
- [ ] OpenDataRegistry: `publish`, `revoke`, storage of Proof, events
- [ ] AttestationRegistry: `attest`, `isAttested` (k-of-n = 2-of-3 reviewers), events
- [ ] PolicyDataView: read-only helpers incl. trustScore/tier calc
- [ ] Interfaces in `/contracts/interfaces`
- [ ] Unit tests: publish/attest/revoke, edge cases (double attest, not-allowlisted, etc.)

## Interfaces

```solidity
interface IOpenDataRegistry {
  function publish(
    bytes32 contentHash,
    bytes32 metadataHash,
    string calldata uri,
    string calldata version,
    string calldata stationId,
    bytes calldata sig
  ) external returns (bytes32 proofId);

  function revoke(bytes32 proofId, string calldata reason) external;

  function getProof(bytes32 proofId) external view returns (
    bytes32, bytes32, address, uint64, string memory, string memory, string memory, uint8
  );

  function getLatestProof(string calldata stationId) external view returns (bytes32);
}
```

## Events
```solidity
event DatasetPublished(bytes32 indexed proofId, address indexed publisher, string stationId, uint64 ts);
event Attested(bytes32 indexed proofId, address indexed reviewer, string note);
event Revoked(bytes32 indexed proofId, address indexed auditor, string reason, uint64 ts);
```

## k-of-n
- Default: **2-of-3** reviewers (City Admin, Env Dept, NGO).

## Trust score & tiers
- As defined in README; implemented in `PolicyDataView` (pure/view).

## Done When
- All unit tests pass and gas reports generated.
- Contracts deployed to **Sepolia**.
