
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract PokemonCard is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(uint256 => string) public pokemonType;
    mapping(uint256 => string) public rarity;
    
    // Token enumeration functionality
    // Mapping from owner to list of owned token IDs
    mapping(address => mapping(uint256 => uint256)) private _ownedTokens;
    // Mapping from token ID to index of the owner tokens list
    mapping(uint256 => uint256) private _ownedTokensIndex;
    // Array with all token ids
    uint256[] private _allTokens;
    // Mapping from token id to position in the allTokens array
    mapping(uint256 => uint256) private _allTokensIndex;

    // Events
    event CardMinted(uint256 tokenId, address recipient, string tokenType, string tokenRarity);
    
    // Admin role for managing the contract
    address private _admin;
    
    // Circuit breaker pattern
    bool private _emergencyStop;
    
    modifier notEmergency() {
        require(!_emergencyStop, "Contract is in emergency stop mode");
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == _admin, "Caller is not the admin");
        _;
    }
    
    constructor() ERC721("PokemonCard", "PKMN") {
        _admin = msg.sender;
    }
    
    // Override functions for ERC721URIStorage
    function _burn(uint256 tokenId) internal override {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    // Implementation of tokenOfOwnerByIndex which is needed for the frontend
    function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
        require(index < balanceOf(owner), "Owner index out of bounds");
        return _ownedTokens[owner][index];
    }
    
    // Track token ownership for enumeration
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // When minting a token
        if (from == address(0)) {
            _addTokenToAllTokensEnumeration(tokenId);
            _addTokenToOwnerEnumeration(to, tokenId);
        } 
        // When burning a token
        else if (to == address(0)) {
            _removeTokenFromOwnerEnumeration(from, tokenId);
            _removeTokenFromAllTokensEnumeration(tokenId);
        } 
        // When transferring a token
        else if (from != to) {
            _removeTokenFromOwnerEnumeration(from, tokenId);
            _addTokenToOwnerEnumeration(to, tokenId);
        }
    }
    
    // Add a token to a specific owner's enumeration
    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        uint256 length = balanceOf(to);
        _ownedTokens[to][length] = tokenId;
        _ownedTokensIndex[tokenId] = length;
    }
    
    // Add a token to the allTokens enumeration
    function _addTokenToAllTokensEnumeration(uint256 tokenId) private {
        _allTokensIndex[tokenId] = _allTokens.length;
        _allTokens.push(tokenId);
    }
    
    // Remove a token from an owner's enumeration
    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
        uint256 lastTokenIndex = balanceOf(from) - 1;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];
        
        // If the token to delete is not the last one, move the last token to the slot of the token to delete
        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];
            
            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }
        
        // Delete the last slot
        delete _ownedTokensIndex[tokenId];
        delete _ownedTokens[from][lastTokenIndex];
    }
    
    // Remove a token from the allTokens enumeration
    function _removeTokenFromAllTokensEnumeration(uint256 tokenId) private {
        uint256 lastTokenIndex = _allTokens.length - 1;
        uint256 tokenIndex = _allTokensIndex[tokenId];
        uint256 lastTokenId = _allTokens[lastTokenIndex];
        
        _allTokens[tokenIndex] = lastTokenId;
        _allTokensIndex[lastTokenId] = tokenIndex;
        
        delete _allTokensIndex[tokenId];
        _allTokens.pop();
    }
    
    // Emergency functions
    function toggleEmergencyStop() external onlyOwner {
        _emergencyStop = !_emergencyStop;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Admin management
    function setAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "Invalid admin address");
        _admin = newAdmin;
    }
    
    // Card minting function
    function mintCard(
        address recipient,
        string memory uri,
        string memory _type,
        string memory _rarity
    ) public onlyOwner whenNotPaused nonReentrant returns (uint256) {
        require(recipient != address(0), "Cannot mint to zero address");
        require(bytes(uri).length > 0, "Token URI cannot be empty");
        require(bytes(_type).length > 0, "Type cannot be empty");
        require(bytes(_rarity).length > 0, "Rarity cannot be empty");
        
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();

        _mint(recipient, newItemId);
        _setTokenURI(newItemId, uri);

        pokemonType[newItemId] = _type;
        rarity[newItemId] = _rarity;
        
        emit CardMinted(newItemId, recipient, _type, _rarity);

        return newItemId;
    }
    
    // Allow users to mint their own cards (optional feature)
    function userMintCard(
        string memory uri,
        string memory _type,
        string memory _rarity
    ) public whenNotPaused nonReentrant returns (uint256) {
        return mintCard(msg.sender, uri, _type, _rarity);
    }

    function getCardInfo(uint256 tokenId) public view returns (string memory, string memory, string memory) {
        require(_exists(tokenId), "Card does not exist");
        return (tokenURI(tokenId), pokemonType[tokenId], rarity[tokenId]);
    }
}
