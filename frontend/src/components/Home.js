import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ padding: "2rem" }}>
      <h2>Welcome to the Pokémon NFT Marketplace</h2>
      <p>Mint, collect, and trade digital Pokémon cards on the blockchain.</p>
      
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        flexWrap: "wrap",
        marginTop: "2rem"
      }}>
        <div style={{ 
          flex: "1 1 300px", 
          margin: "1rem", 
          padding: "1.5rem", 
          backgroundColor: "#f0f8ff", 
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h3>🖌 Mint Cards</h3>
          <p>Create your own unique Pokémon cards as NFTs. Choose the type, rarity, and image for your cards.</p>
          <Link to="/mint">
            <button style={{ 
              backgroundColor: "#3498db", 
              color: "white", 
              border: "none", 
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: "pointer"
            }}>
              Start Minting
            </button>
          </Link>
        </div>
        
        <div style={{ 
          flex: "1 1 300px", 
          margin: "1rem", 
          padding: "1.5rem", 
          backgroundColor: "#f0fff0", 
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h3>🛒 Trade Cards</h3>
          <p>Buy, sell, and auction your Pokémon cards in the marketplace. Find rare cards from other collectors.</p>
          <Link to="/market">
            <button style={{ 
              backgroundColor: "#2ecc71", 
              color: "white", 
              border: "none", 
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: "pointer"
            }}>
              Go to Marketplace
            </button>
          </Link>
        </div>
        
        <div style={{ 
          flex: "1 1 300px", 
          margin: "1rem", 
          padding: "1.5rem", 
          backgroundColor: "#fff0f0", 
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h3>🖼 View Collection</h3>
          <p>Browse your personal collection of Pokémon card NFTs. See all the cards you've minted or purchased.</p>
          <Link to="/gallery">
            <button style={{ 
              backgroundColor: "#e74c3c", 
              color: "white", 
              border: "none", 
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: "pointer"
            }}>
              View My Cards
            </button>
          </Link>
        </div>
      </div>
      
      <div style={{ 
        marginTop: "2rem", 
        padding: "1.5rem", 
        backgroundColor: "#f9f9f9", 
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h3>Getting Started</h3>
        <ol style={{ paddingLeft: "1.5rem" }}>
          <li>Connect your MetaMask wallet to the application</li>
          <li>Go to the "Mint" page to create your first Pokémon card NFT</li>
          <li>Visit the "Marketplace" to trade cards with other collectors</li>
          <li>Check your "Gallery" to see all the cards you own</li>
        </ol>
        <p><strong>Note:</strong> This dApp runs on a local Hardhat blockchain. Make sure your MetaMask is connected to the Hardhat network (localhost:8545).</p>
      </div>
    </div>
  );
}
