
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import PokemonCard from "./components/PokemonCard";
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
    <div style={{ padding: "2rem" }}>
      <h1>🎴 Pokémon NFT Marketplace</h1>
      <p>Connected wallet: {account}</p>
      <PokemonCard
        signer={signer}
        pokemonContract={pokemonContract}
        marketplaceContract={marketplaceContract}
      />
    </div>
  );
}

export default App;
