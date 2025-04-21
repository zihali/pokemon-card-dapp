
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    struct Listing {
        address seller;
        uint256 price;
        bool isAuction;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
    }

    IERC721 public pokemonNFT;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 tokenId, address seller, uint256 price, bool isAuction);
    event Purchased(uint256 tokenId, address buyer);
    event BidPlaced(uint256 tokenId, address bidder, uint256 amount);
    event AuctionEnded(uint256 tokenId, address winner, uint256 amount);

    constructor(address _pokemonNFT) {
        pokemonNFT = IERC721(_pokemonNFT);
    }

    function listCard(uint256 tokenId, uint256 price, bool isAuction, uint256 duration) external {
        require(pokemonNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(pokemonNFT.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isAuction: isAuction,
            highestBid: 0,
            highestBidder: address(0),
            endTime: isAuction ? block.timestamp + duration : 0
        });

        emit Listed(tokenId, msg.sender, price, isAuction);
    }

    function buyCard(uint256 tokenId) external payable nonReentrant {
        Listing storage item = listings[tokenId];
        require(!item.isAuction, "Use bid for auctions");
        require(msg.value >= item.price, "Insufficient payment");

        address seller = item.seller;
        delete listings[tokenId];

        pokemonNFT.safeTransferFrom(seller, msg.sender, tokenId);
        payable(seller).transfer(item.price);

        emit Purchased(tokenId, msg.sender);
    }

    function placeBid(uint256 tokenId) external payable nonReentrant {
        Listing storage item = listings[tokenId];
        require(item.isAuction, "Not an auction");
        require(block.timestamp < item.endTime, "Auction ended");
        require(msg.value > item.highestBid, "Bid too low");

        if (item.highestBid > 0) {
            payable(item.highestBidder).transfer(item.highestBid);
        }

        item.highestBid = msg.value;
        item.highestBidder = msg.sender;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    function endAuction(uint256 tokenId) external nonReentrant {
        Listing storage item = listings[tokenId];
        require(item.isAuction, "Not an auction");
        require(block.timestamp >= item.endTime, "Auction still active");

        address seller = item.seller;
        address winner = item.highestBidder;
        uint256 amount = item.highestBid;

        delete listings[tokenId];

        if (winner != address(0)) {
            pokemonNFT.safeTransferFrom(seller, winner, tokenId);
            payable(seller).transfer(amount);
        }

        emit AuctionEnded(tokenId, winner, amount);
    }
}
