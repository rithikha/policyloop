// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FundRegistry} from "../FundRegistry.sol";
import {ProgramModule_Base} from "./ProgramModule_Base.sol";

contract ProgramModule_IoT is ProgramModule_Base {
    uint256 public immutable minCoveragePermille;
    uint256 public immutable bonusCoveragePermille;
    uint256 public immutable weeklyAllocationNTD;

    constructor(
        FundRegistry registry_,
        uint256 programId_,
        uint256 minCoveragePermille_,
        uint256 bonusCoveragePermille_,
        uint256 weeklyAllocationNTD_
    ) ProgramModule_Base(registry_, programId_) {
        require(minCoveragePermille_ > 0, "IoT:min coverage");
        require(bonusCoveragePermille_ >= minCoveragePermille_, "IoT:bonus < min");
        require(weeklyAllocationNTD_ > 0, "IoT:allocation");

        minCoveragePermille = minCoveragePermille_;
        bonusCoveragePermille = bonusCoveragePermille_;
        weeklyAllocationNTD = weeklyAllocationNTD_;
    }

    function _isEligible(EvaluationProof calldata proof) internal view override returns (bool) {
        return proof.coveragePermille > minCoveragePermille;
    }

    function _calculateAward(EvaluationProof calldata proof) internal view override returns (uint256) {
        if (proof.coveragePermille >= bonusCoveragePermille) {
            return weeklyAllocationNTD;
        }
        if (proof.coveragePermille <= minCoveragePermille) {
            return 0;
        }

        uint256 span = bonusCoveragePermille - minCoveragePermille;
        if (span == 0) {
            return weeklyAllocationNTD;
        }

        uint256 earned = proof.coveragePermille - minCoveragePermille;
        return (weeklyAllocationNTD * earned) / span;
    }
}
