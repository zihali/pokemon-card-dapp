const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Deploy PokemonCard contract
  const PokemonCardFactory = await hre.ethers.getContractFactory("PokemonCard");
  const pokemonCard = await PokemonCardFactory.deploy();
  await pokemonCard.waitForDeployment();
  const pokemonCardAddress = await pokemonCard.getAddress();
  console.log("PokemonCard deployed to:", pokemonCardAddress);

  // Deploy Marketplace contract
  const MarketplaceFactory = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await MarketplaceFactory.deploy(pokemonCardAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", marketplaceAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
