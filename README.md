
# 🎴 Pokémon NFT DApp

A full-stack decentralized application for minting and trading Pokémon cards as NFTs using Solidity, Hardhat, and React with ethers.js.

---

## 🗂 Project Structure

```
pokemon-nft-dapp/
├── contracts/           # Solidity smart contracts
├── scripts/             # Deployment scripts
├── frontend/            # React frontend with Web3 integration
├── hardhat.config.js    # Hardhat configuration
├── README.md            # This file
```

---

## ⚙️ Prerequisites

- Node.js >= 16.x
- npm
- MetaMask (browser extension)

---

## 🔧 Setup Instructions

### 1. Clone or unzip the project

```bash
cd pokemon-nft-dapp
```

---

### 2. Install Dependencies

#### Backend (Hardhat):

```bash
npm install
npm install @openzeppelin/contracts @nomicfoundation/hardhat-toolbox
```

#### Frontend (React):

```bash
cd frontend
npm install
cd ..
```

---

### 3. Compile the Contracts

```bash
npx hardhat compile
```

---

### 4. Start the Local Blockchain

In **Terminal 1**:

```bash
npx hardhat node
```

---

### 5. Deploy Contracts to Localhost

In **Terminal 2**:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Note the two printed addresses — they’re used in `frontend/src/contracts.js`.

---

### 6. Run the Frontend

In **Terminal 3**:

```bash
cd frontend
npm start
```

Visit [http://localhost:3000](http://localhost:3000) and connect your MetaMask wallet.

---

## ✨ Features

- Mint Pokémon cards with type, rarity, and image (via metadata URI)
- Set up for fixed-price sales and auctions (code-ready in smart contracts)
- Modular frontend with React + ethers.js

---

## 📦 To Build for Production

```bash
cd frontend
npm run build
```

---

## 🧠 Notes

- Make sure MetaMask is set to **localhost:8545**
- Use the **first account** from Hardhat node (automatically funded)

---

## 🔐 Security

- `Ownable` for mint access control
- `ReentrancyGuard` for safe auctions
- Smart contract events to power frontend reactivity

---

## 📹 Demo Video

Include a short 3-minute video showing minting and listing once your full frontend is complete.

---

## 🤖 AI Tools Disclosure

Parts of this project were assisted using ChatGPT for full-stack Solidity + React integration.

---
