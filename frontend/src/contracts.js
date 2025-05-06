import pokemonJSON from "./abis/PokemonCard.json";
import marketplaceJSON from "./abis/Marketplace.json";

// Hardhat local development blockchain addresses
// Replace these with your actual deployed contract addresses if different
export const pokemonCardAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const marketplaceAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

// Export the ABIs from the JSON files
export const pokemonABI = pokemonJSON.abi;
export const marketplaceABI = marketplaceJSON.abi;

// Helper function to check if both contracts are correctly connected
export const checkContractsConnected = async (pokemon, marketplace) => {
  if (!pokemon || !marketplace) return false;
  
  try {
    // Try to call a view function on each contract to check connectivity
    await pokemon.name();
    await marketplace.pokemonNFT();
    return true;
  } catch (error) {
    console.error("Contract connection check failed:", error);
    return false;
  }
};
