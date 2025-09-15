const hre = require("hardhat");
const { parseEther, formatEther } = require("ethers");

async function main() {
  console.log("Starting deployment...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const basePrice = parseEther("0.001");
  console.log("Base price:", basePrice.toString(), "wei");

  // Deploy PreSale contract
  const PreSale = await hre.ethers.getContractFactory("PreSale");
  const preSale = await PreSale.deploy(basePrice);

  // ethers v6: deployed immediately, no .deployed()
  console.log("PreSale contract deployed at:", await preSale.getAddress());

  // Read contract state
  const owner = await preSale.owner();
  const currentPhase = await preSale.currentPhase();
  const currentPrice = await preSale.getCurrentPrice();

  console.log("Owner:", owner);
  console.log("Current phase:", currentPhase.toString());
  console.log("Current price:", formatEther(currentPrice), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
