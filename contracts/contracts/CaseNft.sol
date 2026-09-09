// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title CaseNft
/// @notice Minimal case credentials. Solver credentials are soulbound; backer
/// credentials are ordinary transferable ERC-721 tokens.
contract CaseNft is ERC721, Ownable {
    enum Kind {
        Solver,
        Backer
    }

    struct TokenData {
        Kind kind;
        bytes32 caseId;
        uint40 mintedAt;
    }

    address public solverMinter;
    address public backerMinter;
    uint256 private nextTokenId = 1;

    mapping(uint256 => TokenData) private tokenData;
    mapping(bytes32 => bool) public solverMintedForCase;
    mapping(bytes32 => bool) public backerMintedForCase;

    event SolverMinterSet(address indexed minter);
    event BackerMinterSet(address indexed minter);
    event CaseCredentialMinted(uint256 indexed tokenId, bytes32 indexed caseId, Kind kind, address indexed recipient);

    error NotSolverMinter();
    error NotBackerMinter();
    error MinterAlreadySet();
    error ZeroAddress();
    error CredentialAlreadyMinted();
    error SoulboundToken();

    constructor(address admin) ERC721("Conflict as a Bug Case Credential", "CAB") Ownable(admin) {
        if (admin == address(0)) revert ZeroAddress();
    }

    function setSolverMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        if (solverMinter != address(0)) revert MinterAlreadySet();
        solverMinter = minter;
        emit SolverMinterSet(minter);
    }

    function setBackerMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        if (backerMinter != address(0)) revert MinterAlreadySet();
        backerMinter = minter;
        emit BackerMinterSet(minter);
    }

    function mintSolver(address recipient, bytes32 caseId) external returns (uint256) {
        if (msg.sender != solverMinter) revert NotSolverMinter();
        if (solverMintedForCase[caseId]) revert CredentialAlreadyMinted();
        solverMintedForCase[caseId] = true;
        return _mintCredential(recipient, caseId, Kind.Solver);
    }

    function mintBacker(address recipient, bytes32 caseId) external returns (uint256) {
        if (msg.sender != backerMinter) revert NotBackerMinter();
        if (backerMintedForCase[caseId]) revert CredentialAlreadyMinted();
        backerMintedForCase[caseId] = true;
        return _mintCredential(recipient, caseId, Kind.Backer);
    }

    function getTokenData(uint256 tokenId) external view returns (TokenData memory) {
        _requireOwned(tokenId);
        return tokenData[tokenId];
    }

    function _mintCredential(address recipient, bytes32 caseId, Kind kind) private returns (uint256 tokenId) {
        if (recipient == address(0)) revert ZeroAddress();
        tokenId = nextTokenId++;
        tokenData[tokenId] = TokenData({kind: kind, caseId: caseId, mintedAt: uint40(block.timestamp)});
        _mint(recipient, tokenId);
        emit CaseCredentialMinted(tokenId, caseId, kind, recipient);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && tokenData[tokenId].kind == Kind.Solver) {
            revert SoulboundToken();
        }
        return super._update(to, tokenId, auth);
    }
}
