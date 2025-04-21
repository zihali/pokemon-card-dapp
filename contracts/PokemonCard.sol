// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PokemonCard is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct CardAttributes {
        string name;
        string pokemonType;
        uint256 level;
    }

    mapping(uint256 => CardAttributes) public cardDetails;

    event CardMinted(address indexed to, uint256 indexed tokenId, string name, string pokemonType, uint256 level);

    constructor() ERC721("PokemonCard", "PKMN") {}

    function mintCard(
        address recipient,
        string memory tokenURI,
        string memory name,
        string memory pokemonType,
        uint256 level
    ) public onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newCardId = _tokenIds.current();

        _mint(recipient, newCardId);
        _setTokenURI(newCardId, tokenURI);

        cardDetails[newCardId] = CardAttributes(name, pokemonType, level);

        emit CardMinted(recipient, newCardId, name, pokemonType, level);

        return newCardId;
    }
}
