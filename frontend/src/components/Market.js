import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function Market({ signer, marketplaceContract, pokemonContract }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ownedCards, setOwnedCards] = useState([]);
  const [activeTab, setActiveTab] = useState("browse");
  
  // Form states for listing a card
  const [selectedCard, setSelectedCard] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [isAuction, setIsAuction] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState("86400"); // 24 hours in seconds
  const [bidAmount, setBidAmount] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Use the zero address consistently for ethers.js v6
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Function to fetch active listings
  const fetchListings = async () => {
    if (!signer || !marketplaceContract || !pokemonContract) return;
    
    try {
      setLoading(true);
      
      // We need to listen to past events to get all listings
      // In a real app, you'd use a subgraph or backend API for this
      try {
        const filter = marketplaceContract.filters.Listed();
        const events = await marketplaceContract.queryFilter(filter);
        
        const activeListings = [];
        
        for (const event of events) {
          const { tokenId, seller, price, isAuction } = event.args || {};
          
          if (!tokenId) continue; // Skip if event format doesn't match
          
          try {
            // Check if this listing is still active (not sold or ended)
            const listing = await marketplaceContract.listings(tokenId);
            
            if (listing.seller === ZERO_ADDRESS) {
              // Listing no longer active
              continue;
            }
            
            // Get card details
            let uri, type, rarity;
            try {
              [uri, type, rarity] = await pokemonContract.getCardInfo(tokenId);
            } catch (cardError) {
              console.error("Error getting card info:", cardError);
              uri = "https://via.placeholder.com/200?text=Card+Image";
              type = "Unknown";
              rarity = "Unknown";
            }
            
            const owner = await pokemonContract.ownerOf(tokenId);
            
            // Only add if still owned by the seller (listing not fulfilled yet)
            if (owner.toLowerCase() === seller.toLowerCase()) {
              activeListings.push({
                tokenId: tokenId.toString(),
                seller,
                price: ethers.formatEther(price),
                isAuction,
                uri,
                type,
                rarity,
                ...(isAuction && {
                  highestBid: ethers.formatEther(listing.highestBid),
                  highestBidder: listing.highestBidder,
                  endTime: new Date(Number(listing.endTime) * 1000).toLocaleString(),
                  hasEnded: Date.now() > Number(listing.endTime) * 1000
                })
              });
            }
          } catch (err) {
            console.error(`Error processing listing for token ${tokenId}:`, err);
            // Continue to next listing
          }
        }
        
        setListings(activeListings);
      } catch (eventsError) {
        console.error("Error querying events:", eventsError);
        setError("Failed to load marketplace events. Check contract connection.");
      }
    } catch (err) {
      console.error("Error fetching listings:", err);
      setError("Failed to load marketplace listings.");
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch user's owned cards
  const fetchOwnedCards = async () => {
    if (!signer || !pokemonContract) return;
    
    try {
      const address = await signer.getAddress();
      const balance = await pokemonContract.balanceOf(address);
      const balanceNumber = Number(balance);
      const cards = [];
      
      for (let i = 0; i < balanceNumber; i++) {
        try {
          let tokenId;
          try {
            tokenId = await pokemonContract.tokenOfOwnerByIndex(address, i);
          } catch (indexError) {
            console.error("Error with tokenOfOwnerByIndex:", indexError);
            break;
          }

          let uri, type, rarity;
          try {
            [uri, type, rarity] = await pokemonContract.getCardInfo(tokenId);
          } catch (infoError) {
            console.error("Error with getCardInfo:", infoError);
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
          
          // Check if card is already listed
          try {
            const listing = await marketplaceContract.listings(tokenId);
            const isListed = listing.seller !== ZERO_ADDRESS;
            
            if (!isListed) {
              cards.push({
                tokenId: tokenId.toString(),
                uri,
                type,
                rarity
              });
            }
          } catch (listingError) {
            console.error("Error checking if card is listed:", listingError);
            // If we can't check if it's listed, assume it's not listed
            cards.push({
              tokenId: tokenId.toString(),
              uri,
              type,
              rarity
            });
          }
        } catch (err) {
          console.error("Error fetching card:", err);
        }
      }
      
      setOwnedCards(cards);
    } catch (err) {
      console.error("Error fetching owned cards:", err);
    }
  };

  // Function to list a card
  const listCard = async () => {
    if (!selectedCard || !listingPrice || !signer || !marketplaceContract || !pokemonContract) {
      setStatusMessage("Please select a card and set a price.");
      return;
    }
    
    try {
      setStatusMessage("Approving marketplace to transfer your card...");
      
      // First, approve the marketplace to transfer the NFT
      const marketplaceAddress = await marketplaceContract.getAddress();
      const approveTx = await pokemonContract.setApprovalForAll(marketplaceAddress, true);
      await approveTx.wait();
      
      setStatusMessage("Listing card on marketplace...");
      
      // Convert price to wei
      const priceInWei = ethers.parseEther(listingPrice);
      
      // List the card
      const duration = isAuction ? parseInt(auctionDuration) : 0;
      const listTx = await marketplaceContract.listCard(
        selectedCard,
        priceInWei,
        isAuction,
        duration
      );
      
      await listTx.wait();
      
      setStatusMessage("🎉 Card successfully listed!");
      
      // Reset form and refresh data
      setSelectedCard("");
      setListingPrice("");
      setIsAuction(false);
      fetchOwnedCards();
      fetchListings();
      
      // Switch to browse tab after listing
      setActiveTab("browse");
    } catch (err) {
      console.error("Error listing card:", err);
      setStatusMessage(`Error: ${err.message || "Failed to list card."}`);
    }
  };

  // Function to buy a card
  const buyCard = async (tokenId, price) => {
    if (!signer || !marketplaceContract) return;
    
    try {
      setStatusMessage("Buying card, please confirm transaction...");
      
      // Convert price to wei
      const priceInWei = ethers.parseEther(price);
      
      // Buy the card
      const tx = await marketplaceContract.buyCard(tokenId, { value: priceInWei });
      
      setStatusMessage("Transaction submitted, waiting for confirmation...");
      await tx.wait();
      
      setStatusMessage("🎉 Card purchased successfully!");
      
      // Refresh data
      fetchListings();
      fetchOwnedCards();
    } catch (err) {
      console.error("Error buying card:", err);
      setStatusMessage(`Error: ${err.message || "Failed to buy card."}`);
    }
  };

  // Function to place a bid
  const placeBid = async (tokenId) => {
    if (!bidAmount || !signer || !marketplaceContract) {
      setStatusMessage("Please enter a bid amount.");
      return;
    }
    
    try {
      setStatusMessage("Placing bid, please confirm transaction...");
      
      // Convert bid to wei
      const bidInWei = ethers.parseEther(bidAmount);
      
      // Place the bid
      const tx = await marketplaceContract.placeBid(tokenId, { value: bidInWei });
      
      setStatusMessage("Transaction submitted, waiting for confirmation...");
      await tx.wait();
      
      setStatusMessage("🎉 Bid placed successfully!");
      
      // Reset form and refresh data
      setBidAmount("");
      fetchListings();
    } catch (err) {
      console.error("Error placing bid:", err);
      setStatusMessage(`Error: ${err.message || "Failed to place bid."}`);
    }
  };

  // Function to end an auction
  const endAuction = async (tokenId) => {
    if (!signer || !marketplaceContract) return;
    
    try {
      setStatusMessage("Ending auction, please confirm transaction...");
      
      // End the auction
      const tx = await marketplaceContract.endAuction(tokenId);
      
      setStatusMessage("Transaction submitted, waiting for confirmation...");
      await tx.wait();
      
      setStatusMessage("🎉 Auction ended successfully!");
      
      // Refresh data
      fetchListings();
      fetchOwnedCards();
    } catch (err) {
      console.error("Error ending auction:", err);
      setStatusMessage(`Error: ${err.message || "Failed to end auction."}`);
    }
  };

  // Load data when component mounts or contracts/signer change
  useEffect(() => {
    if (signer && marketplaceContract && pokemonContract) {
      fetchListings();
      fetchOwnedCards();
      
      // Set up event listeners for real-time updates
      let cleanupListeners = () => {};
      
      try {
        const listedFilter = marketplaceContract.filters.Listed();
        const purchasedFilter = marketplaceContract.filters.Purchased();
        const bidFilter = marketplaceContract.filters.BidPlaced();
        const auctionEndedFilter = marketplaceContract.filters.AuctionEnded();
        
        const handleListed = () => fetchListings();
        const handlePurchased = () => {
          fetchListings();
          fetchOwnedCards();
        };
        const handleBid = () => fetchListings();
        const handleAuctionEnded = () => {
          fetchListings();
          fetchOwnedCards();
        };
        
        marketplaceContract.on(listedFilter, handleListed);
        marketplaceContract.on(purchasedFilter, handlePurchased);
        marketplaceContract.on(bidFilter, handleBid);
        marketplaceContract.on(auctionEndedFilter, handleAuctionEnded);
        
        cleanupListeners = () => {
          try {
            marketplaceContract.off(listedFilter, handleListed);
            marketplaceContract.off(purchasedFilter, handlePurchased);
            marketplaceContract.off(bidFilter, handleBid);
            marketplaceContract.off(auctionEndedFilter, handleAuctionEnded);
          } catch (err) {
            console.error("Error removing event listeners:", err);
          }
        };
      } catch (err) {
        console.error("Error setting up event listeners:", err);
      }
      
      return cleanupListeners;
    }
  }, [signer, marketplaceContract, pokemonContract]);

  // Tab for browsing listings
  const BrowseTab = () => (
    <div>
      <h3>Available Listings</h3>
      {loading ? (
        <p>Loading marketplace listings...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : listings.length === 0 ? (
        <p>No cards are currently listed for sale.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          {listings.map((listing) => (
            <div
              key={listing.tokenId}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "1rem",
                width: "250px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <img
                src={listing.uri}
                alt={`Card ${listing.tokenId}`}
                style={{ width: "100%", height: "auto", marginBottom: "0.5rem" }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/200?text=Error+Loading";
                }}
              />
              <p><strong>ID:</strong> {listing.tokenId}</p>
              <p><strong>Type:</strong> {listing.type}</p>
              <p><strong>Rarity:</strong> {listing.rarity}</p>
              <p><strong>Seller:</strong> {`${listing.seller.substring(0, 6)}...${listing.seller.substring(38)}`}</p>
              
              {listing.isAuction ? (
                <>
                  <p><strong>Auction</strong></p>
                  <p><strong>Starting Price:</strong> {listing.price} ETH</p>
                  <p><strong>Current Bid:</strong> {listing.highestBid} ETH</p>
                  {listing.highestBidder !== ZERO_ADDRESS && (
                    <p><strong>Highest Bidder:</strong> {`${listing.highestBidder.substring(0, 6)}...${listing.highestBidder.substring(38)}`}</p>
                  )}
                  <p><strong>Ends:</strong> {listing.endTime}</p>
                  
                  {listing.hasEnded ? (
                    <button
                      onClick={() => endAuction(listing.tokenId)}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        backgroundColor: "#f39c12",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        marginTop: "0.5rem",
                      }}
                    >
                      End Auction
                    </button>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Bid amount in ETH"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
                      />
                      <button
                        onClick={() => placeBid(listing.tokenId)}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          backgroundColor: "#3498db",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginTop: "0.5rem",
                        }}
                      >
                        Place Bid
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p><strong>Fixed Price:</strong> {listing.price} ETH</p>
                  <button
                    onClick={() => buyCard(listing.tokenId, listing.price)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      backgroundColor: "#2ecc71",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginTop: "0.5rem",
                    }}
                  >
                    Buy Now
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Tab for listing a card
  const ListTab = () => (
    <div>
      <h3>List Your Card for Sale</h3>
      {ownedCards.length === 0 ? (
        <p>You don't have any cards to list. Mint some cards first!</p>
      ) : (
        <div style={{ maxWidth: "500px", margin: "0 auto" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <strong>Select Card:</strong>
            </label>
            <select
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="">-- Select a card --</option>
              {ownedCards.map((card) => (
                <option key={card.tokenId} value={card.tokenId}>
                  #{card.tokenId} - {card.type} ({card.rarity})
                </option>
              ))}
            </select>
          </div>
          
          {selectedCard && (
            <div style={{ marginBottom: "1rem" }}>
              {ownedCards.find(card => card.tokenId === selectedCard) && (
                <img
                  src={ownedCards.find(card => card.tokenId === selectedCard).uri}
                  alt={`Card ${selectedCard}`}
                  style={{ width: "100%", height: "auto", marginBottom: "0.5rem" }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/200?text=Error+Loading";
                  }}
                />
              )}
            </div>
          )}
          
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <strong>Price (ETH):</strong>
            </label>
            <input
              type="text"
              placeholder="0.01"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>
          
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={isAuction}
                onChange={(e) => setIsAuction(e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              <strong>List as Auction</strong>
            </label>
          </div>
          
          {isAuction && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                <strong>Auction Duration:</strong>
              </label>
              <select
                value={auctionDuration}
                onChange={(e) => setAuctionDuration(e.target.value)}
                style={{ width: "100%", padding: "0.5rem" }}
              >
                <option value="3600">1 hour</option>
                <option value="86400">24 hours</option>
                <option value="172800">48 hours</option>
                <option value="604800">7 days</option>
              </select>
            </div>
          )}
          
          <button
            onClick={listCard}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            List Card for Sale
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Pokémon Card Marketplace</h2>
      
      {/* Tab navigation */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={() => setActiveTab("browse")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: activeTab === "browse" ? "#3498db" : "#f1f1f1",
            color: activeTab === "browse" ? "white" : "black",
            border: "none",
            borderRadius: "4px 0 0 4px",
            cursor: "pointer",
          }}
        >
          Browse Listings
        </button>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: activeTab === "list" ? "#3498db" : "#f1f1f1",
            color: activeTab === "list" ? "white" : "black",
            border: "none",
            borderRadius: "0 4px 4px 0",
            cursor: "pointer",
          }}
        >
          List a Card
        </button>
      </div>
      
      {/* Status message */}
      {statusMessage && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: statusMessage.includes("🎉") ? "#d4edda" : statusMessage.includes("Error") ? "#f8d7da" : "#cce5ff",
            color: statusMessage.includes("🎉") ? "#155724" : statusMessage.includes("Error") ? "#721c24" : "#004085",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          {statusMessage}
        </div>
      )}
      
      {/* Tab content */}
      {activeTab === "browse" ? <BrowseTab /> : <ListTab />}
    </div>
  );
}
