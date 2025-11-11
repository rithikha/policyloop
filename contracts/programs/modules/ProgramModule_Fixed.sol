// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FundRegistry} from "../FundRegistry.sol";
import {ProgramModule_Base} from "./ProgramModule_Base.sol";

contract ProgramModule_Fixed is ProgramModule_Base {
    uint256 public immutable minCemsValidPermille;

    constructor(FundRegistry registry_, uint256 programId_, uint256 minCemsValidPermille_)
        ProgramModule_Base(registry_, programId_)
    {
        minCemsValidPermille = minCemsValidPermille_;
    }

    function _isEligible(EvaluationProof calldata proof) internal view override returns (bool) {
        return proof.cemsValidPermille >= minCemsValidPermille;
    }
}
