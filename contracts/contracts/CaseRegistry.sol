// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title CaseRegistry
/// @notice Lightweight on-chain source of truth for which CAB cases exist to
/// solvers and what status they're in. Stores a state hash (linking to the
/// off-chain content in Upstash) plus a status enum per case. Block
/// timestamps provide the date; no content lives on-chain.
///
/// Opening a case requires two independent ECDSA signatures (one per party)
/// over the same stateHash. The backend relays each signature as a
/// meta-transaction — see consentToOpen for details.
///
contract CaseRegistry {
    enum Status {
        None,
        PendingConsent,
        Opened,
        Closed,
        Solved
    }

    struct CaseState {
        bytes32 stateHash;
        Status status;
        uint40 lastUpdatedAt;
        address firstConsentSigner;
        address secondConsentSigner;
    }

    address public backendSigner;
    address public resolutionContract;

    mapping(bytes32 => CaseState) private cases;

    event CasePendingConsent(bytes32 indexed caseId, bytes32 stateHash, address indexed firstSigner, uint256 timestamp);
    event CaseOpened(bytes32 indexed caseId, bytes32 stateHash, uint256 timestamp);
    event CaseClosed(bytes32 indexed caseId, uint256 timestamp);
    event CaseSolved(bytes32 indexed caseId, uint256 timestamp);
    event BackendSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event ResolutionContractSet(address indexed resolutionContract);

    error NotBackendSigner();
    error CaseAlreadyExists();
    error CaseNotFound();
    error InvalidTransition();
    error ZeroAddress();
    error ConsentHashMismatch();
    error DuplicateConsentSigner();
    error NotResolutionContract();
    error ResolutionContractAlreadySet();

    modifier onlyBackendSigner() {
        if (msg.sender != backendSigner) revert NotBackendSigner();
        _;
    }

    modifier onlyResolutionContract() {
        if (msg.sender != resolutionContract) revert NotResolutionContract();
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

    /// @notice Sets the one Resolution contract allowed to mark cases solved.
    /// This configuration is intentionally immutable after setup.
    function setResolutionContract(address newResolutionContract) external onlyBackendSigner {
        if (newResolutionContract == address(0)) revert ZeroAddress();
        if (resolutionContract != address(0)) revert ResolutionContractAlreadySet();

        resolutionContract = newResolutionContract;
        emit ResolutionContractSet(newResolutionContract);
    }

    /// @notice Records one party's consent to open a case, identified by their
    /// ECDSA signature (personal_sign / EIP-191) over
    /// keccak256(abi.encodePacked(caseId, stateHash)).
    ///
    /// PROVISIONAL meta-transaction: this function is called by the backend
    /// signer on behalf of each party. Privy embedded wallets have no ETH at
    /// creation and cannot pay gas directly; the backend relays each party's
    /// off-chain signature. Real per-party gas abstraction is deferred to the
    /// bonus phase.
    ///
    /// State machine for opening:
    ///   None → (first valid sig)                                 → PendingConsent
    ///   PendingConsent → (second valid sig, distinct signer, same hash) → Opened
    function consentToOpen(
        bytes32 caseId,
        bytes32 stateHash,
        bytes calldata signature
    ) external onlyBackendSigner {
        bytes32 messageHash = keccak256(abi.encodePacked(caseId, stateHash));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address consentSigner = ECDSA.recover(ethSignedHash, signature);

        CaseState storage current = cases[caseId];

        if (current.status == Status.None) {
            current.stateHash = stateHash;
            current.status = Status.PendingConsent;
            current.lastUpdatedAt = uint40(block.timestamp);
            current.firstConsentSigner = consentSigner;
            emit CasePendingConsent(caseId, stateHash, consentSigner, block.timestamp);
        } else if (current.status == Status.PendingConsent) {
            if (current.stateHash != stateHash) revert ConsentHashMismatch();
            if (consentSigner == current.firstConsentSigner) revert DuplicateConsentSigner();
            current.status = Status.Opened;
            current.lastUpdatedAt = uint40(block.timestamp);
            current.secondConsentSigner = consentSigner;
            emit CaseOpened(caseId, stateHash, block.timestamp);
        } else {
            revert CaseAlreadyExists();
        }
    }

    /// @notice Closes a case to new solver contributions.
    /// PROVISIONAL: enforced off-chain by the backend before calling this.
    function closeCase(bytes32 caseId) external onlyBackendSigner {
        CaseState storage current = cases[caseId];

        if (current.status == Status.None || current.status == Status.PendingConsent) revert CaseNotFound();
        if (current.status != Status.Opened) revert InvalidTransition();

        current.status = Status.Closed;
        current.lastUpdatedAt = uint40(block.timestamp);

        emit CaseClosed(caseId, block.timestamp);
    }

    /// @notice Marks an opened case solved from Resolution's second valid
    /// party signature. This is the sole path to Solved.
    function markSolvedFromResolution(bytes32 caseId) external onlyResolutionContract {
        CaseState storage current = cases[caseId];

        if (current.status == Status.None || current.status == Status.PendingConsent) revert CaseNotFound();
        if (current.status != Status.Opened) revert InvalidTransition();

        current.status = Status.Solved;
        current.lastUpdatedAt = uint40(block.timestamp);

        emit CaseSolved(caseId, block.timestamp);
    }

    /// @notice Reads a case's on-chain state. Returns the zero value
    /// (status == None) for a caseId that was never seen.
    function getCase(bytes32 caseId) external view returns (CaseState memory) {
        return cases[caseId];
    }

    /// @notice Returns the two opening wallets in canonical ascending order.
    function getParties(bytes32 caseId) external view returns (address first, address second) {
        CaseState memory current = cases[caseId];
        if (current.status == Status.None || current.status == Status.PendingConsent) revert CaseNotFound();

        first = current.firstConsentSigner;
        second = current.secondConsentSigner;
        if (uint160(first) > uint160(second)) (first, second) = (second, first);
    }
}
