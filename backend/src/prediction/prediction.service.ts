import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PredictionService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private contractAddress: string;

  constructor() {
    // Connect to local Hardhat node
    this.provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // Contract address - update this after deployment
    this.contractAddress = process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    // Load ABI from artifacts
    const artifactPath = path.join(
      __dirname,
      '../../../../artifacts/contracts/MultiCoinPredictionMarket.sol/MultiCoinPredictionMarket.json',
    );
    
    let abi = [];
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      abi = artifact.abi;
    } catch (error) {
      console.warn('Could not load contract ABI, using fallback');
    }
    
    this.contract = new ethers.Contract(
      this.contractAddress,
      abi,
      this.provider,
    );
  }

  private getCoinEnum(coin: string): number {
    const coinMap: { [key: string]: number } = {
      BTC: 0,
      ETH: 1,
      BNB: 2,
    };
    return coinMap[coin.toUpperCase()] ?? 0;
  }

  async getCurrentRound(coin: string) {
    try {
      const coinEnum = this.getCoinEnum(coin);
      const roundId = await this.contract.currentRound(coinEnum);
      const roundData = await this.contract.getCurrentRound(coinEnum);
      
      return {
        roundId: roundId.toString(),
        coin: Number(roundData[1]),
        startTimestamp: roundData[2].toString(),
        lockTimestamp: roundData[3].toString(),
        closeTimestamp: roundData[4].toString(),
        lockPrice: roundData[5].toString(),
        closePrice: roundData[6].toString(),
        totalBullAmount: ethers.formatEther(roundData[7]),
        totalBearAmount: ethers.formatEther(roundData[8]),
        oracleCalled: roundData[9],
        status: Number(roundData[10]),
      };
    } catch (error) {
      throw new Error(`Failed to get current round: ${error.message}`);
    }
  }

  async getRound(coin: string, roundId: number) {
    try {
      const coinEnum = this.getCoinEnum(coin);
      const roundData = await this.contract.getRound(coinEnum, roundId);
      
      return {
        roundId: roundData[0].toString(),
        coin: Number(roundData[1]),
        startTimestamp: roundData[2].toString(),
        lockTimestamp: roundData[3].toString(),
        closeTimestamp: roundData[4].toString(),
        lockPrice: roundData[5].toString(),
        closePrice: roundData[6].toString(),
        totalBullAmount: ethers.formatEther(roundData[7]),
        totalBearAmount: ethers.formatEther(roundData[8]),
        oracleCalled: roundData[9],
        status: Number(roundData[10]),
      };
    } catch (error) {
      throw new Error(`Failed to get round: ${error.message}`);
    }
  }

  async getCurrentPrice(coin: string) {
    try {
      const coinEnum = this.getCoinEnum(coin);
      const price = await this.contract.getCurrentPrice(coinEnum);
      return {
        price: ethers.formatUnits(price, 8),
        raw: price.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to get price: ${error.message}`);
    }
  }

  async getUserBet(coin: string, address: string, roundId: number) {
    try {
      const coinEnum = this.getCoinEnum(coin);
      const betData = await this.contract.getUserBet(coinEnum, address, roundId);
      
      return {
        user: betData[0],
        roundId: betData[1].toString(),
        coin: Number(betData[2]),
        position: Number(betData[3]),
        amount: ethers.formatEther(betData[4]),
        claimed: betData[5],
      };
    } catch (error) {
      throw new Error(`Failed to get user bet: ${error.message}`);
    }
  }

  async calculatePayout(
    coin: string,
    roundId: number,
    position: string,
    amount: string,
  ) {
    try {
      const coinEnum = this.getCoinEnum(coin);
      const positionEnum = position.toLowerCase() === 'bull' ? 0 : 1;
      const amountWei = ethers.parseEther(amount);
      
      const payout = await this.contract.calculatePayout(
        coinEnum,
        roundId,
        positionEnum,
        amountWei,
      );
      
      return {
        payout: ethers.formatEther(payout),
        raw: payout.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to calculate payout: ${error.message}`);
    }
  }
}

