// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./CaseRegistry.sol";
import "./CaseNft.sol";
import "./Resolution.sol";

/// @title Backing
/// @notice Holds the fixed, one-shot post-resolution backing transaction.
contract Backing {
    struct Approval {
        bytes32 ideaHash;
        address solver;
        address recipient;
        bool approved;
    }

    CaseRegistry public immutable registry;
    Resolution public immutable resolution;
    CaseNft public immutable caseNft;
    address public immutable auditor;
    uint256 public immutable fixedContributionWei;

    mapping(bytes32 => Approval) private approvals;
    mapping(bytes32 => address) public backerOf;

    event BackingApproved(bytes32 indexed caseId, bytes32 indexed ideaHash, address indexed solver, address recipient);
    event Backed(bytes32 indexed caseId, address indexed backer, address indexed recipient, uint256 amount);

    error NotAuditor();
    error ZeroAddress();
    error ZeroContribution();
    error IdeaNotEligible();
    error IdeaMismatch();
    error CaseNotResolved();
    error IncorrectContribution();
    error BackerAlreadyExists();
    error IneligibleBacker();
    error TransferFailed();

    modifier onlyAuditor() {
        if (msg.sender != auditor) revert NotAuditor();
        _;
    }

    constructor(
        address registryAddress,
        address resolutionAddress,
        address caseNftAddress,
        address auditorAddress,
        uint256 contributionWei
    ) {
        if (registryAddress == address(0) || resolutionAddress == address(0) || caseNftAddress == address(0) || auditorAddress == address(0)) {
            revert ZeroAddress();
        }
        if (contributionWei == 0) revert ZeroContribution();
        registry = CaseRegistry(registryAddress);
        resolution = Resolution(resolutionAddress);
        caseNft = CaseNft(caseNftAddress);
        auditor = auditorAddress;
        fixedContributionWei = contributionWei;
    }

    function approve(bytes32 caseId, bytes32 ideaHash, address solver) external onlyAuditor {
        Resolution.Idea memory idea = resolution.getIdea(caseId);
        if (!idea.active || !idea.seeksBackers) revert IdeaNotEligible();
        if (idea.ideaHash != ideaHash || idea.solver != solver) revert IdeaMismatch();

        (address partyA, address partyB) = registry.getParties(caseId);
        address recipient = (uint256(caseId) & 1) == 0 ? partyA : partyB;
        approvals[caseId] = Approval({ideaHash: ideaHash, solver: solver, recipient: recipient, approved: true});
        emit BackingApproved(caseId, ideaHash, solver, recipient);
    }

    function back(bytes32 caseId) external payable {
        if (msg.value != fixedContributionWei) revert IncorrectContribution();
        if (backerOf[caseId] != address(0)) revert BackerAlreadyExists();

        Resolution.Idea memory idea = resolution.getIdea(caseId);
        if (!idea.resolved) revert CaseNotResolved();
        Approval memory approval = approvals[caseId];
        if (!approval.approved || approval.ideaHash != idea.ideaHash || approval.solver != idea.solver) {
            revert IdeaMismatch();
        }

        (address partyA, address partyB) = registry.getParties(caseId);
        if (msg.sender == partyA || msg.sender == partyB || msg.sender == idea.solver) revert IneligibleBacker();

        backerOf[caseId] = msg.sender;
        (bool sent,) = approval.recipient.call{value: msg.value}("");
        if (!sent) revert TransferFailed();
        caseNft.mintBacker(msg.sender, caseId);
        emit Backed(caseId, msg.sender, approval.recipient, msg.value);
    }

    function getApproval(bytes32 caseId) external view returns (Approval memory) {
        return approvals[caseId];
    }
}
