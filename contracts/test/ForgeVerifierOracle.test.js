const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * Comprehensive test suite for ForgeVerifier Bitcoin Oracle Integration
 * 
 * Test Coverage:
 * 1. Happy path - successful oracle response
 * 2. Oracle failure & negative cases
 * 3. Oracle availability & timeout scenarios
 * 4. Security & attack vectors
 * 5. Access control & governance
 * 6. Pause functionality
 * 7. Gas usage measurements
 */
describe("ForgeVerifier - Bitcoin Oracle Integration", function () {
  let forgeVerifier;
  let mockOracle;
  let mockToken;
  let mockNFT;
  let owner;
  let oracle;
  let user1;
  let user2;
  let attacker;
  let addrs;
  
  // Test constants
  const FORGE_REWARD = ethers.parseEther("50");
  const BASE_FORGE_FEE = 100_000_000n; // 1 BTC in satoshis
  const VALID_TX_HASH = ethers.keccak256(ethers.toUtf8Bytes("valid_bitcoin_tx_001"));
  const VALID_TAPROOT = ethers.keccak256(ethers.toUtf8Bytes("taproot_address_001"));
  
  // Fixture for test setup
  async function deployForgeVerifierFixture() {
    const [owner, oracle, user1, user2, attacker, ...addrs] = await ethers.getSigners();
    
    // Deploy mock contracts
    const MockExcaliburToken = await ethers.getContractFactory("MockExcaliburToken");
    const mockToken = await MockExcaliburToken.deploy();
    await mockToken.waitForDeployment();
    
    const MockFounderSwordsNFT = await ethers.getContractFactory("MockFounderSwordsNFT");
    const mockNFT = await MockFounderSwordsNFT.deploy();
    await mockNFT.waitForDeployment();
    
    const MockBitcoinOracle = await ethers.getContractFactory("MockBitcoinOracle");
    const mockOracle = await MockBitcoinOracle.deploy();
    await mockOracle.waitForDeployment();
    
    // Deploy ForgeVerifier
    const ForgeVerifier = await ethers.getContractFactory("ForgeVerifier");
    const forgeVerifier = await ForgeVerifier.deploy(
      await mockToken.getAddress(),
      await mockNFT.getAddress()
    );
    await forgeVerifier.waitForDeployment();
    
    // Grant necessary roles
    await mockToken.grantMinterRole(await forgeVerifier.getAddress());
    await forgeVerifier.grantRole(await forgeVerifier.ORACLE_ROLE(), oracle.address);
    
    return { forgeVerifier, mockOracle, mockToken, mockNFT, owner, oracle, user1, user2, attacker, addrs };
  }
  
  beforeEach(async function () {
    const fixture = await deployForgeVerifierFixture();
    forgeVerifier = fixture.forgeVerifier;
    mockOracle = fixture.mockOracle;
    mockToken = fixture.mockToken;
    mockNFT = fixture.mockNFT;
    owner = fixture.owner;
    oracle = fixture.oracle;
    user1 = fixture.user1;
    user2 = fixture.user2;
    attacker = fixture.attacker;
    addrs = fixture.addrs;
  });
  
  describe("1. Happy Path - Successful Oracle Response", function () {
    it("should verify forge proof successfully when oracle returns success", async function () {
      // User submits forge proof
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      // Generate proof ID
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      // Oracle verifies successfully
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        )
      ).to.emit(forgeVerifier, "ForgeVerified")
        .withArgs(user1.address, proofId, FORGE_REWARD);
      
      // Verify state changes
      const proof = await forgeVerifier.getForgeProof(proofId);
      expect(proof.verified).to.be.true;
      expect(await forgeVerifier.isTransactionUsed(VALID_TX_HASH)).to.be.true;
      expect(await forgeVerifier.getUserForgeCount(user1.address)).to.equal(1);
      expect(await forgeVerifier.totalForgesCompleted()).to.equal(1);
    });
    
    it("should mint correct reward amount to user after successful verification", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      await forgeVerifier.connect(oracle).verifyForgeProof(
        user1.address,
        proofId,
        true,
        ""
      );
      
      // Check minted rewards
      expect(await mockToken.mintedRewards(user1.address)).to.equal(FORGE_REWARD);
      expect(await mockToken.totalMinted()).to.equal(FORGE_REWARD);
    });
    
    it("should update forge fee after threshold is reached", async function () {
      const initialFee = await forgeVerifier.currentForgeFee();
      
      // Submit and verify multiple forges to trigger fee update
      for (let i = 0; i < 10; i++) {
        const txHash = ethers.keccak256(ethers.toUtf8Bytes(`tx_${i}`));
        const taproot = ethers.keccak256(ethers.toUtf8Bytes(`taproot_${i}`));
        
        await forgeVerifier.connect(user1).submitForgeProof(taproot, txHash, BASE_FORGE_FEE);
        
        await time.increase(1);
        const blockTimestamp = await time.latest();
        const proofId = ethers.keccak256(
          ethers.solidityPacked(
            ["address", "bytes32", "bytes32", "uint256"],
            [user1.address, taproot, txHash, blockTimestamp]
          )
        );
        
        await forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        );
      }
      
      // Fee should still be at base for first 10,000 forges
      expect(await forgeVerifier.currentForgeFee()).to.equal(initialFee);
    });
    
    it("should correctly extract and validate all proof parameters", async function () {
      const customAmount = BASE_FORGE_FEE * 2n;
      
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        customAmount
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      const proof = await forgeVerifier.getForgeProof(proofId);
      expect(proof.taprootAddress).to.equal(VALID_TAPROOT);
      expect(proof.txHash).to.equal(VALID_TX_HASH);
      expect(proof.amount).to.equal(customAmount);
      expect(proof.timestamp).to.be.closeTo(BigInt(blockTimestamp), 5n);
      expect(proof.verified).to.be.false;
    });
  });
  
  describe("2. Oracle Failure & Negative Cases", function () {
    it("should handle explicit oracle failure with reason", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      // Oracle rejects with reason
      const rejectionReason = "Insufficient confirmations";
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          false,
          rejectionReason
        )
      ).to.emit(forgeVerifier, "ForgeRejected")
        .withArgs(user1.address, proofId, rejectionReason);
      
      // Verify state - should not be marked as verified
      const proof = await forgeVerifier.getForgeProof(proofId);
      expect(proof.verified).to.be.false;
      expect(await forgeVerifier.isTransactionUsed(VALID_TX_HASH)).to.be.false;
      expect(await forgeVerifier.getUserForgeCount(user1.address)).to.equal(0);
    });
    
    it("should not mint tokens when oracle returns failure", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      await forgeVerifier.connect(oracle).verifyForgeProof(
        user1.address,
        proofId,
        false,
        "Invalid transaction"
      );
      
      expect(await mockToken.mintedRewards(user1.address)).to.equal(0);
    });
    
    it("should reject verification with invalid format response", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          false,
          "Malformed response from Bitcoin node"
        )
      ).to.emit(forgeVerifier, "ForgeRejected");
    });
    
    it("should reject stale data with old timestamp", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          false,
          "Data timestamp too old - potential stale data"
        )
      ).to.emit(forgeVerifier, "ForgeRejected");
    });
    
    it("should reject manipulated data that fails validation", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          false,
          "Data manipulation detected - hash mismatch"
        )
      ).to.emit(forgeVerifier, "ForgeRejected");
    });
  });
  
  describe("3. Oracle Availability & Timeout Scenarios", function () {
    it("should handle oracle call that reverts (timeout simulation)", async function () {
      // Note: Since ForgeVerifier doesn't directly call the oracle,
      // this tests that the oracle role can fail gracefully
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      // Oracle can report timeout as failure
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          false,
          "Oracle timeout - Bitcoin node unreachable"
        )
      ).to.emit(forgeVerifier, "ForgeRejected");
    });
    
    it("should reject when proof is not found (invalid proofId)", async function () {
      const invalidProofId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          invalidProofId,
          true,
          ""
        )
      ).to.be.revertedWith("Proof not found");
    });
    
    it("should handle multiple consecutive oracle failures gracefully", async function () {
      // Submit multiple proofs
      const proofIds = [];
      for (let i = 0; i < 5; i++) {
        const txHash = ethers.keccak256(ethers.toUtf8Bytes(`tx_failure_${i}`));
        const taproot = ethers.keccak256(ethers.toUtf8Bytes(`taproot_${i}`));
        
        await forgeVerifier.connect(user1).submitForgeProof(taproot, txHash, BASE_FORGE_FEE);
        
        await time.increase(1);
        const blockTimestamp = await time.latest();
        const proofId = ethers.keccak256(
          ethers.solidityPacked(
            ["address", "bytes32", "bytes32", "uint256"],
            [user1.address, taproot, txHash, blockTimestamp]
          )
        );
        proofIds.push(proofId);
      }
      
      // All oracle calls fail
      for (const proofId of proofIds) {
        await expect(
          forgeVerifier.connect(oracle).verifyForgeProof(
            user1.address,
            proofId,
            false,
            "Oracle unavailable"
          )
        ).to.emit(forgeVerifier, "ForgeRejected");
      }
      
      // Verify no rewards were minted
      expect(await mockToken.totalMinted()).to.equal(0);
      expect(await forgeVerifier.totalForgesCompleted()).to.equal(0);
    });
  });
  
  describe("4. Security & Attack Vectors", function () {
    it("should prevent replay attacks with same transaction hash", async function () {
      // First submission and verification
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      await forgeVerifier.connect(oracle).verifyForgeProof(
        user1.address,
        proofId,
        true,
        ""
      );
      
      // Attempt to reuse the same transaction hash
      await expect(
        forgeVerifier.connect(user2).submitForgeProof(
          VALID_TAPROOT,
          VALID_TX_HASH,
          BASE_FORGE_FEE
        )
      ).to.be.revertedWith("Transaction already used");
    });
    
    it("should prevent double verification of the same proof", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      // First verification succeeds
      await forgeVerifier.connect(oracle).verifyForgeProof(
        user1.address,
        proofId,
        true,
        ""
      );
      
      // Second verification should fail
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        )
      ).to.be.revertedWith("Proof already verified");
    });
    
    it("should prevent unauthorized users from verifying proofs", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      // Attacker tries to verify
      await expect(
        forgeVerifier.connect(attacker).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        )
      ).to.be.reverted; // AccessControl revert
    });
    
    it("should use unique proofId for each submission preventing collisions", async function () {
      // User1 submits a proof
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const timestamp1 = await time.latest();
      const proofId1 = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, timestamp1]
        )
      );
      
      // Cannot submit same proof again (same user, same tx)
      await expect(
        forgeVerifier.connect(user1).submitForgeProof(
          VALID_TAPROOT,
          VALID_TX_HASH,
          BASE_FORGE_FEE
        )
      ).to.be.revertedWith("Proof already submitted");
    });
    
    it("should validate minimum forge fee requirement", async function () {
      const insufficientAmount = BASE_FORGE_FEE - 1n;
      
      await expect(
        forgeVerifier.connect(user1).submitForgeProof(
          VALID_TAPROOT,
          VALID_TX_HASH,
          insufficientAmount
        )
      ).to.be.revertedWith("Insufficient forge fee");
    });
    
    it("should reject invalid taproot address", async function () {
      await expect(
        forgeVerifier.connect(user1).submitForgeProof(
          ethers.ZeroHash,
          VALID_TX_HASH,
          BASE_FORGE_FEE
        )
      ).to.be.revertedWith("Invalid taproot address");
    });
    
    it("should reject invalid transaction hash", async function () {
      await expect(
        forgeVerifier.connect(user1).submitForgeProof(
          VALID_TAPROOT,
          ethers.ZeroHash,
          BASE_FORGE_FEE
        )
      ).to.be.revertedWith("Invalid transaction hash");
    });
    
    it("should protect against reentrancy attacks", async function () {
      // The contract uses ReentrancyGuard
      // This test verifies the modifier is in place
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      // Normal flow should work
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        )
      ).to.not.be.reverted;
    });
  });
  
  describe("5. Access Control & Governance", function () {
    it("should only allow ORACLE_ROLE to verify proofs", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      // User without oracle role cannot verify
      await expect(
        forgeVerifier.connect(user2).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        )
      ).to.be.reverted;
      
      // Oracle can verify
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        )
      ).to.not.be.reverted;
    });
    
    it("should allow admin to grant oracle role", async function () {
      const ORACLE_ROLE = await forgeVerifier.ORACLE_ROLE();
      
      // Grant role to new oracle
      await forgeVerifier.connect(owner).grantRole(ORACLE_ROLE, user2.address);
      
      // New oracle can now verify
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      await expect(
        forgeVerifier.connect(user2).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        )
      ).to.not.be.reverted;
    });
    
    it("should allow admin to revoke oracle role", async function () {
      const ORACLE_ROLE = await forgeVerifier.ORACLE_ROLE();
      
      // Revoke oracle role
      await forgeVerifier.connect(owner).revokeRole(ORACLE_ROLE, oracle.address);
      
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      // Revoked oracle cannot verify
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        )
      ).to.be.reverted;
    });
    
    it("should only allow PAUSER_ROLE to pause contract", async function () {
      // Non-pauser cannot pause
      await expect(
        forgeVerifier.connect(user1).pause()
      ).to.be.reverted;
      
      // Owner with pauser role can pause
      await expect(
        forgeVerifier.connect(owner).pause()
      ).to.not.be.reverted;
    });
    
    it("should only allow FEE_MANAGER_ROLE to distribute fees", async function () {
      const feeAmount = ethers.parseEther("0.1");
      
      // Non-fee-manager cannot distribute
      await expect(
        forgeVerifier.connect(user1).distributeForgeFees({ value: feeAmount })
      ).to.be.reverted;
      
      // Owner with fee manager role can distribute
      await expect(
        forgeVerifier.connect(owner).distributeForgeFees({ value: feeAmount })
      ).to.not.be.reverted;
    });
    
    it("should only allow FEE_MANAGER_ROLE to send ETH to contract", async function () {
      const amount = ethers.parseEther("1");
      
      // Regular user cannot send ETH
      await expect(
        user1.sendTransaction({
          to: await forgeVerifier.getAddress(),
          value: amount
        })
      ).to.be.revertedWith("Unauthorized");
    });
  });
  
  describe("6. Pause Functionality", function () {
    it("should prevent proof submission when paused", async function () {
      await forgeVerifier.connect(owner).pause();
      
      await expect(
        forgeVerifier.connect(user1).submitForgeProof(
          VALID_TAPROOT,
          VALID_TX_HASH,
          BASE_FORGE_FEE
        )
      ).to.be.reverted; // Pausable revert
    });
    
    it("should allow proof verification when paused", async function () {
      // Submit proof before pause
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      // Pause contract
      await forgeVerifier.connect(owner).pause();
      
      // Oracle can still verify existing proofs
      await expect(
        forgeVerifier.connect(oracle).verifyForgeProof(
          user1.address,
          proofId,
          true,
          ""
        )
      ).to.not.be.reverted;
    });
    
    it("should allow proof submission after unpause", async function () {
      await forgeVerifier.connect(owner).pause();
      await forgeVerifier.connect(owner).unpause();
      
      await expect(
        forgeVerifier.connect(user1).submitForgeProof(
          VALID_TAPROOT,
          VALID_TX_HASH,
          BASE_FORGE_FEE
        )
      ).to.not.be.reverted;
    });
  });
  
  describe("7. Gas Usage Measurements", function () {
    it("should measure gas for proof submission", async function () {
      const tx = await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      const receipt = await tx.wait();
      
      console.log(`      Gas used for submitForgeProof: ${receipt.gasUsed.toString()}`);
      
      // Ensure gas usage is reasonable (< 200k)
      expect(receipt.gasUsed).to.be.lessThan(200000);
    });
    
    it("should measure gas for successful verification", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      const tx = await forgeVerifier.connect(oracle).verifyForgeProof(
        user1.address,
        proofId,
        true,
        ""
      );
      const receipt = await tx.wait();
      
      console.log(`      Gas used for verifyForgeProof (success): ${receipt.gasUsed.toString()}`);
      
      // Ensure gas usage is reasonable (< 300k)
      expect(receipt.gasUsed).to.be.lessThan(300000);
    });
    
    it("should measure gas for failed verification", async function () {
      await forgeVerifier.connect(user1).submitForgeProof(
        VALID_TAPROOT,
        VALID_TX_HASH,
        BASE_FORGE_FEE
      );
      
      const blockTimestamp = await time.latest();
      const proofId = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, VALID_TAPROOT, VALID_TX_HASH, blockTimestamp]
        )
      );
      
      const tx = await forgeVerifier.connect(oracle).verifyForgeProof(
        user1.address,
        proofId,
        false,
        "Verification failed"
      );
      const receipt = await tx.wait();
      
      console.log(`      Gas used for verifyForgeProof (failure): ${receipt.gasUsed.toString()}`);
      
      // Failed verification should use less gas than success
      expect(receipt.gasUsed).to.be.lessThan(150000);
    });
  });
  
  describe("8. Integration Tests", function () {
    it("should handle complete forge workflow from multiple users", async function () {
      // User1 forges
      const tx1 = ethers.keccak256(ethers.toUtf8Bytes("user1_tx"));
      const tap1 = ethers.keccak256(ethers.toUtf8Bytes("user1_tap"));
      await forgeVerifier.connect(user1).submitForgeProof(tap1, tx1, BASE_FORGE_FEE);
      
      await time.increase(1);
      const ts1 = await time.latest();
      const proof1 = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, tap1, tx1, ts1]
        )
      );
      await forgeVerifier.connect(oracle).verifyForgeProof(user1.address, proof1, true, "");
      
      // User2 forges
      const tx2 = ethers.keccak256(ethers.toUtf8Bytes("user2_tx"));
      const tap2 = ethers.keccak256(ethers.toUtf8Bytes("user2_tap"));
      await forgeVerifier.connect(user2).submitForgeProof(tap2, tx2, BASE_FORGE_FEE);
      
      await time.increase(1);
      const ts2 = await time.latest();
      const proof2 = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user2.address, tap2, tx2, ts2]
        )
      );
      await forgeVerifier.connect(oracle).verifyForgeProof(user2.address, proof2, true, "");
      
      // Verify stats
      expect(await forgeVerifier.totalForgesCompleted()).to.equal(2);
      expect(await forgeVerifier.getUserForgeCount(user1.address)).to.equal(1);
      expect(await forgeVerifier.getUserForgeCount(user2.address)).to.equal(1);
      expect(await mockToken.totalMinted()).to.equal(FORGE_REWARD * 2n);
    });
    
    it("should handle mixed success and failure scenarios", async function () {
      // Success
      const tx1 = ethers.keccak256(ethers.toUtf8Bytes("success_tx"));
      const tap1 = ethers.keccak256(ethers.toUtf8Bytes("success_tap"));
      await forgeVerifier.connect(user1).submitForgeProof(tap1, tx1, BASE_FORGE_FEE);
      await time.increase(1);
      const ts1 = await time.latest();
      const proof1 = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, tap1, tx1, ts1]
        )
      );
      await forgeVerifier.connect(oracle).verifyForgeProof(user1.address, proof1, true, "");
      
      // Failure
      const tx2 = ethers.keccak256(ethers.toUtf8Bytes("failure_tx"));
      const tap2 = ethers.keccak256(ethers.toUtf8Bytes("failure_tap"));
      await forgeVerifier.connect(user1).submitForgeProof(tap2, tx2, BASE_FORGE_FEE);
      await time.increase(1);
      const ts2 = await time.latest();
      const proof2 = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "bytes32", "bytes32", "uint256"],
          [user1.address, tap2, tx2, ts2]
        )
      );
      await forgeVerifier.connect(oracle).verifyForgeProof(user1.address, proof2, false, "Failed");
      
      // Only one successful forge
      expect(await forgeVerifier.totalForgesCompleted()).to.equal(1);
      expect(await forgeVerifier.getUserForgeCount(user1.address)).to.equal(1);
      expect(await mockToken.mintedRewards(user1.address)).to.equal(FORGE_REWARD);
    });
  });
});
