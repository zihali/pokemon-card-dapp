import React, { useEffect, useState } from "react";

const Gallery = ({ signer, pokemonContract }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCards = async () => {
    try {
      if (!signer || !pokemonContract) {
        setLoading(false);
        return;
      }

      const address = await signer.getAddress();
      const balance = await pokemonContract.balanceOf(address);
      const balanceNumber = Number(balance);
      const fetchedCards = [];

      for (let i = 0; i < balanceNumber; i++) {
        try {
          // Try to get the token ID - this function might not exist in all ERC721 implementations
          let tokenId;
          try {
            tokenId = await pokemonContract.tokenOfOwnerByIndex(address, i);
          } catch (indexError) {
            console.error("Error with tokenOfOwnerByIndex, using fallback method:", indexError);
            // If this fails, we can't reliably get the tokens, so show an error
            setError("This NFT contract doesn't support enumeration. Cannot list your NFTs automatically.");
            break;
          }

          // Try to get card info
          let uri, type, rarity;
          try {
            [uri, type, rarity] = await pokemonContract.getCardInfo(tokenId);
          } catch (infoError) {
            console.error("Error with getCardInfo:", infoError);
            // Fallback: try to get just the tokenURI
            try {
              uri = await pokemonContract.tokenURI(tokenId);
              type = "Unknown";
              rarity = "Unknown";
            } catch (uriError) {
              console.error("Error getting tokenURI:", uriError);
              uri = "https://via.placeholder.com/200?text=Card+Image";
              type = "Unknown";
              rarity = "Unknown";
            }
          }

          fetchedCards.push({ 
            tokenId: tokenId.toString(), 
            uri, 
            type, 
            rarity 
          });
        } catch (err) {
          console.error("Error processing token:", err);
        }
      }

      setCards(fetchedCards);
    } catch (err) {
      console.error("Error loading cards:", err);
      setError("Failed to load your NFTs. Check wallet and contract connection.");
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
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/200?text=Error+Loading";
                }}
              />
              <p><strong>ID:</strong> {card.tokenId}</p>
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
