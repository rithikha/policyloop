// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOpenDataRegistry {
    function getProof(bytes32 proofId)
        external
        view
        returns (bytes32, bytes32, address, uint64, string memory, string memory, string memory, uint8);
}

/// @notice Minimal adapter that exposes Phase-1 proof data to Phase-2 scripts.
contract PolicyDataViewAdapter {
    IOpenDataRegistry public immutable openDataRegistry;

    constructor(address openDataRegistry_) {
        require(openDataRegistry_ != address(0), "Invalid ODR address");
        openDataRegistry = IOpenDataRegistry(openDataRegistry_);
    }

    function getProof(bytes32 proofId)
        external
        view
        returns (bytes32, bytes32, address, uint64, string memory, string memory, string memory, uint8)
    {
        return openDataRegistry.getProof(proofId);
    }
}
