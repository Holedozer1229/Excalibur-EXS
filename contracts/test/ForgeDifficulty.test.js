const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ForgeDifficulty", function () {
  let forgeDifficulty;
  
  beforeEach(async function () {
    const ForgeDifficulty = await ethers.getContractFactory("ForgeDifficulty");
    forgeDifficulty = await ForgeDifficulty.deploy();
    await forgeDifficulty.waitForDeployment();
  });

  describe("Base Difficulty Calculation", function () {
    it("Should start at 0.1 BTC (10,000,000 satoshis)", async function () {
      const baseFee = await forgeDifficulty.calculateBaseDifficulty(0);
      expect(baseFee).to.equal(10_000_000);
    });

    it("Should remain constant for first 2,016 forges", async function () {
      const fee1 = await forgeDifficulty.calculateBaseDifficulty(0);
      const fee1000 = await forgeDifficulty.calculateBaseDifficulty(1000);
      const fee2015 = await forgeDifficulty.calculateBaseDifficulty(2015);
      
      expect(fee1).to.equal(10_000_000);
      expect(fee1000).to.equal(10_000_000);
      expect(fee2015).to.equal(10_000_000);
    });

    it("Should increase by 10% at 2,016 forges", async function () {
      const fee2016 = await forgeDifficulty.calculateBaseDifficulty(2016);
      // 10,000,000 * 1.1 = 11,000,000
      expect(fee2016).to.equal(11_000_000);
    });

    it("Should compound increases correctly", async function () {
      // After 2 difficulty eras (4,032 forges)
      const fee4032 = await forgeDifficulty.calculateBaseDifficulty(4032);
      // 10,000,000 * 1.1 * 1.1 = 12,100,000
      expect(fee4032).to.equal(12_100_000);
    });

    it("Should calculate large forge counts correctly", async function () {
      // After 10 eras (20,160 forges)
      const fee20160 = await forgeDifficulty.calculateBaseDifficulty(20160);
      // 10,000,000 * 1.1^10 ≈ 25,937,424
      expect(fee20160).to.be.closeTo(25_937_424, 100);
    });
  });

  describe("Demand Multiplier Calculation", function () {
    it("Should return 1.0x when at or below target", async function () {
      const multiplier400 = await forgeDifficulty.calculateDemandMultiplier(400);
      const multiplier500 = await forgeDifficulty.calculateDemandMultiplier(500);
      
      expect(multiplier400).to.equal(100);
      expect(multiplier500).to.equal(100);
    });

    it("Should increase multiplier above target", async function () {
      // 600 forges = 120% of target = should add 4% (20% over * 2 / 10)
      const multiplier600 = await forgeDifficulty.calculateDemandMultiplier(600);
      expect(multiplier600).to.equal(104); // 1.04x
    });

    it("Should cap at 2.0x multiplier", async function () {
      // Very high demand - should be capped
      const multiplier10000 = await forgeDifficulty.calculateDemandMultiplier(10000);
      expect(multiplier10000).to.equal(200); // 2.0x cap
    });

    it("Should scale linearly in normal range", async function () {
      // 750 forges = 150% of target = 100 + ((150-100) * 2 / 10) = 110
      const multiplier750 = await forgeDifficulty.calculateDemandMultiplier(750);
      expect(multiplier750).to.equal(110); // 1.10x
    });
  });

  describe("Time Appreciation Calculation", function () {
    it("Should return 1.0x for first month", async function () {
      const appreciation0 = await forgeDifficulty.calculateTimeAppreciation(0);
      const appreciation29 = await forgeDifficulty.calculateTimeAppreciation(29);
      
      expect(appreciation0).to.equal(100);
      expect(appreciation29).to.equal(100);
    });

    it("Should increase by 1% per month", async function () {
      const appreciation30 = await forgeDifficulty.calculateTimeAppreciation(30);
      expect(appreciation30).to.equal(101); // 1.01x

      const appreciation60 = await forgeDifficulty.calculateTimeAppreciation(60);
      // 100 * 1.01 * 1.01 = 102.01 → 102
      expect(appreciation60).to.equal(102);
    });

    it("Should compound over multiple months", async function () {
      // 12 months (1 year)
      const appreciation360 = await forgeDifficulty.calculateTimeAppreciation(360);
      // 100 * 1.01^12 ≈ 112.68
      expect(appreciation360).to.be.closeTo(112, 1);
    });

    it("Should calculate 2 years correctly", async function () {
      // 24 months
      const appreciation720 = await forgeDifficulty.calculateTimeAppreciation(720);
      // 100 * 1.01^24 ≈ 126.97
      expect(appreciation720).to.be.closeTo(126, 2);
    });
  });

  describe("BTC Price Adjustment", function () {
    it("Should return 1.0x at target price ($50k)", async function () {
      const adjustment = await forgeDifficulty.calculateBtcAdjustment(
        ethers.parseUnits("50000", 18)
      );
      expect(adjustment).to.equal(100);
    });

    it("Should decrease fee when BTC price is high", async function () {
      // BTC at $100k should halve the fee (0.5x)
      const adjustment = await forgeDifficulty.calculateBtcAdjustment(
        ethers.parseUnits("100000", 18)
      );
      expect(adjustment).to.equal(50); // 0.5x
    });

    it("Should increase fee when BTC price is low", async function () {
      // BTC at $25k should double the fee (2.0x)
      const adjustment = await forgeDifficulty.calculateBtcAdjustment(
        ethers.parseUnits("25000", 18)
      );
      expect(adjustment).to.equal(200); // 2.0x
    });

    it("Should cap adjustments between 0.5x and 2.0x", async function () {
      // Very low BTC price
      const adjustmentLow = await forgeDifficulty.calculateBtcAdjustment(
        ethers.parseUnits("10000", 18)
      );
      expect(adjustmentLow).to.equal(200); // Capped at 2.0x

      // Very high BTC price
      const adjustmentHigh = await forgeDifficulty.calculateBtcAdjustment(
        ethers.parseUnits("200000", 18)
      );
      expect(adjustmentHigh).to.equal(50); // Capped at 0.5x
    });

    it("Should handle zero price gracefully", async function () {
      const adjustment = await forgeDifficulty.calculateBtcAdjustment(0);
      expect(adjustment).to.equal(100); // No adjustment
    });
  });

  describe("Complete Fee Calculation", function () {
    it("Should calculate fee for early forge correctly", async function () {
      const metrics = {
        forgeCount: 100,
        forgesLastWeek: 400, // Below target
        daysSinceLaunch: 15, // First month
        btcPriceUsd: ethers.parseUnits("50000", 18)
      };
      
      const fee = await forgeDifficulty.calculateRequiredFee(metrics);
      expect(fee).to.equal(10_000_000); // 0.1 BTC baseline
    });

    it("Should apply all multipliers correctly", async function () {
      const metrics = {
        forgeCount: 2016, // Second era
        forgesLastWeek: 600, // 120% of target = 1.04x
        daysSinceLaunch: 60, // 2 months = 1.02x
        btcPriceUsd: ethers.parseUnits("50000", 18) // 1.0x
      };
      
      const fee = await forgeDifficulty.calculateRequiredFee(metrics);
      // Base: 11,000,000 (10% increase)
      // Demand: 1.04x = 11,440,000
      // Time: 1.02x = 11,668,800
      // BTC: 1.0x = 11,668,800
      expect(fee).to.be.closeTo(11_668_800, 10000);
    });
  });

  describe("Era Caps", function () {
    it("Should cap Founder Era at 0.11 BTC", async function () {
      const metrics = {
        forgeCount: 500,
        forgesLastWeek: 2000, // Very high demand
        daysSinceLaunch: 360, // 1 year
        btcPriceUsd: ethers.parseUnits("25000", 18) // 2.0x
      };
      
      const fee = await forgeDifficulty.calculateRequiredFee(metrics);
      expect(fee).to.be.lte(11_000_000); // Max 0.11 BTC
    });

    it("Should cap Knighting Era at 0.25 BTC", async function () {
      const metrics = {
        forgeCount: 5000,
        forgesLastWeek: 2000,
        daysSinceLaunch: 360,
        btcPriceUsd: ethers.parseUnits("25000", 18)
      };
      
      const fee = await forgeDifficulty.calculateRequiredFee(metrics);
      expect(fee).to.be.lte(25_000_000); // Max 0.25 BTC
    });

    it("Should cap Royal Era at 1.0 BTC", async function () {
      const metrics = {
        forgeCount: 25000,
        forgesLastWeek: 2000,
        daysSinceLaunch: 360,
        btcPriceUsd: ethers.parseUnits("25000", 18)
      };
      
      const fee = await forgeDifficulty.calculateRequiredFee(metrics);
      expect(fee).to.be.lte(100_000_000); // Max 1.0 BTC
    });

    it("Should cap Legendary Era at 21 BTC", async function () {
      const metrics = {
        forgeCount: 100000,
        forgesLastWeek: 2000,
        daysSinceLaunch: 1000,
        btcPriceUsd: ethers.parseUnits("25000", 18)
      };
      
      const fee = await forgeDifficulty.calculateRequiredFee(metrics);
      expect(fee).to.be.lte(2_100_000_000); // Max 21 BTC
    });

    it("Should never go below minimum 0.1 BTC", async function () {
      const metrics = {
        forgeCount: 0,
        forgesLastWeek: 0,
        daysSinceLaunch: 0,
        btcPriceUsd: ethers.parseUnits("200000", 18) // Very high BTC
      };
      
      const fee = await forgeDifficulty.calculateRequiredFee(metrics);
      expect(fee).to.be.gte(10_000_000); // Min 0.1 BTC
    });
  });

  describe("Future Fee Projection", function () {
    it("Should project future fees", async function () {
      const projectedFee = await forgeDifficulty.projectFutureFee(
        10000, // Future forge count
        500,   // Assumed velocity
        365,   // 1 year
        ethers.parseUnits("50000", 18)
      );
      
      expect(projectedFee).to.be.gt(10_000_000); // Should be higher than base
      expect(projectedFee).to.be.lte(25_000_000); // Within Knighting Era cap
    });
  });
});
