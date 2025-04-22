const hre = require("hardhat");

async function main() {
  console.log("Deploying Pokemon Trading Platform...");

  // Deploy the PokemonCard contract
  const PokemonCard = await hre.ethers.getContractFactory("PokemonCard");
  const pokemonCard = await PokemonCard.deploy();
  await pokemonCard.waitForDeployment();
  
  const pokemonCardAddress = await pokemonCard.getAddress();
  console.log(`PokemonCard deployed to: ${pokemonCardAddress}`);

  // Deploy the Marketplace contract
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(pokemonCardAddress);
  await marketplace.waitForDeployment();
  
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`Marketplace deployed to: ${marketplaceAddress}`);

  console.log("Deployment complete!");
  console.log("Update these addresses in frontend/src/contracts.js");
  
  // Optional: Mint some sample cards for testing
  if (process.env.MINT_SAMPLE_CARDS) {
    console.log("Minting sample cards...");
    
    const [owner] = await hre.ethers.getSigners();
    
    // Sample card data
    const cards = [
      {
        uri: "https://i.imgur.com/2PZQaMN.jpeg",
        type: "Fire",
        rarity: "Legendary",
      },
      {
        uri: "https://i.imgur.com/YC6yfGo.jpeg",
        type: "Water",
        rarity: "Rare",
      },
      {
        uri: "https://i.imgur.com/qxzHEPM.jpeg",
        type: "Electric",
        rarity: "Epic",
      },
    ];
    
    for (const card of cards) {
      await pokemonCard.mintCard(
        owner.address,
        card.uri,
        card.type,
        card.rarity
      );
      console.log(`Minted ${card.type} card with rarity ${card.rarity}`);
    }
    
    console.log("Sample cards minted!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
