
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Marketplace is ReentrancyGuard, Ownable, Pausable {
    struct Listing {
        address seller;
        uint256 price;
        bool isAuction;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bytes32 commitmentHash; // For anti-frontrunning in auctions
    }
    
    struct BidCommitment {
        bytes32 commitment;
        uint256 timestamp;
        bool revealed;
    }

    IERC721 public pokemonNFT;
    mapping(uint256 => Listing) public listings;
    
    // For commit-reveal scheme to prevent front-running
    mapping(address => mapping(uint256 => BidCommitment)) public bidCommitments;
    uint256 public constant COMMITMENT_REVEAL_WINDOW = 10 minutes;
    
    // Emergency stop circuit breaker
    bool private _emergencyStop;
    
    // Platform fee (in basis points, 100 = 1%)
    uint256 public platformFeePercent = 250; // 2.5%
    address public feeRecipient;
    
    // Minimum bid increase percentage (in basis points)
    uint256 public minBidIncreasePercent = 500; // 5%
    
    // Mapping of pending withdrawals
    mapping(address => uint256) public pendingWithdrawals;

    event Listed(uint256 tokenId, address seller, uint256 price, bool isAuction);
    event Purchased(uint256 tokenId, address buyer, uint256 price);
    event BidCommitted(uint256 tokenId, address bidder, bytes32 commitment);
    event BidPlaced(uint256 tokenId, address bidder, uint256 amount);
    event AuctionEnded(uint256 tokenId, address winner, uint256 amount);
    event EmergencyStop(bool stopped);
    event FeeUpdated(uint256 newFeePercent);
    event FeeRecipientUpdated(address newFeeRecipient);
    event Withdrawal(address indexed user, uint256 amount);

    modifier notEmergency() {
        require(!_emergencyStop, "Marketplace: Emergency stop is active");
        _;
    }

    constructor(address _pokemonNFT) {
        pokemonNFT = IERC721(_pokemonNFT);
        feeRecipient = msg.sender;
    }
    
    // Emergency functions
    function toggleEmergencyStop() external onlyOwner {
        _emergencyStop = !_emergencyStop;
        emit EmergencyStop(_emergencyStop);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Fee management
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Fee too high"); // Max 10%
        platformFeePercent = _feePercent;
        emit FeeUpdated(_feePercent);
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }
    
    function setMinBidIncreasePercent(uint256 _percent) external onlyOwner {
        require(_percent >= 100 && _percent <= 5000, "Invalid percentage"); // Between 1% and 50%
        minBidIncreasePercent = _percent;
    }

    function listCard(uint256 tokenId, uint256 price, bool isAuction, uint256 duration) external whenNotPaused notEmergency nonReentrant {
        require(pokemonNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(pokemonNFT.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");
        require(price > 0, "Price must be greater than zero");
        require(!isAuction || duration > 0, "Auction duration must be greater than zero");
        require(listings[tokenId].seller == address(0), "Card already listed");

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isAuction: isAuction,
            highestBid: 0,
            highestBidder: address(0),
            endTime: isAuction ? block.timestamp + duration : 0,
            commitmentHash: bytes32(0)
        });

        emit Listed(tokenId, msg.sender, price, isAuction);
    }
    
    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing storage item = listings[tokenId];
        require(item.seller == msg.sender, "Not the seller");
        
        // If it's an auction with bids, can't cancel
        require(!item.isAuction || item.highestBid == 0, "Can't cancel auction with bids");
        
        delete listings[tokenId];
    }

    function buyCard(uint256 tokenId) external payable whenNotPaused notEmergency nonReentrant {
        Listing storage item = listings[tokenId];
        require(item.seller != address(0), "Item not listed");
        require(!item.isAuction, "Use bid for auctions");
        require(msg.value >= item.price, "Insufficient payment");

        address seller = item.seller;
        uint256 price = item.price;
        delete listings[tokenId];

        // Calculate platform fee
        uint256 fee = (price * platformFeePercent) / 10000;
        uint256 sellerAmount = price - fee;
        
        // Transfer NFT to buyer
        pokemonNFT.safeTransferFrom(seller, msg.sender, tokenId);
        
        // Safe payments using pull pattern
        pendingWithdrawals[seller] += sellerAmount;
        pendingWithdrawals[feeRecipient] += fee;
        
        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit Purchased(tokenId, msg.sender, price);
    }
    
    // Anti-frontrunning bidding with commit-reveal pattern
    function commitBid(uint256 tokenId, bytes32 commitment) external whenNotPaused notEmergency {
        Listing storage item = listings[tokenId];
        require(item.isAuction, "Not an auction");
        require(block.timestamp < item.endTime, "Auction ended");
        
        bidCommitments[msg.sender][tokenId] = BidCommitment({
            commitment: commitment,
            timestamp: block.timestamp,
            revealed: false
        });
        
        emit BidCommitted(tokenId, msg.sender, commitment);
    }

    function revealBid(uint256 tokenId, uint256 bidAmount, bytes32 nonce) external payable whenNotPaused notEmergency nonReentrant {
        Listing storage item = listings[tokenId];
        BidCommitment storage commitment = bidCommitments[msg.sender][tokenId];
        
        require(item.isAuction, "Not an auction");
        require(block.timestamp < item.endTime, "Auction ended");
        require(commitment.commitment != bytes32(0), "No commitment found");
        require(!commitment.revealed, "Bid already revealed");
        require(block.timestamp <= commitment.timestamp + COMMITMENT_REVEAL_WINDOW, "Reveal window expired");
        
        // Verify commitment matches
        bytes32 computedCommitment = keccak256(abi.encodePacked(msg.sender, bidAmount, nonce));
        require(computedCommitment == commitment.commitment, "Invalid commitment");
        
        // Mark as revealed
        commitment.revealed = true;
        
        // Check if bid is valid
        uint256 minBidRequired = item.highestBid > 0 
            ? item.highestBid + ((item.highestBid * minBidIncreasePercent) / 10000)
            : item.price;
            
        require(bidAmount >= minBidRequired, "Bid too low");
        require(msg.value >= bidAmount, "Insufficient funds sent");
        
        // Return previous highest bid
        if (item.highestBid > 0) {
            pendingWithdrawals[item.highestBidder] += item.highestBid;
        }
        
        // Update auction state
        item.highestBid = bidAmount;
        item.highestBidder = msg.sender;
        
        // Refund excess payment
        if (msg.value > bidAmount) {
            payable(msg.sender).transfer(msg.value - bidAmount);
        }
        
        emit BidPlaced(tokenId, msg.sender, bidAmount);
    }
    
    // Simpler bidding function for those who don't want to use commit-reveal
    function placeBid(uint256 tokenId) external payable whenNotPaused notEmergency nonReentrant {
        Listing storage item = listings[tokenId];
        require(item.isAuction, "Not an auction");
        require(block.timestamp < item.endTime, "Auction ended");
        
        // Calculate minimum bid
        uint256 minBidRequired = item.highestBid > 0 
            ? item.highestBid + ((item.highestBid * minBidIncreasePercent) / 10000)
            : item.price;
            
        require(msg.value >= minBidRequired, "Bid too low");

        if (item.highestBid > 0) {
            // Use pull pattern instead of direct transfer
            pendingWithdrawals[item.highestBidder] += item.highestBid;
        }

        item.highestBid = msg.value;
        item.highestBidder = msg.sender;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    function endAuction(uint256 tokenId) external whenNotPaused nonReentrant {
        Listing storage item = listings[tokenId];
        require(item.isAuction, "Not an auction");
        require(block.timestamp >= item.endTime || msg.sender == owner(), "Auction still active");

        address seller = item.seller;
        address winner = item.highestBidder;
        uint256 amount = item.highestBid;

        delete listings[tokenId];

        if (winner != address(0)) {
            // Calculate platform fee
            uint256 fee = (amount * platformFeePercent) / 10000;
            uint256 sellerAmount = amount - fee;
            
            // Transfer NFT to winner
            pokemonNFT.safeTransferFrom(seller, winner, tokenId);
            
            // Add funds to pending withdrawals
            pendingWithdrawals[seller] += sellerAmount;
            pendingWithdrawals[feeRecipient] += fee;
            
            emit AuctionEnded(tokenId, winner, amount);
        } else {
            emit AuctionEnded(tokenId, address(0), 0);
        }
    }
    
    // Allow users to withdraw their funds (for security, using pull pattern)
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        // Reset balance before transfer to prevent reentrancy
        pendingWithdrawals[msg.sender] = 0;
        
        // Transfer funds
        payable(msg.sender).transfer(amount);
        
        emit Withdrawal(msg.sender, amount);
    }
}
