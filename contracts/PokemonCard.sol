
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PokemonCard is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(uint256 => string) public pokemonType;
    mapping(uint256 => string) public rarity;

    constructor() ERC721("PokemonCard", "PKMN") {}

    function mintCard(
        address recipient,
        string memory tokenURI,
        string memory _type,
        string memory _rarity
    ) public onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();

        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        pokemonType[newItemId] = _type;
        rarity[newItemId] = _rarity;

        return newItemId;
    }

    function getCardInfo(uint256 tokenId) public view returns (string memory, string memory, string memory) {
        return (tokenURI(tokenId), pokemonType[tokenId], rarity[tokenId]);
    }
}
