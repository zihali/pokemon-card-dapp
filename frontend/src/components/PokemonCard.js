
import React, { useState } from "react";

const PokemonCard = ({ signer, pokemonContract, marketplaceContract }) => {
  const [mintURI, setMintURI] = useState("");
  const [type, setType] = useState("");
  const [rarity, setRarity] = useState("");

  const mint = async () => {
    const tx = await pokemonContract.mintCard(await signer.getAddress(), mintURI, type, rarity);
    await tx.wait();
    alert("Card minted!");
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Mint a Pokémon Card</h2>
      <input placeholder="Token URI" onChange={(e) => setMintURI(e.target.value)} /><br />
      <input placeholder="Type (e.g. Fire)" onChange={(e) => setType(e.target.value)} /><br />
      <input placeholder="Rarity (e.g. Rare)" onChange={(e) => setRarity(e.target.value)} /><br />
      <button onClick={mint}>Mint</button>
    </div>
  );
};

export default PokemonCard;
