// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PublisherRegistry
 * @notice Maintains allowlisted accounts and their roles for publishers, reviewers, and auditors.
 * An on-chain admin (contract owner) curates membership; other contracts read the registry
 * to authorise operations.
 */
contract PublisherRegistry {
    enum ReviewerKind {
        None,
        PublicSector,
        Ngo
    }

    uint8 public constant ROLE_PUBLISHER = 1;
    uint8 public constant ROLE_REVIEWER = 2;
    uint8 public constant ROLE_AUDITOR = 4;

    struct Member {
        bool exists;
        bool active;
        string label;
        uint8 roles;
        ReviewerKind reviewerKind;
    }

    address private _owner;
    mapping(address => Member) private _members;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MemberUpserted(
        address indexed account,
        string label,
        uint8 roles,
        ReviewerKind reviewerKind,
        bool active
    );
    event MemberDeactivated(address indexed account);

    modifier onlyOwner() {
        require(msg.sender == _owner, "PublisherRegistry: not owner");
        _;
    }

    constructor() {
        _transferOwnership(msg.sender);
    }

    function owner() external view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PublisherRegistry: zero owner");
        _transferOwnership(newOwner);
    }

    function upsertMember(
        address account,
        string calldata label,
        uint8 roles,
        ReviewerKind reviewerKind,
        bool active
    ) external onlyOwner {
        require(account != address(0), "PublisherRegistry: zero address");
        require(bytes(label).length > 0, "PublisherRegistry: label required");
        require(roles != 0, "PublisherRegistry: roles required");

        if (reviewerKind != ReviewerKind.None) {
            require((roles & ROLE_REVIEWER) != 0, "PublisherRegistry: reviewer kind without role");
        }

        Member storage member = _members[account];
        member.exists = true;
        member.label = label;
        member.roles = roles;
        member.reviewerKind = reviewerKind;
        member.active = active;

        emit MemberUpserted(account, label, roles, reviewerKind, active);
    }

    function deactivate(address account) external onlyOwner {
        Member storage member = _members[account];
        require(member.exists, "PublisherRegistry: unknown");
        if (member.active) {
            member.active = false;
            emit MemberDeactivated(account);
        }
    }

    function getMember(
        address account
    ) external view returns (bool active, string memory label, uint8 roles, ReviewerKind reviewerKind) {
        Member storage member = _members[account];
        require(member.exists, "PublisherRegistry: unknown");
        return (member.active, member.label, member.roles, member.reviewerKind);
    }

    function isActive(address account) external view returns (bool) {
        Member storage member = _members[account];
        return member.exists && member.active;
    }

    function hasRole(address account, uint8 role) external view returns (bool) {
        Member storage member = _members[account];
        return member.exists && member.active && (member.roles & role) != 0;
    }

    function reviewerKindOf(address account) external view returns (ReviewerKind) {
        Member storage member = _members[account];
        if (!member.exists || !member.active || (member.roles & ROLE_REVIEWER) == 0) {
            return ReviewerKind.None;
        }
        return member.reviewerKind;
    }

    function memberExists(address account) external view returns (bool) {
        return _members[account].exists;
    }

    function _transferOwnership(address newOwner) private {
        address previous = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }
}
