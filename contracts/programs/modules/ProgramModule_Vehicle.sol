// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FundRegistry} from "../FundRegistry.sol";
import {ProgramModule_Base} from "./ProgramModule_Base.sol";

contract ProgramModule_Vehicle is ProgramModule_Base {
    uint256 public immutable minEventsProcessed;

    constructor(FundRegistry registry_, uint256 programId_, uint256 minEventsProcessed_)
        ProgramModule_Base(registry_, programId_)
    {
        minEventsProcessed = minEventsProcessed_;
    }

    function _isEligible(EvaluationProof calldata proof) internal view override returns (bool) {
        return proof.eventsProcessed >= minEventsProcessed;
    }
}
