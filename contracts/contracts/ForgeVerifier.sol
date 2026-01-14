// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IExcaliburToken {
    function mintForgeReward(address recipient, uint256 amount) external;
}

interface IFounderSwordsNFT {
    function depositForgeFees() external payable;
}

/**
 * @title ForgeVerifier
 * @dev Verifies Bitcoin payment proofs and mints EXS rewards
 * 
 * Forge Process:
 * 1. User completes Proof-of-Forge ritual off-chain
 * 2. User sends BTC to derived Taproot address
 * 3. Oracle verifies BTC payment
 * 4. User submits proof to this contract
 * 5. Contract mints 50 EXS to user
 * 6. Forge fees distributed to Founder Sword NFT holders
 */
contract ForgeVerifier is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    IExcaliburToken public exsToken;
    IFounderSwordsNFT public founderSwordsNFT;

    uint256 public constant FORGE_REWARD = 50 * 10**18; // 50 EXS
    uint256 public constant BASE_FORGE_FEE = 100_000_000; // 1 BTC in satoshis
    uint256 public constant FEE_INCREMENT = 10_000_000; // 0.1 BTC
    uint256 public constant INCREMENT_INTERVAL = 10_000; // Every 10,000 forges
    uint256 public constant MAX_FORGE_FEE = 2_100_000_000; // 21 BTC cap

    struct ForgeProof {
        bytes32 taprootAddress; // Hashed Taproot address
        bytes32 txHash; // Bitcoin transaction hash
        uint256 amount; // Amount in satoshis
        uint256 timestamp;
        bool verified;
    }

    mapping(bytes32 => ForgeProof) public forgeProofs;
    mapping(address => uint256) public userForgeCount;
    mapping(bytes32 => bool) public usedTxHashes;

    uint256 public totalForgesCompleted;
    uint256 public totalForgeFees;
    uint256 public currentForgeFee;

    event ForgeSubmitted(
        address indexed user,
        bytes32 indexed taprootAddress,
        bytes32 txHash,
        uint256 amount
    );
    event ForgeVerified(
        address indexed user,
        bytes32 indexed proofId,
        uint256 reward
    );
    event ForgeRejected(
        address indexed user,
        bytes32 indexed proofId,
        string reason
    );
    event ForgeFeeUpdated(uint256 newFee, uint256 totalForges);

    constructor(address _exsToken, address _founderSwordsNFT) {
        require(_exsToken != address(0), "Invalid token address");
        require(_founderSwordsNFT != address(0), "Invalid NFT address");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);

        exsToken = IExcaliburToken(_exsToken);
        founderSwordsNFT = IFounderSwordsNFT(_founderSwordsNFT);
        
        currentForgeFee = BASE_FORGE_FEE;
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
        require(amount >= currentForgeFee, "Insufficient forge fee");

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

        // Update forge statistics
        totalForgesCompleted++;
        userForgeCount[user]++;
        totalForgeFees += proof.amount;

        // Update forge fee if necessary
        _updateForgeFee();

        // Mint EXS reward to user
        exsToken.mintForgeReward(user, FORGE_REWARD);

        emit ForgeVerified(user, proofId, FORGE_REWARD);
    }

    /**
     * @dev Distributes accumulated forge fees to Founder Sword NFT holders
     */
    function distributeForgeFees() external payable onlyRole(FEE_MANAGER_ROLE) {
        require(msg.value > 0, "No fees to distribute");
        founderSwordsNFT.depositForgeFees{value: msg.value}();
    }

    /**
     * @dev Updates the forge fee based on total forges completed
     */
    function _updateForgeFee() internal {
        uint256 increments = totalForgesCompleted / INCREMENT_INTERVAL;
        uint256 newFee = BASE_FORGE_FEE + (increments * FEE_INCREMENT);
        
        if (newFee > MAX_FORGE_FEE) {
            newFee = MAX_FORGE_FEE;
        }

        if (newFee != currentForgeFee) {
            currentForgeFee = newFee;
            emit ForgeFeeUpdated(currentForgeFee, totalForgesCompleted);
        }
    }

    /**
     * @dev Calculates the current forge fee
     * @return Current forge fee in satoshis
     */
    function getCurrentForgeFee() external view returns (uint256) {
        return currentForgeFee;
    }

    /**
     * @dev Gets forge statistics for a user
     * @param user Address of the user
     * @return Number of forges completed
     */
    function getUserForgeCount(address user) external view returns (uint256) {
        return userForgeCount[user];
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
     * @dev Checks if a transaction hash has been used
     * @param txHash Bitcoin transaction hash
     * @return Whether the transaction has been used
     */
    function isTransactionUsed(bytes32 txHash) external view returns (bool) {
        return usedTxHashes[txHash];
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
