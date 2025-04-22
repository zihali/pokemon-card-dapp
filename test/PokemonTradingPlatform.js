const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Pokemon Trading Platform", function () {
  let PokemonCard;
  let Marketplace;
  let pokemonCard;
  let marketplace;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get the ContractFactory and Signers
    PokemonCard = await ethers.getContractFactory("PokemonCard");
    Marketplace = await ethers.getContractFactory("Marketplace");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy contracts
    pokemonCard = await PokemonCard.deploy();
    marketplace = await Marketplace.deploy(await pokemonCard.getAddress());

    // Wait for deployment
    await pokemonCard.waitForDeployment();
    await marketplace.waitForDeployment();
  });

  describe("PokemonCard Contract", function () {
    it("Should set the right owner", async function () {
      expect(await pokemonCard.owner()).to.equal(owner.address);
    });

    it("Should mint a new card correctly", async function () {
      const tokenURI = "https://example.com/pokemon/1.json";
      const type = "Fire";
      const rarity = "Legendary";

      // Mint a card
      await pokemonCard.mintCard(addr1.address, tokenURI, type, rarity);
      
      // Check card owner
      expect(await pokemonCard.ownerOf(1)).to.equal(addr1.address);
      
      // Check card info
      const cardInfo = await pokemonCard.getCardInfo(1);
      expect(cardInfo[0]).to.equal(tokenURI);
      expect(cardInfo[1]).to.equal(type);
      expect(cardInfo[2]).to.equal(rarity);
    });

    it("Should allow users to mint their own cards", async function () {
      const tokenURI = "https://example.com/pokemon/2.json";
      const type = "Water";
      const rarity = "Rare";

      // User mints a card
      await pokemonCard.connect(addr1).userMintCard(tokenURI, type, rarity);
      
      // Check card owner
      const lastTokenId = 1; // First token ID
      expect(await pokemonCard.ownerOf(lastTokenId)).to.equal(addr1.address);
    });

    it("Should implement emergency stop functionality", async function () {
      // Enable emergency stop
      await pokemonCard.toggleEmergencyStop();
      
      // Try to mint a card (should fail)
      const tokenURI = "https://example.com/pokemon/3.json";
      await expect(pokemonCard.mintCard(addr1.address, tokenURI, "Grass", "Common"))
        .to.be.revertedWith("Contract is in emergency stop mode");
    });
  });

  describe("Marketplace Contract", function () {
    let tokenId;

    beforeEach(async function () {
      // Mint a card for testing
      const tx = await pokemonCard.mintCard(
        addr1.address, 
        "https://example.com/pokemon/4.json", 
        "Electric", 
        "Epic"
      );
      
      // Get the token ID from the event
      tokenId = 1;
      
      // Approve marketplace for the token
      await pokemonCard.connect(addr1).setApprovalForAll(marketplace.getAddress(), true);
    });

    it("Should list a card for sale", async function () {
      const price = ethers.parseEther("1");
      
      // List the card
      await marketplace.connect(addr1).listCard(tokenId, price, false, 0);
      
      // Check listing details
      const listing = await marketplace.listings(tokenId);
      expect(listing.seller).to.equal(addr1.address);
      expect(listing.price).to.equal(price);
      expect(listing.isAuction).to.equal(false);
    });

    it("Should allow buying a listed card", async function () {
      const price = ethers.parseEther("1");
      
      // List the card
      await marketplace.connect(addr1).listCard(tokenId, price, false, 0);
      
      // Buy the card
      await marketplace.connect(addr2).buyCard(tokenId, { value: price });
      
      // Check new owner
      expect(await pokemonCard.ownerOf(tokenId)).to.equal(addr2.address);
    });

    it("Should list a card for auction", async function () {
      const startingPrice = ethers.parseEther("0.5");
      const duration = 3600; // 1 hour
      
      // List the card for auction
      await marketplace.connect(addr1).listCard(tokenId, startingPrice, true, duration);
      
      // Check auction details
      const listing = await marketplace.listings(tokenId);
      expect(listing.isAuction).to.equal(true);
      expect(listing.price).to.equal(startingPrice);
      expect(listing.endTime).to.be.gt(0);
    });

    it("Should allow placing bids on an auction", async function () {
      const startingPrice = ethers.parseEther("0.5");
      const bidAmount = ethers.parseEther("0.6");
      const duration = 3600; // 1 hour
      
      // List the card for auction
      await marketplace.connect(addr1).listCard(tokenId, startingPrice, true, duration);
      
      // Place a bid
      await marketplace.connect(addr2).placeBid(tokenId, { value: bidAmount });
      
      // Check if bid was placed
      const listing = await marketplace.listings(tokenId);
      expect(listing.highestBidder).to.equal(addr2.address);
      expect(listing.highestBid).to.equal(bidAmount);
    });

    it("Should handle the withdraw pattern correctly", async function () {
      const price = ethers.parseEther("1");
      
      // List the card
      await marketplace.connect(addr1).listCard(tokenId, price, false, 0);
      
      // Buy the card
      await marketplace.connect(addr2).buyCard(tokenId, { value: price });
      
      // Get seller balance before withdrawal
      const initialBalance = await ethers.provider.getBalance(addr1.address);
      
      // Seller withdraws funds
      await marketplace.connect(addr1).withdraw();
      
      // Check if balance increased (minus gas costs)
      const finalBalance = await ethers.provider.getBalance(addr1.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should handle emergency stop in marketplace", async function () {
      // Enable emergency stop
      await marketplace.toggleEmergencyStop();
      
      const price = ethers.parseEther("1");
      
      // Try to list a card (should fail)
      await expect(marketplace.connect(addr1).listCard(tokenId, price, false, 0))
        .to.be.revertedWith("Marketplace: Emergency stop is active");
    });
  });
});
