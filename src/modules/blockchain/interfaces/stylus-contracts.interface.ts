/**
 * Stylus Contracts Interface
 * TypeScript interfaces for Arbitrum Stylus smart contracts
 */

import { Address } from 'viem';

// Reward tier enum (matches Rust contract)
export enum RewardTier {
  NIFTY_FIFTY = 0,
  GAYLE_STORM = 1,
  FIVE_WICKET_HAUL = 2,
  HAT_TRICK = 3,
  MAIDEN_MASTER = 4,
  RUN_MACHINE = 5,
  GOLDEN_ARM = 6,
  ALL_ROUNDER = 7,
}

// Performance Oracle Interface
export interface IPerformanceOracle {
  registerMatch(matchId: `0x${string}`): Promise<`0x${string}`>; // tx hash
  finalizeMatch(
    matchId: `0x${string}`,
    dataHash: `0x${string}`,
    playerCount: number,
  ): Promise<`0x${string}`>;
  recordPerformance(
    matchId: `0x${string}`,
    player: Address,
    runsScored: bigint,
    wicketsTaken: bigint,
    ballsFaced: bigint,
    ballsBowled: bigint,
    tier: RewardTier,
    effortScore: bigint,
  ): Promise<`0x${string}`>;
  getMatchProof(matchId: `0x${string}`): Promise<{
    dataHash: `0x${string}`;
    isFinalized: boolean;
    finalizedAt: bigint;
  }>;
  verifyPerformance(matchId: `0x${string}`, player: Address): Promise<boolean>;
  getPlayerPerformance(
    matchId: `0x${string}`,
    player: Address,
  ): Promise<{
    runsScored: bigint;
    wicketsTaken: bigint;
    tier: RewardTier;
    effortScore: bigint;
  }>;
}

// Deflationary Burn Interface
export interface IDeflatinaryBurn {
  calculateReward(tier: RewardTier, effortScore: bigint): Promise<bigint>;
  burnForPerformance(
    matchId: `0x${string}`,
    player: Address,
    tier: RewardTier,
    effortScore: bigint,
  ): Promise<{
    burnAmount: bigint;
    rewardAmount: bigint;
    txHash: `0x${string}`;
  }>;
  getRewardTier(tier: RewardTier): Promise<{
    multiplier: bigint;
    baseReward: bigint;
  }>;
  totalBurned(): Promise<bigint>;
  totalRewards(): Promise<bigint>;
  getPlayerRewards(player: Address): Promise<bigint>;
  getPlayerBurned(player: Address): Promise<bigint>;
}

// SPP Token Interface (ERC-20)
export interface ISPPToken {
  name(): Promise<string>;
  symbol(): Promise<string>;
  decimals(): Promise<number>;
  totalSupply(): Promise<bigint>;
  balanceOf(account: Address): Promise<bigint>;
  transfer(to: Address, amount: bigint): Promise<`0x${string}`>;
  approve(spender: Address, amount: bigint): Promise<`0x${string}`>;
  transferFrom(from: Address, to: Address, amount: bigint): Promise<`0x${string}`>;
  burn(amount: bigint): Promise<`0x${string}`>;
  mint(to: Address, amount: bigint): Promise<`0x${string}`>;
  getTotalBurned(): Promise<bigint>;
  circulatingSupply(): Promise<bigint>;
}

// Athlete NFT Interface
export interface IAthleteNFT {
  mintAthleteProfile(athlete: Address, athleteName: string): Promise<{
    tokenId: bigint;
    txHash: `0x${string}`;
  }>;
  updateStatsFromMatch(
    tokenId: bigint,
    matchId: `0x${string}`,
    runs: bigint,
    wickets: bigint,
  ): Promise<`0x${string}`>;
  getAthleteStats(tokenId: bigint): Promise<{
    power: bigint;
    speed: bigint;
    accuracy: bigint;
    matchesPlayed: bigint;
    totalRuns: bigint;
    totalWickets: bigint;
  }>;
  getAthleteProfile(tokenId: bigint): Promise<{
    athlete: Address;
    name: string;
    highestScore: bigint;
    bestBowling: bigint;
  }>;
  getAthleteTokenId(athlete: Address): Promise<bigint>;
  ownerOf(tokenId: bigint): Promise<Address>;
  balanceOf(owner: Address): Promise<bigint>;
}

// Contract Configuration
export interface StylusContractConfig {
  performanceOracle: Address;
  deflatinaryBurn: Address;
  sppToken: Address;
  rewardTiers: Address;
  athleteNFT: Address;
  rpcUrl: string;
  chainId: number;
}

// Transaction Result
export interface TransactionResult {
  hash: `0x${string}`;
  blockNumber?: bigint;
  status: 'success' | 'failed' | 'pending';
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
}

// Match finalization data
export interface MatchFinalizationData {
  matchId: string;
  dataHash: `0x${string}`;
  playerCount: number;
  performances: PlayerPerformanceData[];
}

// Player performance data
export interface PlayerPerformanceData {
  playerAddress: Address;
  runsScored: number;
  wicketsTaken: number;
  ballsFaced: number;
  ballsBowled: number;
  tier: RewardTier;
  effortScore: number; // 0-100
}

// Burn request
export interface BurnRequest {
  matchId: string;
  playerAddress: Address;
  tier: RewardTier;
  performanceScore: number;
  effortScore: number;
}

// Burn result
export interface BurnResult {
  txHash: `0x${string}`;
  burnAmount: bigint;
  rewardAmount: bigint;
  tier: RewardTier;
  player: Address;
}
