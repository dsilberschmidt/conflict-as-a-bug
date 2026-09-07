// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title CaseRegistry
/// @notice Lightweight on-chain source of truth for which CAB cases exist to
/// solvers and what status they're in. Stores a state hash (linking to the
/// off-chain content in Upstash) plus a status enum per case. Block
/// timestamps provide the date; no content lives on-chain.
///
/// PROVISIONAL: every transition below is gated by a single `backendSigner`
/// key, standing in for the real design — each party signing their own
/// consent via a Privy wallet. This whole contract is the minimum-path
/// version; Privy-based per-party signing is deferred to the bonus phase.
contract CaseRegistry {
    enum Status {
        None,
        Opened,
        Closed,
        Solved
    }

    struct CaseState {
        bytes32 stateHash;
        Status status;
        uint40 lastUpdatedAt;
    }

    address public backendSigner;

    mapping(bytes32 => CaseState) private cases;

    event CaseOpened(bytes32 indexed caseId, bytes32 stateHash, uint256 timestamp);
    event CaseClosed(bytes32 indexed caseId, uint256 timestamp);
    event CaseSolved(bytes32 indexed caseId, uint256 timestamp);
    event BackendSignerUpdated(address indexed previousSigner, address indexed newSigner);

    error NotBackendSigner();
    error CaseAlreadyExists();
    error CaseNotFound();
    error InvalidTransition();
    error ZeroAddress();

    modifier onlyBackendSigner() {
        if (msg.sender != backendSigner) revert NotBackendSigner();
        _;
    }

    constructor(address initialBackendSigner) {
        if (initialBackendSigner == address(0)) revert ZeroAddress();
        backendSigner = initialBackendSigner;
    }

    /// @notice Rotates the backend signer key.
    function setBackendSigner(address newSigner) external onlyBackendSigner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit BackendSignerUpdated(backendSigner, newSigner);
        backendSigner = newSigner;
    }

    /// @notice Opens a case to solvers.
    /// Real design: both parties consent independently (Privy, bonus phase).
    /// PROVISIONAL: a single backend signer call stands in for that dual consent.
    function openCase(bytes32 caseId, bytes32 stateHash) external onlyBackendSigner {
        if (cases[caseId].status != Status.None) revert CaseAlreadyExists();

        cases[caseId] = CaseState({
            stateHash: stateHash,
            status: Status.Opened,
            lastUpdatedAt: uint40(block.timestamp)
        });

        emit CaseOpened(caseId, stateHash, block.timestamp);
    }

    /// @notice Closes a case to new solver contributions.
    /// Real design: either party alone can request this.
    /// PROVISIONAL: enforced off-chain by the backend before calling this,
    /// since only the backend signer can call it.
    function closeCase(bytes32 caseId) external onlyBackendSigner {
        CaseState storage current = cases[caseId];

        if (current.status == Status.None) revert CaseNotFound();
        if (current.status != Status.Opened) revert InvalidTransition();

        current.status = Status.Closed;
        current.lastUpdatedAt = uint40(block.timestamp);

        emit CaseClosed(caseId, block.timestamp);
    }

    /// @notice Marks a case solved. Independent of closing — a case can be
    /// solved while still open, or after being closed.
    /// Real design: requires both parties to confirm.
    /// PROVISIONAL: the backend calls this only after its own off-chain store
    /// has recorded both confirmations.
    function solveCase(bytes32 caseId) external onlyBackendSigner {
        CaseState storage current = cases[caseId];

        if (current.status == Status.None) revert CaseNotFound();
        if (current.status == Status.Solved) revert InvalidTransition();

        current.status = Status.Solved;
        current.lastUpdatedAt = uint40(block.timestamp);

        emit CaseSolved(caseId, block.timestamp);
    }

    /// @notice Reads a case's on-chain state. Returns the zero value
    /// (status == None) for a caseId that was never opened.
    function getCase(bytes32 caseId) external view returns (CaseState memory) {
        return cases[caseId];
    }
}
