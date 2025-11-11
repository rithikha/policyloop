// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FundRegistry} from "../FundRegistry.sol";
import {ProgramModule_Base} from "./ProgramModule_Base.sol";

contract ProgramModule_Construction is ProgramModule_Base {
    uint256 public immutable maxPm25x10;

    constructor(FundRegistry registry_, uint256 programId_, uint256 maxPm25x10_)
        ProgramModule_Base(registry_, programId_)
    {
        maxPm25x10 = maxPm25x10_;
    }

    function _isEligible(EvaluationProof calldata proof) internal view override returns (bool) {
        return proof.pm25x10 <= maxPm25x10;
    }
}
