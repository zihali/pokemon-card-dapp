import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./components/Home";
import Mint from "./components/Mint";
import Market from "./components/Market";
import Gallery from "./components/Gallery";
import { pokemonCardAddress, marketplaceAddress, pokemonABI, marketplaceABI } from "./contracts";

function App() {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [pokemonContract, setPokemonContract] = useState(null);
  const [marketplaceContract, setMarketplaceContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initContracts = async () => {
      try {
        // Check if window.ethereum exists
        if (!window.ethereum) {
          setError("No Ethereum wallet detected. Please install MetaMask.");
          setLoading(false);
          return;
        }

        try {
          // Initialize ethers provider and signer (ethers v6)
          const provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(provider);

          // Request account access
          try {
            await window.ethereum.request({ method: "eth_requestAccounts" });
          } catch (requestError) {
            console.error("User rejected account access:", requestError);
            setError("Please connect your wallet to use this app.");
            setLoading(false);
            return;
          }

          const signer = await provider.getSigner();
          setSigner(signer);

          try {
            const address = await signer.getAddress();
            setAccount(address);
          } catch (addressError) {
            console.error("Failed to get address:", addressError);
            setError("Failed to get your wallet address.");
            setLoading(false);
            return;
          }

          // Initialize contracts
          try {
            const pokemon = new ethers.Contract(pokemonCardAddress, pokemonABI, signer);
            const marketplace = new ethers.Contract(marketplaceAddress, marketplaceABI, signer);

            setPokemonContract(pokemon);
            setMarketplaceContract(marketplace);
          } catch (contractError) {
            console.error("Failed to initialize contracts:", contractError);
            setError("Failed to connect to blockchain contracts.");
            setLoading(false);
            return;
          }

          setLoading(false);
        } catch (providerError) {
          console.error("Provider initialization error:", providerError);
          setError("Error connecting to your Ethereum wallet.");
          setLoading(false);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setError("An unexpected error occurred. Please refresh the page.");
        setLoading(false);
      }
    };

    initContracts();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          // Re-initialize the contracts with the new account
          window.location.reload();
        } else {
          setAccount("");
          setError("Please connect your wallet.");
        }
      });

      window.ethereum.on("chainChanged", () => {
        // Reload the page when the chain changes
        window.location.reload();
      });

      window.ethereum.on("disconnect", () => {
        setAccount("");
        setProvider(null);
        setSigner(null);
        setPokemonContract(null);
        setMarketplaceContract(null);
        setError("Wallet disconnected.");
      });

      // Clean up event listeners
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", () => {});
          window.ethereum.removeListener("chainChanged", () => {});
          window.ethereum.removeListener("disconnect", () => {});
        }
      };
    }
  }, []);

  return (
    <Router>
      <div style={{ padding: "1rem" }}>
        <h1>🎴 Pokémon NFT Marketplace</h1>
        
        {error ? (
          <div style={{ 
            backgroundColor: "#f8d7da", 
            color: "#721c24", 
            padding: "0.75rem", 
            borderRadius: "0.25rem",
            marginBottom: "1rem"
          }}>
            {error}
          </div>
        ) : loading ? (
          <div style={{ marginBottom: "1rem" }}>
            Connecting to wallet and contracts...
          </div>
        ) : (
          <>
            <p>Connected wallet: {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "Not connected"}</p>
            
            <nav style={{ marginBottom: "1rem" }}>
              <Link to="/" style={{ marginRight: "1rem" }}>Home</Link>
              <Link to="/mint" style={{ marginRight: "1rem" }}>Mint</Link>
              <Link to="/market" style={{ marginRight: "1rem" }}>Marketplace</Link>
              <Link to="/gallery">My Cards</Link>
            </nav>

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/mint" element={
                <Mint
                  signer={signer}
                  pokemonContract={pokemonContract}
                  marketplaceContract={marketplaceContract}
                />
              } />
              <Route path="/market" element={
                <Market
                  signer={signer}
                  pokemonContract={pokemonContract}
                  marketplaceContract={marketplaceContract}
                />
              } />
              <Route path="/gallery" element={
                <Gallery
                  signer={signer}
                  pokemonContract={pokemonContract}
                />
              } />
            </Routes>
          </>
        )}
      </div>
    </Router>
  );
}

export default App;
