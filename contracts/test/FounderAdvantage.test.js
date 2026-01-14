const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FounderAdvantage", function () {
  let founderAdvantage;
  let owner, manager, founder1, founder2, nonFounder;

  beforeEach(async function () {
    [owner, manager, founder1, founder2, nonFounder] = await ethers.getSigners();
    
    const FounderAdvantage = await ethers.getContractFactory("FounderAdvantage");
    founderAdvantage = await FounderAdvantage.deploy();
    await founderAdvantage.waitForDeployment();
    
    // Grant manager role
    const FORGE_MANAGER_ROLE = await founderAdvantage.FORGE_MANAGER_ROLE();
    await founderAdvantage.grantRole(FORGE_MANAGER_ROLE, manager.address);
  });

  describe("Founder Registration", function () {
    it("Should register founder on first forge", async function () {
      await founderAdvantage.connect(manager).recordForge(founder1.address, 0);
      
      const isFounder = await founderAdvantage.isFounder(founder1.address);
      expect(isFounder).to.be.true;
    });

    it("Should emit FounderRegistered event", async function () {
      await expect(
        founderAdvantage.connect(manager).recordForge(founder1.address, 0)
      ).to.emit(founderAdvantage, "FounderRegistered");
    });

    it("Should not register founder after cutoff", async function () {
      // Set cutoff at 1,000 forges
      await founderAdvantage.setFounderCutoff(
        (await ethers.provider.getBlock('latest')).number + 1000,
        1000
      );
      
      // Record forge at count 1001 (after cutoff)
      await founderAdvantage.connect(manager).recordForge(founder1.address, 1001);
      
      const isFounder = await founderAdvantage.isFounder(founder1.address);
      expect(isFounder).to.be.false;
    });

    it("Should increment forge count", async function () {
      await founderAdvantage.connect(manager).recordForge(founder1.address, 0);
      await founderAdvantage.connect(manager).recordForge(founder1.address, 1);
      await founderAdvantage.connect(manager).recordForge(founder1.address, 2);
      
      const status = await founderAdvantage.getFounderStatus(founder1.address);
      expect(status.forgeCount).to.equal(3);
    });
  });

  describe("Discount Calculation", function () {
    beforeEach(async function () {
      // Register founder1
      await founderAdvantage.connect(manager).recordForge(founder1.address, 0);
    });

    it("Should give 25% discount for first 10 forges", async function () {
      for (let i = 0; i < 5; i++) {
        const discount = await founderAdvantage.getDiscount(founder1.address);
        expect(discount).to.equal(25);
        
        if (i < 4) {
          await founderAdvantage.connect(manager).recordForge(founder1.address, i);
        }
      }
    });

    it("Should give 10% discount after first 10 forges", async function () {
      // Record 10 forges
      for (let i = 0; i < 10; i++) {
        await founderAdvantage.connect(manager).recordForge(founder1.address, i);
      }
      
      const discount = await founderAdvantage.getDiscount(founder1.address);
      expect(discount).to.equal(10);
    });

    it("Should give 10% discount permanently", async function () {
      // Record 100 forges
      for (let i = 0; i < 100; i++) {
        await founderAdvantage.connect(manager).recordForge(founder1.address, i);
      }
      
      const discount = await founderAdvantage.getDiscount(founder1.address);
      expect(discount).to.equal(10);
    });

    it("Should give no discount to non-founders", async function () {
      const discount = await founderAdvantage.getDiscount(nonFounder.address);
      expect(discount).to.equal(0);
    });
  });

  describe("Discounted Fee Calculation", function () {
    beforeEach(async function () {
      await founderAdvantage.connect(manager).recordForge(founder1.address, 0);
    });

    it("Should calculate discounted fee correctly (25%)", async function () {
      const baseFee = 10_000_000; // 0.1 BTC
      const discountedFee = await founderAdvantage.getDiscountedFee(
        founder1.address,
        baseFee
      );
      
      // 25% discount = 75% of original = 7,500,000
      expect(discountedFee).to.equal(7_500_000);
    });

    it("Should calculate discounted fee correctly (10%)", async function () {
      // Record 10 forges to get permanent discount
      for (let i = 0; i < 10; i++) {
        await founderAdvantage.connect(manager).recordForge(founder1.address, i);
      }
      
      const baseFee = 10_000_000;
      const discountedFee = await founderAdvantage.getDiscountedFee(
        founder1.address,
        baseFee
      );
      
      // 10% discount = 90% of original = 9,000,000
      expect(discountedFee).to.equal(9_000_000);
    });

    it("Should return full fee for non-founders", async function () {
      const baseFee = 10_000_000;
      const discountedFee = await founderAdvantage.getDiscountedFee(
        nonFounder.address,
        baseFee
      );
      
      expect(discountedFee).to.equal(baseFee);
    });
  });

  describe("Demand Shield", function () {
    beforeEach(async function () {
      await founderAdvantage.connect(manager).recordForge(founder1.address, 0);
    });

    it("Should shield founders from demand multiplier for first 100 forges", async function () {
      const isShielded = await founderAdvantage.isDemandShielded(founder1.address);
      expect(isShielded).to.be.true;
    });

    it("Should remove shield after 100 forges", async function () {
      // Record 100 forges
      for (let i = 0; i < 100; i++) {
        await founderAdvantage.connect(manager).recordForge(founder1.address, i);
      }
      
      const isShielded = await founderAdvantage.isDemandShielded(founder1.address);
      expect(isShielded).to.be.false;
    });

    it("Should not shield non-founders", async function () {
      const isShielded = await founderAdvantage.isDemandShielded(nonFounder.address);
      expect(isShielded).to.be.false;
    });
  });

  describe("Protected Fee Calculation", function () {
    beforeEach(async function () {
      await founderAdvantage.connect(manager).recordForge(founder1.address, 0);
    });

    it("Should ignore demand multiplier when shielded", async function () {
      const baseFee = 10_000_000;
      const demandMultiplier = 150; // 1.5x
      
      const protectedFee = await founderAdvantage.getProtectedFee(
        founder1.address,
        baseFee,
        demandMultiplier
      );
      
      // Should only apply discount, ignore demand
      // 25% discount = 7,500,000
      expect(protectedFee).to.equal(7_500_000);
    });

    it("Should apply demand multiplier when not shielded", async function () {
      // Record 100 forges to remove shield
      for (let i = 0; i < 100; i++) {
        await founderAdvantage.connect(manager).recordForge(founder1.address, i);
      }
      
      const baseFee = 10_000_000;
      const demandMultiplier = 150; // 1.5x
      
      const protectedFee = await founderAdvantage.getProtectedFee(
        founder1.address,
        baseFee,
        demandMultiplier
      );
      
      // 10% discount = 9,000,000
      // 1.5x demand = 13,500,000
      expect(protectedFee).to.equal(13_500_000);
    });

    it("Should apply demand multiplier to non-founders", async function () {
      const baseFee = 10_000_000;
      const demandMultiplier = 150;
      
      const protectedFee = await founderAdvantage.getProtectedFee(
        nonFounder.address,
        baseFee,
        demandMultiplier
      );
      
      // No discount, full demand
      // 10,000,000 * 1.5 = 15,000,000
      expect(protectedFee).to.equal(15_000_000);
    });
  });

  describe("Founder Cutoff Management", function () {
    it("Should set founder cutoff", async function () {
      const futureBlock = (await ethers.provider.getBlock('latest')).number + 1000;
      
      await expect(
        founderAdvantage.setFounderCutoff(futureBlock, 500)
      ).to.emit(founderAdvantage, "FounderCutoffSet");
      
      expect(await founderAdvantage.founderCutoffBlock()).to.equal(futureBlock);
      expect(await founderAdvantage.founderCutoffForges()).to.equal(500);
    });

    it("Should only allow admin to set cutoff", async function () {
      const [, , other] = await ethers.getSigners();
      
      await expect(
        founderAdvantage.connect(other).setFounderCutoff(1000, 500)
      ).to.be.reverted;
    });

    it("Should reject cutoff in the past", async function () {
      await expect(
        founderAdvantage.setFounderCutoff(0, 500)
      ).to.be.revertedWith("Block number must be in future");
    });
  });

  describe("Founder Advantages Query", function () {
    beforeEach(async function () {
      await founderAdvantage.connect(manager).recordForge(founder1.address, 0);
    });

    it("Should return comprehensive advantages", async function () {
      const advantages = await founderAdvantage.getFounderAdvantages(founder1.address);
      
      expect(advantages.isFounder_).to.be.true;
      expect(advantages.forgeCount).to.equal(1);
      expect(advantages.currentDiscount).to.equal(25);
      expect(advantages.isDemandShielded_).to.be.true;
      expect(advantages.forgesUntilShieldEnd).to.equal(99);
    });

    it("Should show decreasing shield countdown", async function () {
      for (let i = 0; i < 50; i++) {
        await founderAdvantage.connect(manager).recordForge(founder1.address, i);
      }
      
      const advantages = await founderAdvantage.getFounderAdvantages(founder1.address);
      expect(advantages.forgesUntilShieldEnd).to.equal(50);
    });

    it("Should show zero shield countdown when not shielded", async function () {
      for (let i = 0; i < 100; i++) {
        await founderAdvantage.connect(manager).recordForge(founder1.address, i);
      }
      
      const advantages = await founderAdvantage.getFounderAdvantages(founder1.address);
      expect(advantages.forgesUntilShieldEnd).to.equal(0);
    });
  });

  describe("Manual Founder Registration", function () {
    it("Should allow admin to manually register founder", async function () {
      await founderAdvantage.manuallyRegisterFounder(founder2.address, 5);
      
      const status = await founderAdvantage.getFounderStatus(founder2.address);
      expect(status.isFounder).to.be.true;
      expect(status.forgeCount).to.equal(5);
    });

    it("Should only allow admin to manually register", async function () {
      await expect(
        founderAdvantage.connect(nonFounder).manuallyRegisterFounder(founder2.address, 5)
      ).to.be.reverted;
    });

    it("Should not allow re-registration", async function () {
      await founderAdvantage.connect(manager).recordForge(founder1.address, 0);
      
      await expect(
        founderAdvantage.manuallyRegisterFounder(founder1.address, 10)
      ).to.be.revertedWith("Already a founder");
    });
  });
});
