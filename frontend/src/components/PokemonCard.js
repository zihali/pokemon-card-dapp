import React, { useState } from "react";

const PokemonCard = ({ signer, pokemonContract }) => {
  const [uri, setUri] = useState("");
  const [type, setType] = useState("");
  const [rarity, setRarity] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const mint = async () => {
    if (!signer || !pokemonContract) {
      alert("Contract or wallet not loaded yet.");
      return;
    }

    if (!uri || !type || !rarity) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Waiting for MetaMask confirmation...");

      const recipient = await signer.getAddress();
      const tx = await pokemonContract.mintCard(recipient, uri, type, rarity);

      setStatus("Minting... please wait for confirmation.");
      await tx.wait();

      setStatus("🎉 Card minted successfully!");
      setUri("");
      setType("");
      setRarity("");
    } catch (err) {
      console.error(err);
      setStatus("❌ Minting failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px" }}>
      <h2>Mint a Pokémon Card</h2>
      <input
        type="text"
        placeholder="Image URI"
        value={uri}
        onChange={(e) => setUri(e.target.value)}
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />
      <input
        type="text"
        placeholder="Type (e.g. Fire)"
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />
      <input
        type="text"
        placeholder="Rarity (e.g. Legendary)"
        value={rarity}
        onChange={(e) => setRarity(e.target.value)}
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />

      <button onClick={mint} disabled={loading} style={{ width: "100%" }}>
        {loading ? "Minting..." : "Mint Card"}
      </button>

      {status && <p style={{ marginTop: "1rem" }}>{status}</p>}
    </div>
  );
};

export default PokemonCard;
