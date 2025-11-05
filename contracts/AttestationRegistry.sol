// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PublisherRegistry.sol";
import "./OpenDataRegistry.sol";

/**
 * @title AttestationRegistry
 * @notice Collects reviewer attestations for published proofs. Once the configured threshold
 * (2-of-3 reviewers) is met the associated proof is marked as attested inside OpenDataRegistry.
 */
contract AttestationRegistry {
    enum Timeliness {
        Unknown,
        OnTime,
        SlightDelay,
        Late
    }

    struct Attestation {
        address reviewer;
        uint64 attestedAt;
        string note;
        Timeliness timeliness;
        bool marksAudited;
    }

    struct Summary {
        uint8 total;
        uint8 publicCount;
        uint8 ngoCount;
        bool audited;
        Timeliness timeliness;
    }

    uint8 public constant REQUIRED_ATTESTATIONS = 2;

    PublisherRegistry public immutable publisherRegistry;
    OpenDataRegistry public immutable openDataRegistry;
    uint8 private constant ROLE_REVIEWER = 2;
    uint8 private constant ROLE_AUDITOR = 4;

    mapping(bytes32 => Attestation[]) private _attestations;
    mapping(bytes32 => Summary) private _summaries;
    mapping(bytes32 => mapping(address => bool)) private _hasAttested;

    event Attested(bytes32 indexed proofId, address indexed reviewer, string note);

    constructor(PublisherRegistry registry, OpenDataRegistry dataRegistry) {
        require(address(registry) != address(0), "AttestationRegistry: registry required");
        require(address(dataRegistry) != address(0), "AttestationRegistry: data registry required");
        publisherRegistry = registry;
        openDataRegistry = dataRegistry;
    }

    function attest(
        bytes32 proofId,
        string calldata note,
        Timeliness timeliness,
        bool markAudited
    ) external {
        require(openDataRegistry.proofExists(proofId), "AttestationRegistry: unknown proof");
        require(
            publisherRegistry.hasRole(msg.sender, ROLE_REVIEWER),
            "AttestationRegistry: not reviewer"
        );
        require(!_hasAttested[proofId][msg.sender], "AttestationRegistry: already attested");

        OpenDataRegistry.ProofStatus status = openDataRegistry.statusOf(proofId);
        require(status != OpenDataRegistry.ProofStatus.Revoked, "AttestationRegistry: proof revoked");

        PublisherRegistry.ReviewerKind reviewerKind = publisherRegistry.reviewerKindOf(msg.sender);
        require(reviewerKind != PublisherRegistry.ReviewerKind.None, "AttestationRegistry: reviewer kind missing");

        Summary storage summary = _summaries[proofId];
        summary.total += 1;
        if (reviewerKind == PublisherRegistry.ReviewerKind.PublicSector) {
            summary.publicCount += 1;
        } else if (reviewerKind == PublisherRegistry.ReviewerKind.Ngo) {
            summary.ngoCount += 1;
        }

        if (timeliness != Timeliness.Unknown) {
            if (summary.timeliness == Timeliness.Unknown || uint8(timeliness) < uint8(summary.timeliness)) {
                summary.timeliness = timeliness;
            }
        }

        if (markAudited) {
            require(
                publisherRegistry.hasRole(msg.sender, ROLE_AUDITOR),
                "AttestationRegistry: no auditor role"
            );
            summary.audited = true;
        }

        _attestations[proofId].push(
            Attestation({
                reviewer: msg.sender,
                attestedAt: uint64(block.timestamp),
                note: note,
                timeliness: timeliness,
                marksAudited: markAudited
            })
        );
        _hasAttested[proofId][msg.sender] = true;

        emit Attested(proofId, msg.sender, note);

        if (summary.total >= REQUIRED_ATTESTATIONS && status == OpenDataRegistry.ProofStatus.Submitted) {
            openDataRegistry.markAttested(proofId);
        }
    }

    function isAttested(bytes32 proofId) external view returns (bool) {
        if (!openDataRegistry.proofExists(proofId)) {
            return false;
        }
        if (openDataRegistry.statusOf(proofId) == OpenDataRegistry.ProofStatus.Attested) {
            return true;
        }
        Summary storage summary = _summaries[proofId];
        return summary.total >= REQUIRED_ATTESTATIONS;
    }

    function getAttestations(bytes32 proofId) external view returns (Attestation[] memory) {
        return _attestations[proofId];
    }

    function getSummary(bytes32 proofId) external view returns (Summary memory) {
        return _summaries[proofId];
    }

    function hasAttested(bytes32 proofId, address reviewer) external view returns (bool) {
        return _hasAttested[proofId][reviewer];
    }
}
