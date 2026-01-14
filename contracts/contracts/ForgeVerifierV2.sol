// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ForgeDifficulty.sol";
import "./ForgingVelocity.sol";
import "./FounderAdvantage.sol";
import "./DifficultyTriggers.sol";

interface IExcaliburToken {
    function mintForgeReward(address recipient, uint256 amount) external;
}

interface IFounderSwordsNFT {
    function depositForgeFees() external payable;
}

/**
 * @title ForgeVerifierV2
 * @dev Advanced forge verification with dynamic difficulty adjustment
 * 
 * Integrates:
 * - ForgeDifficulty: Three-layer difficulty calculation
 * - ForgingVelocity: Velocity tracking and multipliers
 * - FounderAdvantage: Discounts for early forgers
 * - DifficultyTriggers: Automatic difficulty adjustments
 */
contract ForgeVerifierV2 is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    IExcaliburToken public exsToken;
    IFounderSwordsNFT public founderSwordsNFT;
    
    ForgeDifficulty public difficultyCalculator;
    ForgingVelocity public velocityTracker;
    FounderAdvantage public founderAdvantage;
    DifficultyTriggers public difficultyTriggers;

    uint256 public constant FORGE_REWARD = 50 * 10**18; // 50 EXS
    uint256 public constant BASE_FORGE_FEE = 10_000_000; // 0.1 BTC in satoshis

    struct ForgeProof {
        bytes32 taprootAddress;
        bytes32 txHash;
        uint256 amount;
        uint256 timestamp;
        bool verified;
    }

    mapping(bytes32 => ForgeProof) public forgeProofs;
    mapping(address => uint256) public userForgeCount;
    mapping(bytes32 => bool) public usedTxHashes;
    mapping(address => uint256) public lastForgeTime; // For cooldown tracking

    uint256 public totalForgesCompleted;
    uint256 public totalForgeFees;
    uint256 public deploymentTime;
    uint256 public btcPriceUsd; // BTC price oracle value (18 decimals)

    // Cooldown settings for fairness
    uint256 public constant SEVERE_COOLDOWN = 1 hours;
    uint256 public constant MODERATE_COOLDOWN = 1 days;
    uint256 public constant COOLDOWN_PENALTY_SEVERE = 50; // 50% penalty
    uint256 public constant COOLDOWN_PENALTY_MODERATE = 10; // 10% penalty
    uint256 public constant MAX_FORGES_PER_DAY = 3; // Per address limit

    mapping(address => uint256) public forgesInLast24Hours;
    mapping(address => uint256) public lastForgeDay;

    event ForgeSubmitted(
        address indexed user,
        bytes32 indexed taprootAddress,
        bytes32 txHash,
        uint256 amount
    );
    
    event ForgeVerified(
        address indexed user,
        bytes32 indexed proofId,
        uint256 reward,
        uint256 feePaid
    );
    
    event ForgeRejected(
        address indexed user,
        bytes32 indexed proofId,
        string reason
    );
    
    event ForgeFeeCalculated(
        address indexed user,
        uint256 baseFee,
        uint256 finalFee,
        uint256 discount
    );
    
    event BtcPriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(
        address _exsToken,
        address _founderSwordsNFT,
        address _difficultyCalculator,
        address _velocityTracker,
        address _founderAdvantage,
        address _difficultyTriggers
    ) {
        require(_exsToken != address(0), "Invalid token address");
        require(_founderSwordsNFT != address(0), "Invalid NFT address");
        require(_difficultyCalculator != address(0), "Invalid difficulty calculator");
        require(_velocityTracker != address(0), "Invalid velocity tracker");
        require(_founderAdvantage != address(0), "Invalid founder advantage");
        require(_difficultyTriggers != address(0), "Invalid difficulty triggers");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);

        exsToken = IExcaliburToken(_exsToken);
        founderSwordsNFT = IFounderSwordsNFT(_founderSwordsNFT);
        difficultyCalculator = ForgeDifficulty(_difficultyCalculator);
        velocityTracker = ForgingVelocity(_velocityTracker);
        founderAdvantage = FounderAdvantage(_founderAdvantage);
        difficultyTriggers = DifficultyTriggers(_difficultyTriggers);
        
        deploymentTime = block.timestamp;
        btcPriceUsd = 50_000 * 10**18; // Default $50k
    }

    /**
     * @dev Calculates current forge fee for a user
     * @param user Address of the user
     * @return Required forge fee in satoshis
     */
    function getCurrentForgeFee(address user) public view returns (uint256) {
        // Get metrics for difficulty calculation
        uint256 forgesLastWeek = velocityTracker.getForgesLastWeek();
        uint256 daysSinceLaunch = (block.timestamp - deploymentTime) / 1 days;
        
        ForgeDifficulty.DifficultyMetrics memory metrics = ForgeDifficulty.DifficultyMetrics({
            forgeCount: totalForgesCompleted,
            forgesLastWeek: forgesLastWeek,
            daysSinceLaunch: daysSinceLaunch,
            btcPriceUsd: btcPriceUsd
        });
        
        // Calculate base fee with all multipliers
        uint256 baseFee = difficultyCalculator.calculateRequiredFee(metrics);
        
        // Apply founder advantages
        uint256 demandMultiplier = difficultyCalculator.calculateDemandMultiplier(forgesLastWeek);
        uint256 finalFee = founderAdvantage.getProtectedFee(user, baseFee, demandMultiplier);
        
        // Apply cooldown penalty if applicable
        finalFee = _applyCooldownPenalty(user, finalFee);
        
        return finalFee;
    }

    /**
     * @dev Applies cooldown penalty for frequent forging
     * @param user Address of the user
     * @param fee Base fee before penalty
     * @return Fee with cooldown penalty applied
     */
    function _applyCooldownPenalty(address user, uint256 fee) internal view returns (uint256) {
        uint256 timeSinceLastForge = block.timestamp - lastForgeTime[user];
        
        if (timeSinceLastForge < SEVERE_COOLDOWN) {
            // Less than 1 hour: 50% penalty
            return fee * (100 + COOLDOWN_PENALTY_SEVERE) / 100;
        } else if (timeSinceLastForge < MODERATE_COOLDOWN) {
            // Less than 1 day: 10% penalty
            return fee * (100 + COOLDOWN_PENALTY_MODERATE) / 100;
        }
        
        return fee; // No penalty
    }

    /**
     * @dev Checks if user can forge (rate limiting)
     * @param user Address to check
     * @return Whether user can forge
     */
    function canForge(address user) public view returns (bool) {
        uint256 currentDay = block.timestamp / 1 days;
        
        // Reset counter if it's a new day
        if (lastForgeDay[user] < currentDay) {
            return true;
        }
        
        // Check daily limit
        return forgesInLast24Hours[user] < MAX_FORGES_PER_DAY;
    }

    /**
     * @dev Submits a forge proof for verification
     * @param taprootAddress Derived Taproot address (hashed)
     * @param txHash Bitcoin transaction hash
     * @param amount Amount sent in satoshis
     */
    function submitForgeProof(
        bytes32 taprootAddress,
        bytes32 txHash,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        require(taprootAddress != bytes32(0), "Invalid taproot address");
        require(txHash != bytes32(0), "Invalid transaction hash");
        require(!usedTxHashes[txHash], "Transaction already used");
        require(canForge(msg.sender), "Daily forge limit reached");
        
        uint256 requiredFee = getCurrentForgeFee(msg.sender);
        require(amount >= requiredFee, "Insufficient forge fee");

        bytes32 proofId = keccak256(abi.encodePacked(
            msg.sender,
            taprootAddress,
            txHash,
            block.timestamp
        ));

        require(forgeProofs[proofId].timestamp == 0, "Proof already submitted");

        forgeProofs[proofId] = ForgeProof({
            taprootAddress: taprootAddress,
            txHash: txHash,
            amount: amount,
            timestamp: block.timestamp,
            verified: false
        });

        emit ForgeSubmitted(msg.sender, taprootAddress, txHash, amount);
    }

    /**
     * @dev Verifies a forge proof (called by oracle)
     * @param user Address of the user who submitted the proof
     * @param proofId Proof identifier
     * @param success Whether the verification succeeded
     * @param reason Rejection reason if verification failed
     */
    function verifyForgeProof(
        address user,
        bytes32 proofId,
        bool success,
        string calldata reason
    ) external onlyRole(ORACLE_ROLE) nonReentrant {
        ForgeProof storage proof = forgeProofs[proofId];
        require(proof.timestamp != 0, "Proof not found");
        require(!proof.verified, "Proof already verified");

        if (!success) {
            emit ForgeRejected(user, proofId, reason);
            return;
        }

        // Mark as verified
        proof.verified = true;
        usedTxHashes[proof.txHash] = true;

        // Update statistics
        totalForgesCompleted++;
        userForgeCount[user]++;
        totalForgeFees += proof.amount;
        
        // Update rate limiting
        uint256 currentDay = block.timestamp / 1 days;
        if (lastForgeDay[user] < currentDay) {
            forgesInLast24Hours[user] = 1;
            lastForgeDay[user] = currentDay;
        } else {
            forgesInLast24Hours[user]++;
        }
        
        lastForgeTime[user] = block.timestamp;

        // Record in velocity tracker
        velocityTracker.recordForge();
        
        // Record founder advantage
        founderAdvantage.recordForge(user, totalForgesCompleted);
        
        // Update difficulty triggers
        difficultyTriggers.updateForgeCount(totalForgesCompleted);

        // Mint EXS reward to user
        exsToken.mintForgeReward(user, FORGE_REWARD);

        emit ForgeVerified(user, proofId, FORGE_REWARD, proof.amount);
    }

    /**
     * @dev Updates BTC price from oracle
     * @param newPrice New BTC price in USD (18 decimals)
     */
    function updateBtcPrice(uint256 newPrice) external onlyRole(ORACLE_ROLE) {
        require(newPrice > 0, "Invalid price");
        uint256 oldPrice = btcPriceUsd;
        btcPriceUsd = newPrice;
        emit BtcPriceUpdated(oldPrice, newPrice);
    }

    /**
     * @dev Distributes accumulated forge fees to Founder Sword NFT holders
     */
    function distributeForgeFees() external payable onlyRole(FEE_MANAGER_ROLE) {
        require(msg.value > 0, "No fees to distribute");
        founderSwordsNFT.depositForgeFees{value: msg.value}();
    }

    /**
     * @dev Gets comprehensive forge statistics for a user
     * @param user Address to query
     * @return forgeCount Number of forges completed
     * @return currentFee Current required fee
     * @return canForgeNow Whether user can forge now
     * @return forgesRemaining Forges remaining today
     */
    function getUserForgeStats(address user) 
        external 
        view 
        returns (
            uint256 forgeCount,
            uint256 currentFee,
            bool canForgeNow,
            uint256 forgesRemaining
        ) 
    {
        forgeCount = userForgeCount[user];
        currentFee = getCurrentForgeFee(user);
        canForgeNow = canForge(user);
        
        uint256 currentDay = block.timestamp / 1 days;
        if (lastForgeDay[user] < currentDay) {
            forgesRemaining = MAX_FORGES_PER_DAY;
        } else {
            forgesRemaining = MAX_FORGES_PER_DAY - forgesInLast24Hours[user];
        }
    }

    /**
     * @dev Gets proof details
     * @param proofId Proof identifier
     * @return Forge proof details
     */
    function getForgeProof(bytes32 proofId) external view returns (ForgeProof memory) {
        return forgeProofs[proofId];
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Allows contract to receive ETH for fee distribution
     */
    receive() external payable {
        require(hasRole(FEE_MANAGER_ROLE, msg.sender), "Unauthorized");
    }
}
