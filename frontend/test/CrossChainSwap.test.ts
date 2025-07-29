import { expect } from "chai";
import { ethers } from "hardhat";
import { CrossChainSwap, MockERC20Public } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CrossChainSwap", function () {
  let crossChainSwap: CrossChainSwap;
  let mockToken: MockERC20Public;
  let owner: SignerWithAddress;
  let recipient: SignerWithAddress;

  beforeEach(async function () {
    [owner, recipient] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20Public");
    mockToken = await MockERC20Factory.deploy("Mock USDC", "mUSDC", 6);
    await mockToken.waitForDeployment();

    // Deploy CrossChainSwap
    const CrossChainSwapFactory = await ethers.getContractFactory("CrossChainSwap");
    crossChainSwap = await CrossChainSwapFactory.deploy();
    await crossChainSwap.waitForDeployment();

    // Mint tokens to owner
    await mockToken.mint(owner.address, ethers.parseUnits("1000", 6));
    
    // Approve tokens for swap contract
    await mockToken.approve(await crossChainSwap.getAddress(), ethers.parseUnits("1000", 6));
  });

  describe("Timelock Validation", function () {
    it("Should reject timelock in the past", async function () {
      const currentTime = await crossChainSwap.getCurrentTimestamp();
      const pastTimelock = currentTime - 100n; // 100 seconds ago
      
      const swapId = ethers.keccak256(ethers.toUtf8Bytes("test1"));
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret"));

      await expect(
        crossChainSwap.initiateSwap(
          swapId,
          hashlock,
          recipient.address,
          ethers.parseUnits("1", 6),
          await mockToken.getAddress(),
          pastTimelock
        )
      ).to.be.revertedWith("Timelock must be in future");
    });

    it("Should reject timelock too far in future", async function () {
      const currentTime = await crossChainSwap.getCurrentTimestamp();
      const futureTimelock = currentTime + 86401n; // More than 24 hours
      
      const swapId = ethers.keccak256(ethers.toUtf8Bytes("test2"));
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret"));

      await expect(
        crossChainSwap.initiateSwap(
          swapId,
          hashlock,
          recipient.address,
          ethers.parseUnits("1", 6),
          await mockToken.getAddress(),
          futureTimelock
        )
      ).to.be.revertedWith("Timelock too far in future");
    });

    it("Should reject timelock too soon", async function () {
      const currentTime = await crossChainSwap.getCurrentTimestamp();
      const soonTimelock = currentTime + 100n; // Less than 5 minutes
      
      const swapId = ethers.keccak256(ethers.toUtf8Bytes("test3"));
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret"));

      await expect(
        crossChainSwap.initiateSwap(
          swapId,
          hashlock,
          recipient.address,
          ethers.parseUnits("1", 6),
          await mockToken.getAddress(),
          soonTimelock
        )
      ).to.be.revertedWith("Timelock too soon");
    });

    it("Should accept valid timelock", async function () {
      const currentTime = await crossChainSwap.getCurrentTimestamp();
      const validTimelock = currentTime + 600n; // 10 minutes from now
      
      const swapId = ethers.keccak256(ethers.toUtf8Bytes("test4"));
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret"));

      await expect(
        crossChainSwap.initiateSwap(
          swapId,
          hashlock,
          recipient.address,
          ethers.parseUnits("1", 6),
          await mockToken.getAddress(),
          validTimelock
        )
      ).to.emit(crossChainSwap, "SwapInitiated");
    });

    it("Should test timelock validation helper", async function () {
      const currentTime = await crossChainSwap.getCurrentTimestamp();
      
      // Test valid timelock
      const validTimelock = currentTime + 600n; // 10 minutes
      expect(await crossChainSwap.isValidTimelock(validTimelock)).to.be.true;
      
      // Test invalid timelock (too soon)
      const soonTimelock = currentTime + 100n; // 100 seconds
      expect(await crossChainSwap.isValidTimelock(soonTimelock)).to.be.false;
      
      // Test invalid timelock (too far)
      const farTimelock = currentTime + 86401n; // More than 24 hours
      expect(await crossChainSwap.isValidTimelock(farTimelock)).to.be.false;
    });
  });
});