// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OpenDataRegistry.sol";
import "./AttestationRegistry.sol";

/**
 * @title PolicyDataView
 * @notice Read-only helper that aggregates the open data registry and attestation registry
 * to expose trust scores and tiers used by downstream policy checks.
 */
contract PolicyDataView {
    enum TrustTier {
        None,
        Submitted,
        Attested,
        EligibleForPolicy,
        Audited,
        Revoked
    }

    uint256 private constant PUBLIC_REVIEWER_WEIGHT = 35;
    uint256 private constant NGO_REVIEWER_WEIGHT = 25;
    uint256 private constant ON_TIME_WEIGHT = 15;
    uint256 private constant SLIGHT_DELAY_WEIGHT = 5;
    uint256 private constant AUDITED_WEIGHT = 20;
    uint256 private constant MAX_TRUST_SCORE = 100;

    OpenDataRegistry public immutable openDataRegistry;
    AttestationRegistry public immutable attestationRegistry;

    constructor(OpenDataRegistry dataRegistry, AttestationRegistry attestRegistry) {
        require(address(dataRegistry) != address(0), "PolicyDataView: data registry required");
        require(address(attestRegistry) != address(0), "PolicyDataView: attestation registry required");
        openDataRegistry = dataRegistry;
        attestationRegistry = attestRegistry;
    }

    function latestAttestedProof(string calldata stationId) external view returns (bytes32) {
        return openDataRegistry.getLatestAttestedProof(stationId);
    }

    function readProof(
        bytes32 proofId
    ) external view returns (OpenDataRegistry.Proof memory proof, OpenDataRegistry.Revocation memory revocation) {
        proof = openDataRegistry.proof(proofId);
        revocation = openDataRegistry.revocation(proofId);
    }

    function trustScore(bytes32 proofId) public view returns (uint256) {
        AttestationRegistry.Summary memory summary = attestationRegistry.getSummary(proofId);
        uint256 score = 0;
        score += uint256(summary.publicCount) * PUBLIC_REVIEWER_WEIGHT;
        score += uint256(summary.ngoCount) * NGO_REVIEWER_WEIGHT;

        if (summary.timeliness == AttestationRegistry.Timeliness.OnTime) {
            score += ON_TIME_WEIGHT;
        } else if (summary.timeliness == AttestationRegistry.Timeliness.SlightDelay) {
            score += SLIGHT_DELAY_WEIGHT;
        }

        if (summary.audited) {
            score += AUDITED_WEIGHT;
        }

        if (score > MAX_TRUST_SCORE) {
            score = MAX_TRUST_SCORE;
        }

        return score;
    }

    function trustTier(bytes32 proofId) external view returns (TrustTier) {
        OpenDataRegistry.ProofStatus status = openDataRegistry.statusOf(proofId);
        if (status == OpenDataRegistry.ProofStatus.None) {
            return TrustTier.None;
        }

        if (status == OpenDataRegistry.ProofStatus.Revoked) {
            return TrustTier.Revoked;
        }

        if (status == OpenDataRegistry.ProofStatus.Submitted) {
            return TrustTier.Submitted;
        }

        AttestationRegistry.Summary memory summary = attestationRegistry.getSummary(proofId);
        uint256 score = trustScore(proofId);

        if (summary.audited) {
            return TrustTier.Audited;
        }

        if (score >= 70 && summary.publicCount >= 1 && summary.ngoCount >= 1) {
            return TrustTier.EligibleForPolicy;
        }

        return TrustTier.Attested;
    }
}
