const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrossChainSwapEthereum", function () {
  async function deployFixture() {
    const [owner, feeRecipient, initiator, recipient, other] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy("Mock Token", "MTK", 18);

    // Deploy CrossChainSwapEthereum
    const CrossChainSwapEthereum = await ethers.getContractFactory("CrossChainSwapEthereum");
    const crossChainSwap = await CrossChainSwapEthereum.deploy(feeRecipient.address);

    // Add mock token as supported
    await crossChainSwap.addSupportedToken(mockToken.target);

    // Mint tokens to initiator
    const mintAmount = ethers.parseEther("1000");
    await mockToken.mint(initiator.address, mintAmount);

    return {
      crossChainSwap,
      mockToken,
      owner,
      feeRecipient,
      initiator,
      recipient,
      other,
      mintAmount
    };
  }

  describe("Deployment", function () {
    it("Should set the right fee recipient", async function () {
      const { crossChainSwap, feeRecipient } = await loadFixture(deployFixture);
      expect(await crossChainSwap.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the right owner", async function () {
      const { crossChainSwap, owner } = await loadFixture(deployFixture);
      expect(await crossChainSwap.owner()).to.equal(owner.address);
    });
  });

  describe("Token Management", function () {
    it("Should add supported token", async function () {
      const { crossChainSwap, mockToken } = await loadFixture(deployFixture);
      expect(await crossChainSwap.supportedTokens(mockToken.target)).to.be.true;
    });

    it("Should remove supported token", async function () {
      const { crossChainSwap, mockToken } = await loadFixture(deployFixture);
      await crossChainSwap.removeSupportedToken(mockToken.target);
      expect(await crossChainSwap.supportedTokens(mockToken.target)).to.be.false;
    });

    it("Should revert when non-owner tries to add token", async function () {
      const { crossChainSwap, other } = await loadFixture(deployFixture);
      await expect(
        crossChainSwap.connect(other).addSupportedToken(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(crossChainSwap, "OwnableUnauthorizedAccount");
    });
  });

  describe("Swap Initiation", function () {
    it("Should initiate swap successfully", async function () {
      const { crossChainSwap, mockToken, initiator, recipient } = await loadFixture(deployFixture);
      
      const swapAmount = ethers.parseEther("100");
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret123"));
      const currentTime = await time.latest();
      const timelock = currentTime + 7200; // 2 hours from now (MIN_TIMELOCK)
      const swapId = ethers.keccak256(ethers.toUtf8Bytes("swap1"));

      // Approve tokens
      await mockToken.connect(initiator).approve(crossChainSwap.target, swapAmount);

      // Initiate swap
      await expect(
        crossChainSwap.connect(initiator).initiateSwap(
          swapId,
          hashlock,
          recipient.address,
          swapAmount,
          mockToken.target,
          timelock
        )
      ).to.emit(crossChainSwap, "SwapInitiated");

      // Check swap details
      const swapDetails = await crossChainSwap.getSwapDetails(swapId);
      expect(swapDetails.hashlock).to.equal(hashlock);
      expect(swapDetails.initiator).to.equal(initiator.address);
      expect(swapDetails.recipient).to.equal(recipient.address);
    });

    it("Should revert with invalid timelock", async function () {
      const { crossChainSwap, mockToken, initiator, recipient } = await loadFixture(deployFixture);
      
      const swapAmount = ethers.parseEther("100");
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret123"));
      const currentTime = await time.latest();
      const timelock = currentTime + 60; // 1 minute (too short)
      const swapId = ethers.keccak256(ethers.toUtf8Bytes("swap1"));

      await mockToken.connect(initiator).approve(crossChainSwap.target, swapAmount);

      await expect(
        crossChainSwap.connect(initiator).initiateSwap(
          swapId,
          hashlock,
          recipient.address,
          swapAmount,
          mockToken.target,
          timelock
        )
      ).to.be.revertedWith("Invalid timelock");
    });

    it("Should revert with unsupported token", async function () {
      const { crossChainSwap, initiator, recipient } = await loadFixture(deployFixture);
      
      // Deploy another token that's not supported
      const MockToken = await ethers.getContractFactory("MockERC20");
      const unsupportedToken = await MockToken.deploy("Unsupported", "UNS", 18);

      const swapAmount = ethers.parseEther("100");
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret123"));
      const currentTime = await time.latest();
      const timelock = currentTime + 7200;
      const swapId = ethers.keccak256(ethers.toUtf8Bytes("swap1"));

      await expect(
        crossChainSwap.connect(initiator).initiateSwap(
          swapId,
          hashlock,
          recipient.address,
          swapAmount,
          unsupportedToken.target,
          timelock
        )
      ).to.be.revertedWith("Token not supported");
    });
  });

  describe("Swap Completion", function () {
    async function initiateSwapFixture() {
      const fixture = await loadFixture(deployFixture);
      const { crossChainSwap, mockToken, initiator, recipient } = fixture;
      
      const swapAmount = ethers.parseEther("100");
      const secret = "secret123";
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes(secret));
      const currentTime = await time.latest();
      const timelock = currentTime + 7200;
      const swapId = ethers.keccak256(ethers.toUtf8Bytes("swap1"));

      await mockToken.connect(initiator).approve(crossChainSwap.target, swapAmount);
      await crossChainSwap.connect(initiator).initiateSwap(
        swapId,
        hashlock,
        recipient.address,
        swapAmount,
        mockToken.target,
        timelock
      );

      return { ...fixture, swapAmount, secret, hashlock, timelock, swapId };
    }

    it("Should complete swap with correct secret", async function () {
      const { crossChainSwap, mockToken, recipient, swapId, secret } = await loadFixture(initiateSwapFixture);

      const recipientBalanceBefore = await mockToken.balanceOf(recipient.address);

      await expect(
        crossChainSwap.completeSwap(swapId, ethers.toUtf8Bytes(secret))
      ).to.emit(crossChainSwap, "SwapCompleted");

      const recipientBalanceAfter = await mockToken.balanceOf(recipient.address);
      expect(recipientBalanceAfter).to.be.gt(recipientBalanceBefore);

      const swapDetails = await crossChainSwap.getSwapDetails(swapId);
      expect(swapDetails.completed).to.be.true;
    });

    it("Should revert with incorrect secret", async function () {
      const { crossChainSwap, swapId } = await loadFixture(initiateSwapFixture);

      await expect(
        crossChainSwap.completeSwap(swapId, ethers.toUtf8Bytes("wrongsecret"))
      ).to.be.revertedWith("Invalid secret");
    });
  });

  describe("Swap Refund", function () {
    it("Should allow refund after timelock expires", async function () {
      const { crossChainSwap, mockToken, initiator, recipient } = await loadFixture(deployFixture);
      
      const swapAmount = ethers.parseEther("100");
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret123"));
      const currentTime = await time.latest();
      const timelock = currentTime + 7200; // 2 hours from now
      const swapId = ethers.keccak256(ethers.toUtf8Bytes("swap1"));

      await mockToken.connect(initiator).approve(crossChainSwap.target, swapAmount);
      await crossChainSwap.connect(initiator).initiateSwap(
        swapId,
        hashlock,
        recipient.address,
        swapAmount,
        mockToken.target,
        timelock
      );

      // Wait for timelock to expire
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const initiatorBalanceBefore = await mockToken.balanceOf(initiator.address);

      await expect(
        crossChainSwap.connect(initiator).refund(swapId)
      ).to.emit(crossChainSwap, "SwapRefunded");

      const initiatorBalanceAfter = await mockToken.balanceOf(initiator.address);
      expect(initiatorBalanceAfter).to.be.gt(initiatorBalanceBefore);
    });

    it("Should revert refund before timelock expires", async function () {
      const { crossChainSwap, swapId, initiator } = await loadFixture(
        async () => {
          const fixture = await initiateSwapFixture();
          return fixture;
        }
      );

      await expect(
        crossChainSwap.connect(initiator).refund(swapId)
      ).to.be.revertedWith("Swap not yet expired");
    });
  });

  describe("Fee Management", function () {
    it("Should update swap fee", async function () {
      const { crossChainSwap } = await loadFixture(deployFixture);
      
      const newFee = 20; // 0.2%
      await expect(
        crossChainSwap.updateSwapFee(newFee)
      ).to.emit(crossChainSwap, "FeeUpdated");

      expect(await crossChainSwap.swapFee()).to.equal(newFee);
    });

    it("Should revert with fee too high", async function () {
      const { crossChainSwap } = await loadFixture(deployFixture);
      
      await expect(
        crossChainSwap.updateSwapFee(150) // 1.5%
      ).to.be.revertedWith("Fee too high");
    });
  });
});