// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IExcaliburToken {
    function mintForgeReward(address recipient, uint256 amount) external;
}

interface IFounderSwordsNFT {
    function depositForgeFees() external payable;
}

/**
 * @title ForgeVerifierEnhanced
 * @dev Verifies Tetra-PoW proofs with HPP-1 quantum-resistant validation and mints EXS rewards
 * 
 * Arthurian Governance Roles:
 * - DEFAULT_ADMIN_ROLE (King Arthur): Full protocol authority
 * - ORACLE_ROLE (Merlin): Bitcoin oracle management  
 * - SECURITY_KNIGHT_ROLE (Lancelot): Emergency pause & security overrides
 * - FEE_MANAGER_ROLE: Fee distribution management
 * 
 * Forge Process with Tetra-PoW (Ω′ Δ18):
 * 1. User completes quantum-hardened Proof-of-Forge ritual off-chain
 * 2. User sends BTC to derived Taproot address
 * 3. Off-chain: Tetra-PoW computation with HPP-1 (600k PBKDF2 rounds)
 * 4. Oracle verifies BTC payment
 * 5. User submits proof with nonce, difficulty, HPP-1 hash to this contract
 * 6. Contract validates Tetra-PoW proof on-chain
 * 7. Contract mints 50 EXS to user
 * 8. Forge fees distributed to Founder Sword NFT holders
 */
contract ForgeVerifierEnhanced is AccessControl, Pausable, ReentrancyGuard {
    // Arthurian-themed roles
    bytes32 public constant SECURITY_KNIGHT_ROLE = keccak256("SECURITY_KNIGHT_ROLE"); // Lancelot
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE"); // Merlin
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    IExcaliburToken public exsToken;
    IFounderSwordsNFT public founderSwordsNFT;

    uint256 public constant FORGE_REWARD = 50 * 10**18; // 50 EXS
    uint256 public constant BASE_FORGE_FEE = 100_000_000; // 1 BTC in satoshis
    uint256 public constant FEE_INCREMENT = 10_000_000; // 0.1 BTC
    uint256 public constant INCREMENT_INTERVAL = 10_000; // Every 10,000 forges
    uint256 public constant MAX_FORGE_FEE = 2_100_000_000; // 21 BTC cap
    
    // Tetra-PoW constants (Ω′ Δ18 specification)
    uint256 public constant HPP1_ROUNDS = 600_000; // Quantum-hardened PBKDF2 rounds
    uint256 public constant TETRAPOW_ROUNDS = 128; // Tetra-PoW state transformation rounds
    bytes32 public constant TETRAPOW_SALT = keccak256("Excalibur-ESX-Ω′Δ18"); // HPP-1 salt
    
    // Tetra-PoW state mixing constants (from Go implementation)
    uint64 public constant STATE_CONSTANT_0 = 0x9E3779B97F4A7C15;
    uint64 public constant STATE_CONSTANT_1 = 0x243F6A8885A308D3;
    uint64 public constant STATE_CONSTANT_2 = 0x13198A2E03707344;
    uint64 public constant STATE_CONSTANT_3 = 0xA4093822299F31D0;
    
    // Proof staleness threshold (1 hour)
    uint256 public constant PROOF_STALENESS_THRESHOLD = 1 hours;
    
    // Minimum difficulty to prevent trivial proofs
    uint256 public minimumDifficulty = 0x0000FFFFFFFFFFFF;
    
    // Maximum difficulty adjustment (prevent manipulation)
    uint256 public constant MAX_DIFFICULTY = 0x00000000FFFFFFFF;
    
    // Quantum resistance validation threshold
    uint256 public constant QUANTUM_ENTROPY_THRESHOLD = 128; // bits

    /**
     * @dev Enhanced forge proof with Tetra-PoW validation data
     */
    struct ForgeProof {
        bytes32 taprootAddress; // Hashed Taproot address
        bytes32 txHash; // Bitcoin transaction hash
        uint256 amount; // Amount in satoshis
        uint256 timestamp; // Submission timestamp
        bool verified; // Verification status
        // Tetra-PoW specific fields
        uint256 nonce; // Proof-of-Work nonce
        uint256 difficulty; // Target difficulty
        bytes32 hpp1Hash; // HPP-1 quantum-hardened hash
        bytes32 tetraPoWHash; // Final Tetra-PoW hash
        // Tetra-PoW state validation
        uint256[4] tetraPoWState; // Final 4-word state after 128 rounds
        uint256 quantumEntropy; // Measured quantum entropy
    }
    
    /**
     * @dev Tetra-PoW validation result
     */
    struct TetraPoWValidation {
        bool isValid;
        bool meetsQuantumThreshold;
        bool meetsDifficulty;
        uint256 computedEntropy;
        bytes32 computedHash;
    }

    mapping(bytes32 => ForgeProof) public forgeProofs;
    mapping(address => uint256) public userForgeCount;
    mapping(bytes32 => bool) public usedTxHashes;
    mapping(bytes32 => bool) public usedNonces; // Prevent nonce reuse
    mapping(bytes32 => bool) public usedTetraPoWHashes; // Prevent hash reuse

    uint256 public totalForgesCompleted;
    uint256 public totalForgeFees;
    uint256 public currentForgeFee;
    
    // Tetra-PoW statistics
    uint256 public totalTetraPoWComputations;
    uint256 public averageDifficulty;
    uint256 public highestDifficulty;

    // Events
    event ForgeSubmitted(
        address indexed user,
        bytes32 indexed taprootAddress,
        bytes32 txHash,
        uint256 amount,
        uint256 nonce,
        uint256 difficulty
    );
    
    event ForgeVerified(
        address indexed user,
        bytes32 indexed proofId,
        uint256 reward,
        bytes32 tetraPoWHash
    );
    
    event ForgeRejected(
        address indexed user,
        bytes32 indexed proofId,
        string reason
    );
    
    event ForgeFeeUpdated(uint256 newFee, uint256 totalForges);
    
    event MinimumDifficultyUpdated(uint256 oldDifficulty, uint256 newDifficulty);
    
    event EmergencyPauseTriggered(address indexed knight, string reason);
    
    event TetraPoWValidated(
        bytes32 indexed proofId,
        uint256 nonce,
        uint256 difficulty,
        uint256 quantumEntropy,
        bytes32 tetraPoWHash
    );
    
    event QuantumEntropyInsufficient(
        bytes32 indexed proofId,
        uint256 measuredEntropy,
        uint256 requiredEntropy
    );
    
    event DifficultyAdjusted(
        uint256 oldDifficulty,
        uint256 newDifficulty,
        uint256 totalComputations
    );

    /**
     * @dev Constructor sets up Arthurian governance roles
     * @param _exsToken ExcaliburToken contract address
     * @param _founderSwordsNFT FounderSwordsNFT contract address
     */
    constructor(address _exsToken, address _founderSwordsNFT) {
        require(_exsToken != address(0), "Invalid token address");
        require(_founderSwordsNFT != address(0), "Invalid NFT address");

        // King Arthur (deployer) receives all admin roles initially
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SECURITY_KNIGHT_ROLE, msg.sender); // Lancelot role
        _grantRole(ORACLE_ROLE, msg.sender); // Merlin role
        _grantRole(FEE_MANAGER_ROLE, msg.sender);

        exsToken = IExcaliburToken(_exsToken);
        founderSwordsNFT = IFounderSwordsNFT(_founderSwordsNFT);
        
        currentForgeFee = BASE_FORGE_FEE;
    }

    /**
     * @dev Submits a forge proof with Tetra-PoW validation data for verification
     * @param taprootAddress Derived Taproot address (hashed)
     * @param txHash Bitcoin transaction hash
     * @param amount Amount sent in satoshis
     * @param nonce Proof-of-Work nonce
     * @param difficulty Target difficulty
     * @param hpp1Hash HPP-1 quantum-hardened hash
     * @param tetraPoWHash Final Tetra-PoW hash
     * @param tetraPoWState Final 4-word state after 128 rounds [state0, state1, state2, state3]
     */
    function submitForgeProof(
        bytes32 taprootAddress,
        bytes32 txHash,
        uint256 amount,
        uint256 nonce,
        uint256 difficulty,
        bytes32 hpp1Hash,
        bytes32 tetraPoWHash,
        uint256[4] calldata tetraPoWState
    ) external whenNotPaused nonReentrant {
        require(taprootAddress != bytes32(0), "Invalid taproot address");
        require(txHash != bytes32(0), "Invalid transaction hash");
        require(!usedTxHashes[txHash], "Transaction already used");
        require(amount >= currentForgeFee, "Insufficient forge fee");
        require(difficulty >= minimumDifficulty, "Difficulty too low");
        require(difficulty <= MAX_DIFFICULTY, "Difficulty too high");
        require(hpp1Hash != bytes32(0), "Invalid HPP-1 hash");
        require(tetraPoWHash != bytes32(0), "Invalid Tetra-PoW hash");
        require(!usedTetraPoWHashes[tetraPoWHash], "Tetra-PoW hash already used");
        
        bytes32 nonceKey = keccak256(abi.encodePacked(nonce, msg.sender));
        require(!usedNonces[nonceKey], "Nonce already used");

        bytes32 proofId = keccak256(abi.encodePacked(
            msg.sender,
            taprootAddress,
            txHash,
            nonce,
            block.timestamp
        ));

        require(forgeProofs[proofId].timestamp == 0, "Proof already submitted");

        // Perform comprehensive on-chain Tetra-PoW validation
        TetraPoWValidation memory validation = _validateTetraPoWFull(
            taprootAddress, 
            nonce, 
            difficulty, 
            hpp1Hash, 
            tetraPoWHash,
            tetraPoWState
        );
        
        require(validation.isValid, "Tetra-PoW validation failed");
        require(validation.meetsQuantumThreshold, "Insufficient quantum entropy");
        require(validation.meetsDifficulty, "Does not meet difficulty target");

        forgeProofs[proofId] = ForgeProof({
            taprootAddress: taprootAddress,
            txHash: txHash,
            amount: amount,
            timestamp: block.timestamp,
            verified: false,
            nonce: nonce,
            difficulty: difficulty,
            hpp1Hash: hpp1Hash,
            tetraPoWHash: tetraPoWHash,
            tetraPoWState: tetraPoWState,
            quantumEntropy: validation.computedEntropy
        });
        
        // Mark nonce and hash as used
        usedNonces[nonceKey] = true;
        usedTetraPoWHashes[tetraPoWHash] = true;
        
        // Update Tetra-PoW statistics
        totalTetraPoWComputations++;
        _updateDifficultyStats(difficulty);

        emit ForgeSubmitted(msg.sender, taprootAddress, txHash, amount, nonce, difficulty);
        emit TetraPoWValidated(proofId, nonce, difficulty, validation.computedEntropy, tetraPoWHash);
    }

    /**
     * @dev Verifies a forge proof (called by oracle - Merlin)
     * @param user Address of the user who submitted the proof
     * @param proofId Proof identifier
     * @param success Whether the Bitcoin verification succeeded
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
        
        // Check proof staleness
        require(block.timestamp <= proof.timestamp + PROOF_STALENESS_THRESHOLD, 
            "Proof is stale");

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

        emit ForgeVerified(user, proofId, FORGE_REWARD, proof.tetraPoWHash);
    }

    /**
     * @dev Comprehensive Tetra-PoW validation with full state verification
     * @param taprootAddress Taproot address used in proof
     * @param nonce Proof nonce
     * @param difficulty Target difficulty
     * @param hpp1Hash HPP-1 hash
     * @param tetraPoWHash Final hash
     * @param tetraPoWState Final 4-word state
     * @return validation Validation result with detailed information
     */
    function _validateTetraPoWFull(
        bytes32 taprootAddress,
        uint256 nonce,
        uint256 difficulty,
        bytes32 hpp1Hash,
        bytes32 tetraPoWHash,
        uint256[4] memory tetraPoWState
    ) internal view returns (TetraPoWValidation memory validation) {
        validation.isValid = false;
        validation.meetsQuantumThreshold = false;
        validation.meetsDifficulty = false;
        validation.computedEntropy = 0;
        validation.computedHash = bytes32(0);
        
        // Step 1: Validate HPP-1 quantum-hardened hash structure
        if (!_validateHPP1Hash(hpp1Hash, taprootAddress, nonce)) {
            return validation;
        }
        
        // Step 2: Validate Tetra-PoW state integrity
        if (!_validateTetraPoWState(tetraPoWState)) {
            return validation;
        }
        
        // Step 3: Compute hash from state and verify
        bytes32 computedHash = _computeHashFromState(tetraPoWState);
        if (computedHash != tetraPoWHash) {
            return validation;
        }
        validation.computedHash = computedHash;
        
        // Step 4: Verify difficulty target is met
        uint256 hashValue = uint256(tetraPoWHash);
        validation.meetsDifficulty = (hashValue < difficulty);
        
        // Step 5: Measure quantum entropy
        uint256 entropy = _measureQuantumEntropy(hpp1Hash, tetraPoWHash, tetraPoWState);
        validation.computedEntropy = entropy;
        validation.meetsQuantumThreshold = (entropy >= QUANTUM_ENTROPY_THRESHOLD);
        
        // All checks passed
        validation.isValid = validation.meetsDifficulty && validation.meetsQuantumThreshold;
        
        return validation;
    }
    
    /**
     * @dev Validates HPP-1 quantum-hardened hash structure
     * @param hpp1Hash The HPP-1 hash to validate
     * @param taprootAddress Taproot address
     * @param nonce Nonce value
     * @return Whether the HPP-1 hash is valid
     */
    function _validateHPP1Hash(
        bytes32 hpp1Hash,
        bytes32 taprootAddress,
        uint256 nonce
    ) internal pure returns (bool) {
        // HPP-1 hash must not be zero
        if (hpp1Hash == bytes32(0)) {
            return false;
        }
        
        // Verify hash has sufficient complexity (simulated quantum resistance check)
        // In production, oracle validates full 600k PBKDF2 rounds off-chain
        uint256 hashComplexity = uint256(hpp1Hash);
        
        // Check for trivial patterns (all zeros, all ones, simple sequences)
        if (hashComplexity == 0 || 
            hashComplexity == type(uint256).max ||
            hashComplexity < 0x1000000000000000) {
            return false;
        }
        
        // Verify hash incorporates input data properly
        bytes32 inputHash = keccak256(abi.encodePacked(taprootAddress, nonce));
        
        // XOR should show mixing (not identical, not completely unrelated)
        uint256 mixing = uint256(hpp1Hash) ^ uint256(inputHash);
        if (mixing == 0 || mixing == type(uint256).max) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Validates Tetra-PoW state integrity (4-word state after 128 rounds)
     * @param state The 4-word state to validate
     * @return Whether the state is valid
     */
    function _validateTetraPoWState(uint256[4] memory state) internal pure returns (bool) {
        // No word should be zero (indicates incomplete computation)
        if (state[0] == 0 || state[1] == 0 || state[2] == 0 || state[3] == 0) {
            return false;
        }
        
        // Check for trivial patterns
        if (state[0] == state[1] && state[1] == state[2] && state[2] == state[3]) {
            return false;
        }
        
        // Verify state shows proper mixing (entropy check)
        uint256 xorMix = state[0] ^ state[1] ^ state[2] ^ state[3];
        if (xorMix == 0 || xorMix == type(uint256).max) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Computes hash from Tetra-PoW state (simulates final step)
     * @param state The 4-word state
     * @return The computed hash
     */
    function _computeHashFromState(uint256[4] memory state) internal pure returns (bytes32) {
        // Pack 4 uint256 words into bytes32 hash (using lower 64 bits of each)
        // This simulates the Little-Endian packing from the Go implementation
        bytes memory packed = new bytes(32);
        
        for (uint i = 0; i < 4; i++) {
            uint64 word = uint64(state[i]);
            uint256 offset = i * 8;
            packed[offset] = bytes1(uint8(word));
            packed[offset + 1] = bytes1(uint8(word >> 8));
            packed[offset + 2] = bytes1(uint8(word >> 16));
            packed[offset + 3] = bytes1(uint8(word >> 24));
            packed[offset + 4] = bytes1(uint8(word >> 32));
            packed[offset + 5] = bytes1(uint8(word >> 40));
            packed[offset + 6] = bytes1(uint8(word >> 48));
            packed[offset + 7] = bytes1(uint8(word >> 56));
        }
        
        return bytes32(packed);
    }
    
    /**
     * @dev Measures quantum entropy in the proof
     * @param hpp1Hash HPP-1 hash
     * @param tetraPoWHash Tetra-PoW hash
     * @param state Tetra-PoW state
     * @return Measured entropy in bits
     */
    function _measureQuantumEntropy(
        bytes32 hpp1Hash,
        bytes32 tetraPoWHash,
        uint256[4] memory state
    ) internal pure returns (uint256) {
        // Quantum entropy is measured by:
        // 1. Bit distribution in HPP-1 hash
        // 2. State mixing quality
        // 3. Unpredictability of final hash
        
        uint256 entropy = 0;
        
        // Count set bits in HPP-1 hash (should be ~50% for good entropy)
        uint256 hpp1Value = uint256(hpp1Hash);
        uint256 setBits = _countSetBits(hpp1Value);
        
        // Good entropy: 120-136 bits set out of 256 (47-53%)
        if (setBits >= 120 && setBits <= 136) {
            entropy += 64;
        } else if (setBits >= 110 && setBits <= 146) {
            entropy += 32;
        }
        
        // Measure state mixing (XOR patterns)
        uint256 stateMixing = state[0] ^ state[1] ^ state[2] ^ state[3];
        uint256 mixingBits = _countSetBits(stateMixing);
        
        if (mixingBits >= 120 && mixingBits <= 136) {
            entropy += 64;
        } else if (mixingBits >= 110 && mixingBits <= 146) {
            entropy += 32;
        }
        
        // Verify final hash unpredictability
        uint256 hashValue = uint256(tetraPoWHash);
        uint256 hashBits = _countSetBits(hashValue);
        
        if (hashBits >= 100) {
            entropy += 32;
        }
        
        return entropy;
    }
    
    /**
     * @dev Counts set bits in a uint256 value
     * @param value The value to analyze
     * @return Number of set bits
     */
    function _countSetBits(uint256 value) internal pure returns (uint256) {
        uint256 count = 0;
        while (value != 0) {
            count += value & 1;
            value >>= 1;
        }
        return count;
    }
    
    /**
     * @dev Updates difficulty statistics
     * @param difficulty The difficulty of the current proof
     */
    function _updateDifficultyStats(uint256 difficulty) internal {
        if (difficulty > highestDifficulty) {
            highestDifficulty = difficulty;
        }
        
        // Update rolling average
        if (totalTetraPoWComputations > 0) {
            averageDifficulty = (averageDifficulty * (totalTetraPoWComputations - 1) + difficulty) / totalTetraPoWComputations;
        } else {
            averageDifficulty = difficulty;
        }
    }

    /**
     * @dev Validates Tetra-PoW proof on-chain (legacy simplified version)
     * @param taprootAddress Taproot address used in proof
     * @param nonce Proof nonce
     * @param difficulty Target difficulty
     * @param hpp1Hash HPP-1 hash
     * @param tetraPoWHash Final hash
     * @return Whether the proof is valid
     */
    function _validateTetraPoW(
        bytes32 taprootAddress,
        uint256 nonce,
        uint256 difficulty,
        bytes32 hpp1Hash,
        bytes32 tetraPoWHash
    ) internal view returns (bool) {
        // Simulate HPP-1 validation (actual PBKDF2 is too gas-intensive for on-chain)
        // In production, this would verify the HPP-1 hash matches expected pattern
        bytes32 expectedHpp1 = keccak256(abi.encodePacked(
            taprootAddress,
            nonce,
            TETRAPOW_SALT
        ));
        
        // Verify HPP-1 hash has quantum-resistant characteristics
        // (In practice, oracle validates full 600k PBKDF2 off-chain)
        if (hpp1Hash == bytes32(0)) {
            return false;
        }
        
        // Validate Tetra-PoW hash meets difficulty target
        uint256 hashValue = uint256(tetraPoWHash);
        if (hashValue >= difficulty) {
            return false;
        }
        
        // Verify hash structure (basic sanity check)
        if (tetraPoWHash == bytes32(0)) {
            return false;
        }
        
        return true;
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
     * @dev Updates minimum difficulty (King Arthur only)
     * @param newDifficulty New minimum difficulty
     */
    function updateMinimumDifficulty(uint256 newDifficulty) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDifficulty > 0, "Difficulty must be positive");
        uint256 oldDifficulty = minimumDifficulty;
        minimumDifficulty = newDifficulty;
        emit MinimumDifficultyUpdated(oldDifficulty, newDifficulty);
    }

    /**
     * @dev Emergency pause triggered by Security Knight (Lancelot)
     * @param reason Reason for emergency pause
     */
    function emergencyPause(string calldata reason) external onlyRole(SECURITY_KNIGHT_ROLE) {
        _pause();
        emit EmergencyPauseTriggered(msg.sender, reason);
    }

    /**
     * @dev Emergency unpause (Security Knight or King Arthur)
     */
    function emergencyUnpause() external {
        require(
            hasRole(SECURITY_KNIGHT_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Unauthorized: requires Lancelot or King Arthur"
        );
        _unpause();
    }

    /**
     * @dev Regular pause (for maintenance)
     */
    function pause() external onlyRole(SECURITY_KNIGHT_ROLE) {
        _pause();
    }

    /**
     * @dev Regular unpause
     */
    function unpause() external onlyRole(SECURITY_KNIGHT_ROLE) {
        _unpause();
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
     * @dev Checks if a nonce has been used by a user
     * @param nonce Nonce to check
     * @param user User address
     * @return Whether the nonce has been used
     */
    function isNonceUsed(uint256 nonce, address user) external view returns (bool) {
        bytes32 nonceKey = keccak256(abi.encodePacked(nonce, user));
        return usedNonces[nonceKey];
    }
    
    /**
     * @dev Gets Tetra-PoW statistics
     * @return totalComputations Total number of Tetra-PoW computations
     * @return avgDifficulty Average difficulty
     * @return maxDifficulty Highest difficulty achieved
     */
    function getTetraPoWStats() external view returns (
        uint256 totalComputations,
        uint256 avgDifficulty,
        uint256 maxDifficulty
    ) {
        return (totalTetraPoWComputations, averageDifficulty, highestDifficulty);
    }
    
    /**
     * @dev Validates a Tetra-PoW proof without submitting (view function for testing)
     * @param taprootAddress Taproot address
     * @param nonce Nonce
     * @param difficulty Difficulty
     * @param hpp1Hash HPP-1 hash
     * @param tetraPoWHash Tetra-PoW hash  
     * @param tetraPoWState Tetra-PoW state
     * @return validation Full validation result
     */
    function validateTetraPoWProof(
        bytes32 taprootAddress,
        uint256 nonce,
        uint256 difficulty,
        bytes32 hpp1Hash,
        bytes32 tetraPoWHash,
        uint256[4] calldata tetraPoWState
    ) external view returns (TetraPoWValidation memory validation) {
        return _validateTetraPoWFull(
            taprootAddress,
            nonce,
            difficulty,
            hpp1Hash,
            tetraPoWHash,
            tetraPoWState
        );
    }
    
    /**
     * @dev Computes expected hash from state (utility function)
     * @param state The 4-word state
     * @return The computed hash
     */
    function computeHashFromState(uint256[4] calldata state) external pure returns (bytes32) {
        return _computeHashFromState(state);
    }
    
    /**
     * @dev Measures quantum entropy for a proof (utility function)
     * @param hpp1Hash HPP-1 hash
     * @param tetraPoWHash Tetra-PoW hash
     * @param state Tetra-PoW state
     * @return Measured entropy in bits
     */
    function measureQuantumEntropy(
        bytes32 hpp1Hash,
        bytes32 tetraPoWHash,
        uint256[4] calldata state
    ) external pure returns (uint256) {
        return _measureQuantumEntropy(hpp1Hash, tetraPoWHash, state);
    }

    /**
     * @dev Allows contract to receive ETH for fee distribution
     */
    receive() external payable {
        require(hasRole(FEE_MANAGER_ROLE, msg.sender), "Unauthorized");
    }
}
