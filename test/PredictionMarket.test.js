const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket", function () {
  let predictionMarket;
  let mockOracle;
  let owner;
  let treasury;
  let user1;
  let user2;
  let user3;

  const INITIAL_PRICE = ethers.parseUnits("300", 8); // $300 with 8 decimals
  const ROUND_DURATION = 300; // 5 minutes

  beforeEach(async function () {
    [owner, treasury, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock oracle
    const MockOracle = await ethers.getContractFactory("MockPriceOracle");
    mockOracle = await MockOracle.deploy(INITIAL_PRICE, 8);

    // Deploy prediction market
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PredictionMarket.deploy(
      await mockOracle.getAddress(),
      treasury.address
    );
  });

  describe("Deployment", function () {
    
    it("Should deploy with correct initial values", async function () {
      expect(await predictionMarket.currentRound()).to.equal(1);
      expect(await predictionMarket.treasury()).to.equal(treasury.address);
    });

    it("Should create first round", async function () {
      const round = await predictionMarket.getCurrentRound();
      expect(round.roundId).to.equal(1);
      expect(round.status).to.equal(0); // Open
    });
  });

  describe("Betting", function () {
    it("Should allow users to place Bull bets", async function () {
      const betAmount = ethers.parseEther("1.0");
      
      await expect(
        predictionMarket.connect(user1).bet(0, { value: betAmount }) // 0 = Bull
      )
        .to.emit(predictionMarket, "BetPlaced")
        .withArgs(user1.address, 1, 0, betAmount);

      const bet = await predictionMarket.getUserBet(user1.address, 1);
      expect(bet.position).to.equal(0); // Bull
      expect(bet.amount).to.equal(betAmount);
    });

    it("Should allow users to place Bear bets", async function () {
      const betAmount = ethers.parseEther("1.0");
      
      await expect(
        predictionMarket.connect(user1).bet(1, { value: betAmount }) // 1 = Bear
      )
        .to.emit(predictionMarket, "BetPlaced")
        .withArgs(user1.address, 1, 1, betAmount);

      const bet = await predictionMarket.getUserBet(user1.address, 1);
      expect(bet.position).to.equal(1); // Bear
    });

    it("Should prevent multiple bets in same round", async function () {
      const betAmount = ethers.parseEther("1.0");
      
      await predictionMarket.connect(user1).bet(0, { value: betAmount });
      
      await expect(
        predictionMarket.connect(user1).bet(0, { value: betAmount })
      ).to.be.revertedWith("Already bet in this round");
    });

    it("Should update round totals correctly", async function () {
      const bet1 = ethers.parseEther("1.0");
      const bet2 = ethers.parseEther("2.0");
      
      await predictionMarket.connect(user1).bet(0, { value: bet1 }); // Bull
      await predictionMarket.connect(user2).bet(1, { value: bet2 }); // Bear
      
      const round = await predictionMarket.getCurrentRound();
      expect(round.totalBullAmount).to.equal(bet1);
      expect(round.totalBearAmount).to.equal(bet2);
    });
  });

  describe("Round Locking", function () {
    it("Should lock round after duration", async function () {
      const betAmount = ethers.parseEther("1.0");
      await predictionMarket.connect(user1).bet(0, { value: betAmount });
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [ROUND_DURATION]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(predictionMarket.lockRound(1))
        .to.emit(predictionMarket, "RoundLocked")
        .withArgs(1, INITIAL_PRICE);
      
      const round = await predictionMarket.getRound(1);
      expect(round.status).to.equal(1); // Locked
      expect(round.lockPrice).to.equal(INITIAL_PRICE);
    });

    it("Should create new round after locking", async function () {
      await ethers.provider.send("evm_increaseTime", [ROUND_DURATION]);
      await ethers.provider.send("evm_mine", []);
      
      await predictionMarket.lockRound(1);
      
      expect(await predictionMarket.currentRound()).to.equal(2);
      const newRound = await predictionMarket.getCurrentRound();
      expect(newRound.roundId).to.equal(2);
    });
  });

  describe("Round Closing and Payouts", function () {
    beforeEach(async function () {
      // Setup: Users place bets
      await predictionMarket.connect(user1).bet(0, { value: ethers.parseEther("1.0") }); // Bull
      await predictionMarket.connect(user2).bet(1, { value: ethers.parseEther("1.0") }); // Bear
      
      // Lock round
      await ethers.provider.send("evm_increaseTime", [ROUND_DURATION]);
      await ethers.provider.send("evm_mine", []);
      await predictionMarket.lockRound(1);
    });

    it("Should close round and determine Bull winner", async function () {
      // Set higher close price (Bull wins)
      const higherPrice = ethers.parseUnits("350", 8);
      await mockOracle.setPrice(higherPrice);
      
      // Fast forward to close time
      await ethers.provider.send("evm_increaseTime", [ROUND_DURATION]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(predictionMarket.closeRound(1))
        .to.emit(predictionMarket, "RoundClosed")
        .withArgs(1, higherPrice, 0); // 0 = Bull
      
      const round = await predictionMarket.getRound(1);
      expect(round.status).to.equal(2); // Closed
      expect(round.closePrice).to.equal(higherPrice);
    });

    it("Should allow Bull winners to claim", async function () {
      // Set higher close price (Bull wins)
      const higherPrice = ethers.parseUnits("350", 8);
      await mockOracle.setPrice(higherPrice);
      
      await ethers.provider.send("evm_increaseTime", [ROUND_DURATION]);
      await ethers.provider.send("evm_mine", []);
      await predictionMarket.closeRound(1);
      
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      const tx = await predictionMarket.connect(user1).claim(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(user1.address);
      
      // User should receive payout (minus 3% fee)
      // Total pool: 2 ETH, Bull pool: 1 ETH
      // Payout: (2 ETH * 1 ETH) / 1 ETH = 2 ETH
      // Fee: 2 ETH * 3% = 0.06 ETH
      // User receives: 1.94 ETH
      // Net gain: 0.94 ETH (minus gas)
      expect(finalBalance - initialBalance).to.be.closeTo(
        ethers.parseEther("1.94") - gasUsed,
        ethers.parseEther("0.01")
      );
    });

    it("Should prevent Bear losers from claiming", async function () {
      // Set higher close price (Bull wins, Bear loses)
      const higherPrice = ethers.parseUnits("350", 8);
      await mockOracle.setPrice(higherPrice);
      
      await ethers.provider.send("evm_increaseTime", [ROUND_DURATION]);
      await ethers.provider.send("evm_mine", []);
      await predictionMarket.closeRound(1);
      
      await expect(
        predictionMarket.connect(user2).claim(1)
      ).to.be.revertedWith("Not a winning bet");
    });

    it("Should handle tie scenario (house wins)", async function () {
      // Keep same price (tie)
      await ethers.provider.send("evm_increaseTime", [ROUND_DURATION]);
      await ethers.provider.send("evm_mine", []);
      await predictionMarket.closeRound(1);
      
      // Users cannot claim (house wins)
      await expect(
        predictionMarket.connect(user1).claim(1)
      ).to.not.be.reverted; // Claim succeeds but no payout
      
      const bet = await predictionMarket.getUserBet(user1.address, 1);
      expect(bet.claimed).to.be.true;
    });
  });

  describe("Payout Calculation", function () {
    it("Should calculate correct payout", async function () {
      await predictionMarket.connect(user1).bet(0, { value: ethers.parseEther("1.0") });
      await predictionMarket.connect(user2).bet(0, { value: ethers.parseEther("2.0") });
      await predictionMarket.connect(user3).bet(1, { value: ethers.parseEther("1.0") });
      
      // Total: 4 ETH, Bull: 3 ETH, Bear: 1 ETH
      const payout = await predictionMarket.calculatePayout(1, 0, ethers.parseEther("1.0"));
      
      // Expected: (4 ETH * 1 ETH) / 3 ETH = 1.333... ETH
      // Fee: 1.333... * 3% = 0.04 ETH
      // Payout: ~1.293 ETH
      expect(payout).to.be.closeTo(ethers.parseEther("1.293"), ethers.parseEther("0.01"));
    });
  });
});

