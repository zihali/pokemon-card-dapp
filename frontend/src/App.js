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

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const prov = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const signer = await prov.getSigner();
        const acc = await signer.getAddress();
        setAccount(acc);
        setProvider(prov);
        setSigner(signer);

        const pokemon = new ethers.Contract(pokemonCardAddress, pokemonABI, signer);
        const market = new ethers.Contract(marketplaceAddress, marketplaceABI, signer);

        setPokemonContract(pokemon);
        setMarketplaceContract(market);
      }
    };
    init();
  }, []);

  return (
    <Router>
      <div style={{ padding: "1rem" }}>
        <h1>🎴 Pokémon NFT Marketplace</h1>
        <p>Connected wallet: {account}</p>
        <nav style={{ marginBottom: "1rem" }}>
          <Link to="/">Home</Link> |{" "}
          <Link to="/mint">Mint</Link> |{" "}
          <Link to="/market">Marketplace</Link> |{" "}
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
      </div>
    </Router>
  );
}

export default App;
