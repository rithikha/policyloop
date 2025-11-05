// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOpenDataRegistry {
    event DatasetPublished(bytes32 indexed proofId, address indexed publisher, string stationId, uint64 ts);
    event Attested(bytes32 indexed proofId, address indexed reviewer, string note);
    event Revoked(bytes32 indexed proofId, address indexed auditor, string reason, uint64 ts);

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
