import React, { useEffect, useState } from "react";

const Gallery = ({ signer, pokemonContract }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCards = async () => {
    try {
      if (!signer || !pokemonContract) return;

      const address = await signer.getAddress();
      const balance = await pokemonContract.balanceOf(address);
      const fetchedCards = [];

      for (let i = 0; i < balance; i++) {
        const tokenId = await pokemonContract.tokenOfOwnerByIndex(address, i);
        const [uri, type, rarity] = await pokemonContract.getCardInfo(tokenId);
        fetchedCards.push({ tokenId, uri, type, rarity });
      }

      setCards(fetchedCards);
    } catch (err) {
      console.error("Error loading cards:", err);
      setError("Failed to load your NFTs. Check wallet and contract.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [signer, pokemonContract]);

  if (loading) return <p>Loading your cards...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>🖼 Your Pokémon Card Collection</h2>
      {cards.length === 0 ? (
        <p>You don't own any cards yet.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          {cards.map((card) => (
            <div
              key={card.tokenId}
              style={{
                border: "1px solid #ccc",
                padding: "1rem",
                borderRadius: "8px",
                width: "200px",
              }}
            >
              <img
                src={card.uri}
                alt={`Card ${card.tokenId}`}
                style={{ width: "100%", height: "auto" }}
              />
              <p><strong>ID:</strong> {card.tokenId.toString()}</p>
              <p><strong>Type:</strong> {card.type}</p>
              <p><strong>Rarity:</strong> {card.rarity}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
