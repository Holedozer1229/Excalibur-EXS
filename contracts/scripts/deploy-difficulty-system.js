const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Dynamic Difficulty Adjustment System...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
  console.log("");

  // 1. Deploy ForgeDifficulty
  console.log("📊 Deploying ForgeDifficulty...");
  const ForgeDifficulty = await ethers.getContractFactory("ForgeDifficulty");
  const forgeDifficulty = await ForgeDifficulty.deploy();
  await forgeDifficulty.waitForDeployment();
  console.log("✅ ForgeDifficulty deployed to:", await forgeDifficulty.getAddress());
  console.log("");

  // 2. Deploy ForgingVelocity
  console.log("⚡ Deploying ForgingVelocity...");
  const ForgingVelocity = await ethers.getContractFactory("ForgingVelocity");
  const forgingVelocity = await ForgingVelocity.deploy();
  await forgingVelocity.waitForDeployment();
  console.log("✅ ForgingVelocity deployed to:", await forgingVelocity.getAddress());
  console.log("");

  // 3. Deploy FounderAdvantage
  console.log("🏆 Deploying FounderAdvantage...");
  const FounderAdvantage = await ethers.getContractFactory("FounderAdvantage");
  const founderAdvantage = await FounderAdvantage.deploy();
  await founderAdvantage.waitForDeployment();
  console.log("✅ FounderAdvantage deployed to:", await founderAdvantage.getAddress());
  console.log("");

  // 4. Deploy DifficultyTriggers
  console.log("🎯 Deploying DifficultyTriggers...");
  const DifficultyTriggers = await ethers.getContractFactory("DifficultyTriggers");
  const initialFee = 10_000_000; // 0.1 BTC
  const difficultyTriggers = await DifficultyTriggers.deploy(initialFee);
  await difficultyTriggers.waitForDeployment();
  console.log("✅ DifficultyTriggers deployed to:", await difficultyTriggers.getAddress());
  console.log("");

  // 5. Deploy ForgeVerifierV2 (requires addresses of other contracts)
  // Note: You'll need to provide real addresses for ExcaliburToken and FounderSwordsNFT
  console.log("⚔️  ForgeVerifierV2 deployment requires:");
  console.log("   - ExcaliburToken address");
  console.log("   - FounderSwordsNFT address");
  console.log("   Please deploy these first or use existing addresses");
  console.log("");

  // Print deployment summary
  console.log("📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("ForgeDifficulty:     ", await forgeDifficulty.getAddress());
  console.log("ForgingVelocity:     ", await forgingVelocity.getAddress());
  console.log("FounderAdvantage:    ", await founderAdvantage.getAddress());
  console.log("DifficultyTriggers:  ", await difficultyTriggers.getAddress());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // Configuration steps
  console.log("⚙️  Configuration Steps:");
  console.log("1. Grant FORGE_RECORDER_ROLE to ForgeVerifierV2 on ForgingVelocity");
  console.log("2. Grant FORGE_MANAGER_ROLE to ForgeVerifierV2 on FounderAdvantage");
  console.log("3. Grant TRIGGER_MANAGER_ROLE to ForgeVerifierV2 on DifficultyTriggers");
  console.log("4. Set founder cutoff parameters on FounderAdvantage");
  console.log("5. Configure BTC price oracle for ForgeVerifierV2");
  console.log("");

  // Verification commands
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("🔍 Verification Commands:");
    console.log(`npx hardhat verify --network ${network.name} ${await forgeDifficulty.getAddress()}`);
    console.log(`npx hardhat verify --network ${network.name} ${await forgingVelocity.getAddress()}`);
    console.log(`npx hardhat verify --network ${network.name} ${await founderAdvantage.getAddress()}`);
    console.log(`npx hardhat verify --network ${network.name} ${await difficultyTriggers.getAddress()} ${initialFee}`);
    console.log("");
  }

  // Save addresses to file for easy reference
  const fs = require('fs');
  const addresses = {
    network: network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      ForgeDifficulty: await forgeDifficulty.getAddress(),
      ForgingVelocity: await forgingVelocity.getAddress(),
      FounderAdvantage: await founderAdvantage.getAddress(),
      DifficultyTriggers: await difficultyTriggers.getAddress()
    }
  };

  fs.writeFileSync(
    `difficulty-deployment-${network.name}.json`,
    JSON.stringify(addresses, null, 2)
  );
  console.log(`✅ Addresses saved to difficulty-deployment-${network.name}.json`);
  console.log("");

  console.log("✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
