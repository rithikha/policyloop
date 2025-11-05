// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IOpenDataRegistry.sol";
import "./PublisherRegistry.sol";
import "./utils/ECDSA.sol";

/**
 * @title OpenDataRegistry
 * @notice Manages dataset proofs published by allowlisted publishers with signature verification.
 * Attestations (recorded in a dedicated registry) elevate proofs to attested status and auditors can
 * revoke proofs with a public reason.
 */
contract OpenDataRegistry is IOpenDataRegistry {
    using ECDSA for bytes32;

    enum ProofStatus {
        None,
        Submitted,
        Attested,
        Revoked
    }

    struct Proof {
        bytes32 contentHash;
        bytes32 metadataHash;
        address publisher;
        uint64 publishedAt;
        string uri;
        string version;
        string stationId;
        ProofStatus status;
    }

    struct Revocation {
        address auditor;
        string reason;
        uint64 revokedAt;
    }

    PublisherRegistry public immutable publisherRegistry;
    address public owner;
    address public attestationRegistry;
    uint8 private constant ROLE_PUBLISHER = 1;
    uint8 private constant ROLE_AUDITOR = 4;

    mapping(bytes32 => Proof) private _proofs;
    mapping(bytes32 => Revocation) private _revocations;
    mapping(bytes32 => bytes32) private _latestProofByStation;
    mapping(bytes32 => bytes32) private _latestAttestedProofByStation;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AttestationRegistrySet(address indexed attestationRegistry);
    event ProofStatusUpdated(bytes32 indexed proofId, ProofStatus status);

    modifier onlyOwner() {
        require(msg.sender == owner, "OpenDataRegistry: not owner");
        _;
    }

    modifier onlyAttestationRegistry() {
        require(msg.sender == attestationRegistry, "OpenDataRegistry: not attestation registry");
        _;
    }

    constructor(PublisherRegistry registry) {
        require(address(registry) != address(0), "OpenDataRegistry: registry required");
        publisherRegistry = registry;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "OpenDataRegistry: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setAttestationRegistry(address registry) external onlyOwner {
        require(registry != address(0), "OpenDataRegistry: zero attestation registry");
        attestationRegistry = registry;
        emit AttestationRegistrySet(registry);
    }

    function publish(
        bytes32 contentHash,
        bytes32 metadataHash,
        string calldata uri,
        string calldata version,
        string calldata stationId,
        bytes calldata sig
    ) external override returns (bytes32 proofId) {
        require(publisherRegistry.hasRole(msg.sender, ROLE_PUBLISHER), "OpenDataRegistry: not publisher");
        require(bytes(uri).length > 0, "OpenDataRegistry: uri required");
        require(bytes(version).length > 0, "OpenDataRegistry: version required");
        require(bytes(stationId).length > 0, "OpenDataRegistry: stationId required");

        bytes32 digest = datasetDigest(contentHash, metadataHash, uri, version, stationId, msg.sender);

        address signer = digest.toEthSignedMessageHash().recover(bytes(sig));
        require(signer == msg.sender, "OpenDataRegistry: invalid signature");

        proofId = keccak256(
            abi.encodePacked(block.chainid, msg.sender, contentHash, metadataHash, keccak256(bytes(uri)), block.timestamp)
        );

        require(_proofs[proofId].publisher == address(0), "OpenDataRegistry: proof exists");

        Proof storage record = _proofs[proofId];
        record.contentHash = contentHash;
        record.metadataHash = metadataHash;
        record.publisher = msg.sender;
        record.publishedAt = uint64(block.timestamp);
        record.uri = uri;
        record.version = version;
        record.stationId = stationId;
        record.status = ProofStatus.Submitted;

        bytes32 stationKey = _stationKey(stationId);
        _latestProofByStation[stationKey] = proofId;

        emit DatasetPublished(proofId, msg.sender, stationId, record.publishedAt);
        emit ProofStatusUpdated(proofId, ProofStatus.Submitted);
    }

    function revoke(bytes32 proofId, string calldata reason) external override {
        require(publisherRegistry.hasRole(msg.sender, ROLE_AUDITOR), "OpenDataRegistry: not auditor");
        Proof storage record = _proofs[proofId];
        require(record.publisher != address(0), "OpenDataRegistry: unknown proof");
        require(record.status != ProofStatus.Revoked, "OpenDataRegistry: already revoked");
        require(bytes(reason).length > 0, "OpenDataRegistry: reason required");

        record.status = ProofStatus.Revoked;

        Revocation storage revocationRecord = _revocations[proofId];
        revocationRecord.auditor = msg.sender;
        revocationRecord.reason = reason;
        revocationRecord.revokedAt = uint64(block.timestamp);

        bytes32 stationKey = _stationKey(record.stationId);
        if (_latestAttestedProofByStation[stationKey] == proofId) {
            _latestAttestedProofByStation[stationKey] = bytes32(0);
        }

        emit Revoked(proofId, msg.sender, reason, revocationRecord.revokedAt);
        emit ProofStatusUpdated(proofId, ProofStatus.Revoked);
    }

    function markAttested(bytes32 proofId) external onlyAttestationRegistry {
        Proof storage record = _proofs[proofId];
        require(record.publisher != address(0), "OpenDataRegistry: unknown proof");
        require(record.status == ProofStatus.Submitted, "OpenDataRegistry: invalid status");
        record.status = ProofStatus.Attested;

        bytes32 stationKey = _stationKey(record.stationId);
        _latestAttestedProofByStation[stationKey] = proofId;

        emit ProofStatusUpdated(proofId, ProofStatus.Attested);
    }

    function getProof(
        bytes32 proofId
    )
        external
        view
        override
        returns (
            bytes32,
            bytes32,
            address,
            uint64,
            string memory,
            string memory,
            string memory,
            uint8
        )
    {
        Proof storage record = _proofs[proofId];
        require(record.publisher != address(0), "OpenDataRegistry: unknown proof");
        return (
            record.contentHash,
            record.metadataHash,
            record.publisher,
            record.publishedAt,
            record.uri,
            record.version,
            record.stationId,
            uint8(record.status)
        );
    }

    function getLatestProof(string calldata stationId) external view override returns (bytes32) {
        return _latestProofByStation[_stationKey(stationId)];
    }

    function datasetDigest(
        bytes32 contentHash,
        bytes32 metadataHash,
        string calldata uri,
        string calldata version,
        string calldata stationId,
        address publisher
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        "Dataset(bytes32 contentHash,bytes32 metadataHash,string uri,string version,string stationId,address publisher,address registry)"
                    ),
                    contentHash,
                    metadataHash,
                    keccak256(bytes(uri)),
                    keccak256(bytes(version)),
                    keccak256(bytes(stationId)),
                    publisher,
                    address(this)
                )
            );
    }

    function getLatestAttestedProof(string calldata stationId) external view returns (bytes32) {
        return _latestAttestedProofByStation[_stationKey(stationId)];
    }

    function revocation(bytes32 proofId) external view returns (Revocation memory) {
        require(_proofs[proofId].publisher != address(0), "OpenDataRegistry: unknown proof");
        return _revocations[proofId];
    }

    function proof(bytes32 proofId) external view returns (Proof memory) {
        Proof memory proofRecord = _proofs[proofId];
        require(proofRecord.publisher != address(0), "OpenDataRegistry: unknown proof");
        return proofRecord;
    }

    function proofExists(bytes32 proofId) external view returns (bool) {
        return _proofs[proofId].publisher != address(0);
    }

    function statusOf(bytes32 proofId) external view returns (ProofStatus) {
        return _proofs[proofId].status;
    }

    function _stationKey(string memory stationId) private pure returns (bytes32) {
        return keccak256(bytes(stationId));
    }
}
