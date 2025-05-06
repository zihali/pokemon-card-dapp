import React, { useState } from "react";

const PokemonCard = ({ signer, pokemonContract }) => {
  const [uri, setUri] = useState("");
  const [type, setType] = useState("");
  const [rarity, setRarity] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");

  // Default Pokemon types and rarities to help users
  const pokemonTypes = [
    "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
    "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
    "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"
  ];

  const rarityOptions = ["Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare", "Legendary"];

  // Sample image URIs for demonstration purposes
  const sampleImageURIs = {
    "Fire": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png", // Charizard
    "Water": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png", // Blastoise
    "Grass": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png", // Venusaur
    "Electric": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png", // Pikachu
  };

  const mint = async () => {
    if (!signer || !pokemonContract) {
      setStatus("⚠️ Contract or wallet not loaded yet.");
      return;
    }

    if (!uri || !type || !rarity) {
      setStatus("⚠️ Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Waiting for MetaMask confirmation...");

      // Get the current user's address
      const recipient = await signer.getAddress();
      
      // Call the mintCard function on the contract
      const tx = await pokemonContract.mintCard(recipient, uri, type, rarity);
      
      // Store the transaction hash
      setTxHash(tx.hash);
      setStatus("Minting... please wait for confirmation.");
      
      // Wait for the transaction to be mined
      await tx.wait();

      setStatus("🎉 Card minted successfully!");
      
      // Reset form after successful minting
      setUri("");
      setType("");
      setRarity("");
    } catch (err) {
      console.error("Minting error:", err);
      
      // Provide a more user-friendly error message
      if (err.message && err.message.includes("user rejected transaction")) {
        setStatus("❌ Transaction was rejected.");
      } else if (err.message && err.message.includes("insufficient funds")) {
        setStatus("❌ Insufficient funds for gas fees.");
      } else {
        setStatus("❌ Minting failed. See console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to handle sample URL selection
  const handleTypeChange = (e) => {
    const selectedType = e.target.value;
    setType(selectedType);
    
    // If the user hasn't set a URI yet, suggest one based on the type
    if (!uri && sampleImageURIs[selectedType]) {
      setUri(sampleImageURIs[selectedType]);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "1rem", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
      <h2>Mint a Pokémon Card</h2>
      
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          <strong>Image URI:</strong>
        </label>
        <input
          type="text"
          placeholder="https://example.com/pokemon.png"
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
        />
        <small style={{ display: "block", marginTop: "0.25rem", color: "#666" }}>
          Enter a URL to an image of your Pokémon card.
        </small>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          <strong>Type:</strong>
        </label>
        <select
          value={type}
          onChange={handleTypeChange}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
        >
          <option value="">-- Select a type --</option>
          {pokemonTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          <strong>Rarity:</strong>
        </label>
        <select
          value={rarity}
          onChange={(e) => setRarity(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
        >
          <option value="">-- Select rarity --</option>
          {rarityOptions.map((rarity) => (
            <option key={rarity} value={rarity}>{rarity}</option>
          ))}
        </select>
      </div>

      {/* Preview section */}
      {uri && (
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <p><strong>Card Preview:</strong></p>
          <div style={{ 
            border: "1px solid #ccc", 
            borderRadius: "8px", 
            padding: "0.5rem",
            backgroundColor: "white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            display: "inline-block"
          }}>
            <img 
              src={uri} 
              alt="Card Preview" 
              style={{ 
                maxWidth: "150px", 
                maxHeight: "150px", 
                display: "block", 
                margin: "0 auto" 
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/150?text=Invalid+Image";
              }}
            />
            {type && rarity && (
              <div style={{ padding: "0.5rem", textAlign: "center" }}>
                <p style={{ margin: "0.25rem 0" }}><strong>Type:</strong> {type}</p>
                <p style={{ margin: "0.25rem 0" }}><strong>Rarity:</strong> {rarity}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <button 
        onClick={mint} 
        disabled={loading} 
        style={{ 
          width: "100%", 
          padding: "0.75rem",
          backgroundColor: loading ? "#cccccc" : "#3498db",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "1rem",
          fontWeight: "bold"
        }}
      >
        {loading ? "Minting..." : "Mint Card"}
      </button>

      {status && (
        <div style={{ 
          marginTop: "1rem", 
          padding: "0.75rem", 
          borderRadius: "4px",
          backgroundColor: status.includes("🎉") ? "#d4edda" : status.includes("❌") ? "#f8d7da" : "#cce5ff",
          color: status.includes("🎉") ? "#155724" : status.includes("❌") ? "#721c24" : "#004085",
        }}>
          <p style={{ margin: 0 }}>{status}</p>
          {txHash && (
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
              Transaction: <span style={{ wordBreak: "break-all" }}>{txHash}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PokemonCard;
