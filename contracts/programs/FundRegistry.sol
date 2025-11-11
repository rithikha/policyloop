// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FundRegistry
/// @notice Registers Taipei AQI Fund programs and tracks how much of each cap has been spent.
contract FundRegistry {
    struct Program {
        uint256 capNTD;
        uint256 spentNTD;
        address module;
    }

    event ProgramRegistered(uint256 indexed programId, address indexed module, uint256 capNTD);
    event ProgramSpent(uint256 indexed programId, uint256 totalSpentNTD);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error OnlyOwner();
    error InvalidModule();
    error InvalidCap();
    error ProgramExists();
    error ProgramUnknown();
    error OnlyModule(uint256 programId);
    error CapExceeded(uint256 programId, uint256 capNTD, uint256 attemptedSpent);

    mapping(uint256 => Program) private programs;
    address public owner;

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidModule();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function registerProgram(uint256 programId, address module, uint256 capNTD) external onlyOwner {
        if (module == address(0)) revert InvalidModule();
        if (capNTD == 0) revert InvalidCap();
        Program storage program = programs[programId];
        if (program.module != address(0)) revert ProgramExists();

        program.capNTD = capNTD;
        program.spentNTD = 0;
        program.module = module;
        emit ProgramRegistered(programId, module, capNTD);
    }

    function capOf(uint256 programId) external view returns (uint256) {
        Program storage program = programs[programId];
        if (program.module == address(0)) revert ProgramUnknown();
        return program.capNTD;
    }

    function spentOf(uint256 programId) external view returns (uint256) {
        Program storage program = programs[programId];
        if (program.module == address(0)) revert ProgramUnknown();
        return program.spentNTD;
    }

    function moduleOf(uint256 programId) external view returns (address) {
        Program storage program = programs[programId];
        if (program.module == address(0)) revert ProgramUnknown();
        return program.module;
    }

    function increaseSpent(uint256 programId, uint256 amountNTD) external returns (uint256) {
        if (amountNTD == 0) revert InvalidCap();
        Program storage program = programs[programId];
        address module = program.module;
        if (module == address(0)) revert ProgramUnknown();
        if (module != msg.sender) revert OnlyModule(programId);

        uint256 newTotal = program.spentNTD + amountNTD;
        if (newTotal > program.capNTD) revert CapExceeded(programId, program.capNTD, newTotal);

        program.spentNTD = newTotal;
        emit ProgramSpent(programId, newTotal);
        return newTotal;
    }
}
