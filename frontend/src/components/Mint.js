import PokemonCard from "../components/PokemonCard";

export default function Mint({ signer, pokemonContract, marketplaceContract }) {
  return (
    <div style={{ padding: "2rem" }}>
      <PokemonCard 
        signer={signer} 
        pokemonContract={pokemonContract} 
      />
    </div>
  );
}

