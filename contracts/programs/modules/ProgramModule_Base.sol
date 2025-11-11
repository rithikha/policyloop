// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FundRegistry} from "../FundRegistry.sol";

/// @notice Shared logic for Taipei AQI Fund program modules.
abstract contract ProgramModule_Base {
    struct EvaluationProof {
        bytes32 proofId;
        address recipient;
        uint256 amountNTD;
        uint256 coveragePermille;
        uint256 eventsProcessed;
        uint256 cemsValidPermille;
        uint256 pm25x10;
    }

    event EligibilityIssued(
        uint256 indexed programId,
        bytes32 indexed proofId,
        address indexed recipient,
        uint256 amountNTD
    );
    event PayoutExecuted(
        uint256 indexed programId,
        bytes32 indexed proofId,
        address indexed recipient,
        uint256 amountNTD
    );

    error InvalidRecipient();
    error InvalidAmount();
    error ProofAlreadyConsumed(bytes32 proofId);
    error NotEligible(bytes32 proofId);

    FundRegistry public immutable registry;
    uint256 public immutable programId;

    mapping(bytes32 => bool) private consumedProof;

    constructor(FundRegistry registry_, uint256 programId_) {
        registry = registry_;
        programId = programId_;
    }

    function evaluate(EvaluationProof calldata proof) external returns (bool) {
        if (proof.recipient == address(0)) revert InvalidRecipient();
        if (consumedProof[proof.proofId]) revert ProofAlreadyConsumed(proof.proofId);
        if (!_isEligible(proof)) revert NotEligible(proof.proofId);

        uint256 payoutAmount = _calculateAward(proof);
        if (payoutAmount == 0) revert InvalidAmount();

        consumedProof[proof.proofId] = true;

        emit EligibilityIssued(programId, proof.proofId, proof.recipient, payoutAmount);
        registry.increaseSpent(programId, payoutAmount);
        emit PayoutExecuted(programId, proof.proofId, proof.recipient, payoutAmount);

        return true;
    }

    function hasConsumed(bytes32 proofId) external view returns (bool) {
        return consumedProof[proofId];
    }

    function _isEligible(EvaluationProof calldata proof) internal view virtual returns (bool);

    function _calculateAward(EvaluationProof calldata proof) internal view virtual returns (uint256) {
        return proof.amountNTD;
    }
}
