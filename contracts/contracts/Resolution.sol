// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import "./CaseRegistry.sol";
import "./CaseNft.sol";

/// @title Resolution
/// @notice Registers the one solver idea for a case and verifies the two
/// opening parties' EIP-191 resolution signatures.
contract Resolution {
    bytes32 public constant RESOLVED_ACTION = keccak256("resolved");

    struct Idea {
        bytes32 ideaHash;
        address solver;
        bool seeksBackers;
        address firstResolutionSigner;
        bool active;
        bool resolved;
    }

    CaseRegistry public immutable registry;
    CaseNft public immutable caseNft;
    address public immutable backendSigner;

    mapping(bytes32 => Idea) private ideas;
    mapping(bytes32 => mapping(address => bool)) public rejectedSolver;

    event IdeaRegistered(bytes32 indexed caseId, bytes32 indexed ideaHash, address indexed solver, bool seeksBackers);
    event IdeaRejected(bytes32 indexed caseId, address indexed solver);
    event ResolutionFirstSigned(bytes32 indexed caseId, address indexed signer);
    event CaseResolved(bytes32 indexed caseId, bytes32 indexed ideaHash, address indexed solver);

    error NotBackendSigner();
    error ZeroAddress();
    error EmptyIdeaHash();
    error CaseNotOpened();
    error NoActiveIdea();
    error IdeaAlreadyActive();
    error SolverIsParty();
    error SolverRejected();
    error ResolutionAlreadyStarted();
    error ResolutionAlreadyComplete();
    error IdeaMismatch();
    error NotCaseParty();
    error DuplicateResolutionSigner();

    modifier onlyBackendSigner() {
        if (msg.sender != backendSigner) revert NotBackendSigner();
        _;
    }

    constructor(address registryAddress, address caseNftAddress, address relayBackendSigner) {
        if (registryAddress == address(0) || caseNftAddress == address(0) || relayBackendSigner == address(0)) {
            revert ZeroAddress();
        }
        registry = CaseRegistry(registryAddress);
        caseNft = CaseNft(caseNftAddress);
        backendSigner = relayBackendSigner;
    }

    function registerIdea(bytes32 caseId, bytes32 ideaHash, address solver, bool seeksBackers) external onlyBackendSigner {
        if (ideaHash == bytes32(0)) revert EmptyIdeaHash();
        if (solver == address(0)) revert ZeroAddress();
        CaseRegistry.CaseState memory caseState = registry.getCase(caseId);
        if (caseState.status != CaseRegistry.Status.Opened) revert CaseNotOpened();

        (address partyA, address partyB) = registry.getParties(caseId);
        if (solver == partyA || solver == partyB) revert SolverIsParty();
        if (rejectedSolver[caseId][solver]) revert SolverRejected();
        if (ideas[caseId].active) revert IdeaAlreadyActive();

        ideas[caseId] = Idea({
            ideaHash: ideaHash,
            solver: solver,
            seeksBackers: seeksBackers,
            firstResolutionSigner: address(0),
            active: true,
            resolved: false
        });
        emit IdeaRegistered(caseId, ideaHash, solver, seeksBackers);
    }

    function rejectIdea(bytes32 caseId) external onlyBackendSigner {
        Idea storage idea = ideas[caseId];
        if (!idea.active) revert NoActiveIdea();
        if (idea.firstResolutionSigner != address(0)) revert ResolutionAlreadyStarted();

        rejectedSolver[caseId][idea.solver] = true;
        emit IdeaRejected(caseId, idea.solver);
        delete ideas[caseId];
    }

    function resolve(bytes32 caseId, bytes32 ideaHash, address solver, bytes calldata signature) external onlyBackendSigner {
        Idea storage idea = ideas[caseId];
        if (!idea.active) revert NoActiveIdea();
        if (idea.resolved) revert ResolutionAlreadyComplete();
        if (idea.ideaHash != ideaHash || idea.solver != solver) revert IdeaMismatch();
        CaseRegistry.CaseState memory caseState = registry.getCase(caseId);
        if (caseState.status != CaseRegistry.Status.Opened) revert CaseNotOpened();

        bytes32 messageHash = keccak256(
            abi.encode(block.chainid, address(this), caseId, ideaHash, solver, RESOLVED_ACTION)
        );
        address signer = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(messageHash), signature);
        (address partyA, address partyB) = registry.getParties(caseId);
        if (signer != partyA && signer != partyB) revert NotCaseParty();

        if (idea.firstResolutionSigner == address(0)) {
            idea.firstResolutionSigner = signer;
            emit ResolutionFirstSigned(caseId, signer);
            return;
        }
        if (signer == idea.firstResolutionSigner) revert DuplicateResolutionSigner();

        idea.resolved = true;
        registry.markSolvedFromResolution(caseId);
        caseNft.mintSolver(solver, caseId);
        emit CaseResolved(caseId, ideaHash, solver);
    }

    function getIdea(bytes32 caseId) external view returns (Idea memory) {
        return ideas[caseId];
    }

    function isResolved(bytes32 caseId) external view returns (bool) {
        return ideas[caseId].resolved;
    }
}
