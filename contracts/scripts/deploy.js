const hre = require("hardhat");

/**
 * Deployment script for Excalibur EXS contracts
 * 
 * Deploys in order:
 * 1. ExcaliburToken (ERC-20)
 * 2. FounderSwordsNFT (ERC-721)
 * 3. ForgeVerifier (Oracle integration)
 * 4. TreasuryDAO (Multi-sig)
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Configuration - Update these addresses for production
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;
  const DEV_FUND_ADDRESS = process.env.DEV_FUND_ADDRESS || deployer.address;
  const COMMUNITY_FUND_ADDRESS = process.env.COMMUNITY_FUND_ADDRESS || deployer.address;
  const FOUNDER_ADDRESS = process.env.FOUNDER_ADDRESS || deployer.address;
  const LIQUIDITY_POOL_ADDRESS = process.env.LIQUIDITY_POOL_ADDRESS || deployer.address;

  // Multi-sig signers for TreasuryDAO
  const TREASURY_SIGNERS = process.env.TREASURY_SIGNERS 
    ? process.env.TREASURY_SIGNERS.split(',')
    : [deployer.address];
  const REQUIRED_CONFIRMATIONS = parseInt(process.env.REQUIRED_CONFIRMATIONS || "3");

  console.log("\n=== Deployment Configuration ===");
  console.log("Treasury Address:", TREASURY_ADDRESS);
  console.log("Dev Fund Address:", DEV_FUND_ADDRESS);
  console.log("Community Fund Address:", COMMUNITY_FUND_ADDRESS);
  console.log("Founder Address:", FOUNDER_ADDRESS);
  console.log("Liquidity Pool Address:", LIQUIDITY_POOL_ADDRESS);
  console.log("Treasury Signers:", TREASURY_SIGNERS);
  console.log("Required Confirmations:", REQUIRED_CONFIRMATIONS);

  // 1. Deploy ExcaliburToken
  console.log("\n=== Deploying ExcaliburToken ===");
  const ExcaliburToken = await hre.ethers.getContractFactory("ExcaliburToken");
  const exsToken = await ExcaliburToken.deploy(
    TREASURY_ADDRESS,
    DEV_FUND_ADDRESS,
    COMMUNITY_FUND_ADDRESS,
    FOUNDER_ADDRESS,
    LIQUIDITY_POOL_ADDRESS
  );
  await exsToken.deployed();
  console.log("ExcaliburToken deployed to:", exsToken.address);

  // 2. Deploy FounderSwordsNFT
  console.log("\n=== Deploying FounderSwordsNFT ===");
  const FounderSwordsNFT = await hre.ethers.getContractFactory("FounderSwordsNFT");
  const founderSwords = await FounderSwordsNFT.deploy();
  await founderSwords.deployed();
  console.log("FounderSwordsNFT deployed to:", founderSwords.address);

  // 3. Deploy ForgeVerifier
  console.log("\n=== Deploying ForgeVerifier ===");
  const ForgeVerifier = await hre.ethers.getContractFactory("ForgeVerifier");
  const forgeVerifier = await ForgeVerifier.deploy(
    exsToken.address,
    founderSwords.address
  );
  await forgeVerifier.deployed();
  console.log("ForgeVerifier deployed to:", forgeVerifier.address);

  // 4. Deploy TreasuryDAO
  console.log("\n=== Deploying TreasuryDAO ===");
  const TreasuryDAO = await hre.ethers.getContractFactory("TreasuryDAO");
  const treasuryDAO = await TreasuryDAO.deploy(
    TREASURY_SIGNERS,
    REQUIRED_CONFIRMATIONS
  );
  await treasuryDAO.deployed();
  console.log("TreasuryDAO deployed to:", treasuryDAO.address);

  // Configure ForgeVerifier as minter
  console.log("\n=== Configuring Contracts ===");
  console.log("Setting ForgeVerifier as minter...");
  const tx1 = await exsToken.setForgeVerifier(forgeVerifier.address);
  await tx1.wait();
  console.log("ForgeVerifier configured as minter");

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("ExcaliburToken:", exsToken.address);
  console.log("FounderSwordsNFT:", founderSwords.address);
  console.log("ForgeVerifier:", forgeVerifier.address);
  console.log("TreasuryDAO:", treasuryDAO.address);

  console.log("\n=== Token Allocations ===");
  console.log("Total Supply: 21,000,000 EXS");
  console.log("- Forge Rewards: 10,500,000 EXS (50%) - Mintable via ForgeVerifier");
  console.log("- Development Fund: 3,150,000 EXS (15%) - 4-year vesting");
  console.log("- Treasury: 2,100,000 EXS (10%) - Immediately available");
  console.log("- Community Fund: 2,100,000 EXS (10%) - Immediately available");
  console.log("- Founder Allocation: 2,100,000 EXS (10%) - 4-year vesting");
  console.log("- Liquidity: 1,050,000 EXS (5%) - 2-year lock");

  console.log("\n=== Next Steps ===");
  console.log("1. Verify contracts on Etherscan:");
  console.log("   npx hardhat verify --network mainnet", exsToken.address, TREASURY_ADDRESS, DEV_FUND_ADDRESS, COMMUNITY_FUND_ADDRESS, FOUNDER_ADDRESS, LIQUIDITY_POOL_ADDRESS);
  console.log("   npx hardhat verify --network mainnet", founderSwords.address);
  console.log("   npx hardhat verify --network mainnet", forgeVerifier.address, exsToken.address, founderSwords.address);
  console.log("   npx hardhat verify --network mainnet", treasuryDAO.address, `'[${TREASURY_SIGNERS.join(',')}]'`, REQUIRED_CONFIRMATIONS);
  
  console.log("\n2. Mint Founder Sword NFTs (0-12)");
  console.log("3. Set up oracle for ForgeVerifier");
  console.log("4. Configure multi-sig for emergency pause");
  console.log("5. Add liquidity to Uniswap");
  console.log("6. Launch transparency dashboard");

  // Save deployment addresses
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ExcaliburToken: exsToken.address,
      FounderSwordsNFT: founderSwords.address,
      ForgeVerifier: forgeVerifier.address,
      TreasuryDAO: treasuryDAO.address
    },
    configuration: {
      treasuryAddress: TREASURY_ADDRESS,
      devFundAddress: DEV_FUND_ADDRESS,
      communityFundAddress: COMMUNITY_FUND_ADDRESS,
      founderAddress: FOUNDER_ADDRESS,
      liquidityPoolAddress: LIQUIDITY_POOL_ADDRESS,
      treasurySigners: TREASURY_SIGNERS,
      requiredConfirmations: REQUIRED_CONFIRMATIONS
    }
  };

  fs.writeFileSync(
    `deployment-${hre.network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment info saved to deployment-*.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
