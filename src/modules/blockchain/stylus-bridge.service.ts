/**
 * Stylus Bridge Service
 * Handles RPC calls to Arbitrum Stylus contracts
 *
 * This service bridges the NestJS backend with the on-chain Stylus contracts,
 * providing methods to:
 * - Register and finalize matches
 * - Execute performance-based token burns
 * - Mint and update athlete NFT profiles
 * - Query on-chain data
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createPublicClient, createWalletClient, http, parseEther, formatEther, keccak256, toHex, Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  StylusContractConfig,
  TransactionResult,
  MatchFinalizationData,
  BurnRequest,
  BurnResult,
  RewardTier,
} from './interfaces/stylus-contracts.interface';

// Contract ABIs (will be generated from Rust contracts)
// For now, using minimal ABI definitions
const ORACLE_ABI = [
  {
    name: 'registerMatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'matchId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'finalizeMatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'dataHash', type: 'bytes32' },
      { name: 'playerCount', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'recordPerformance',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'player', type: 'address' },
      { name: 'runsScored', type: 'uint256' },
      { name: 'wicketsTaken', type: 'uint256' },
      { name: 'ballsFaced', type: 'uint256' },
      { name: 'ballsBowled', type: 'uint256' },
      { name: 'tier', type: 'uint8' },
      { name: 'effortScore', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'getMatchProof',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'matchId', type: 'bytes32' }],
    outputs: [
      { name: 'dataHash', type: 'bytes32' },
      { name: 'isFinalized', type: 'bool' },
      { name: 'finalizedAt', type: 'uint256' },
    ],
  },
] as const;

const BURN_ABI = [
  {
    name: 'burnForPerformance',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'player', type: 'address' },
      { name: 'tier', type: 'uint8' },
      { name: 'effortScore', type: 'uint256' },
    ],
    outputs: [
      { name: 'burnAmount', type: 'uint256' },
      { name: 'rewardAmount', type: 'uint256' },
    ],
  },
  {
    name: 'calculateReward',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'effortScore', type: 'uint256' },
    ],
    outputs: [{ name: 'reward', type: 'uint256' }],
  },
  {
    name: 'totalBurned',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'total', type: 'uint256' }],
  },
] as const;

const NFT_ABI = [
  {
    name: 'mintAthleteProfile',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'athlete', type: 'address' },
      { name: 'athleteName', type: 'string' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    name: 'updateStatsFromMatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'matchId', type: 'bytes32' },
      { name: 'runs', type: 'uint256' },
      { name: 'wickets', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'getAthleteStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'power', type: 'uint256' },
      { name: 'speed', type: 'uint256' },
      { name: 'accuracy', type: 'uint256' },
      { name: 'matchesPlayed', type: 'uint256' },
      { name: 'totalRuns', type: 'uint256' },
      { name: 'totalWickets', type: 'uint256' },
    ],
  },
] as const;

@Injectable()
export class StylusBridgeService {
  private readonly logger = new Logger(StylusBridgeService.name);
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private account: ReturnType<typeof privateKeyToAccount>;

  // Contract addresses (loaded from environment)
  private config: StylusContractConfig;

  constructor() {
    // Initialize configuration from environment variables
    this.config = {
      performanceOracle: (process.env.ORACLE_CONTRACT_ADDRESS || '0x0') as Address,
      deflatinaryBurn: (process.env.BURN_CONTRACT_ADDRESS || '0x0') as Address,
      sppToken: (process.env.SPP_TOKEN_ADDRESS || '0x0') as Address,
      rewardTiers: (process.env.REWARD_TIERS_ADDRESS || '0x0') as Address,
      athleteNFT: (process.env.ATHLETE_NFT_ADDRESS || '0x0') as Address,
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
      chainId: 421614, // Arbitrum Sepolia
    };

    // Initialize account from private key
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      this.logger.warn('No wallet private key configured. Read-only mode.');
    } else {
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
    }

    // Create public client (for reading)
    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(this.config.rpcUrl),
    });

    // Create wallet client (for writing)
    if (this.account) {
      this.walletClient = createWalletClient({
        account: this.account,
        chain: arbitrumSepolia,
        transport: http(this.config.rpcUrl),
      });
    }

    this.logger.log('Stylus Bridge Service initialized');
    this.logger.log(`Oracle: ${this.config.performanceOracle}`);
    this.logger.log(`Burn: ${this.config.deflatinaryBurn}`);
    this.logger.log(`NFT: ${this.config.athleteNFT}`);
  }

  // ==================== Performance Oracle Methods ====================

  /**
   * Register a new match on-chain
   */
  async registerMatch(matchId: string): Promise<TransactionResult> {
    const matchIdBytes = this.stringToBytes32(matchId);

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.performanceOracle,
        abi: ORACLE_ABI,
        functionName: 'registerMatch',
        args: [matchIdBytes],
      });

      this.logger.log(`Match registered: ${matchId}, tx: ${hash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 'success' ? 'success' : 'failed',
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
      };
    } catch (error) {
      this.logger.error(`Failed to register match: ${error.message}`);
      throw new BadRequestException(`Match registration failed: ${error.message}`);
    }
  }

  /**
   * Finalize match with performance data
   */
  async finalizeMatch(data: MatchFinalizationData): Promise<TransactionResult> {
    const matchIdBytes = this.stringToBytes32(data.matchId);

    // Calculate data hash from performances
    const dataHash = this.calculateDataHash(data);

    try {
      // 1. Finalize match on oracle
      const finalizeHash = await this.walletClient.writeContract({
        address: this.config.performanceOracle,
        abi: ORACLE_ABI,
        functionName: 'finalizeMatch',
        args: [matchIdBytes, dataHash, data.playerCount],
      });

      await this.publicClient.waitForTransactionReceipt({ hash: finalizeHash });

      // 2. Record each player's performance
      for (const perf of data.performances) {
        await this.walletClient.writeContract({
          address: this.config.performanceOracle,
          abi: ORACLE_ABI,
          functionName: 'recordPerformance',
          args: [
            matchIdBytes,
            perf.playerAddress as Address,
            BigInt(perf.runsScored),
            BigInt(perf.wicketsTaken),
            BigInt(perf.ballsFaced),
            BigInt(perf.ballsBowled),
            perf.tier,
            BigInt(perf.effortScore),
          ],
        });
      }

      this.logger.log(`Match finalized: ${data.matchId}, players: ${data.playerCount}`);

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: finalizeHash });

      return {
        hash: finalizeHash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 'success' ? 'success' : 'failed',
        gasUsed: receipt.gasUsed,
      };
    } catch (error) {
      this.logger.error(`Failed to finalize match: ${error.message}`);
      throw new BadRequestException(`Match finalization failed: ${error.message}`);
    }
  }

  /**
   * Get match proof from oracle
   */
  async getMatchProof(matchId: string): Promise<{
    dataHash: string;
    isFinalized: boolean;
    finalizedAt: bigint;
  }> {
    const matchIdBytes = this.stringToBytes32(matchId);

    const [dataHash, isFinalized, finalizedAt] = await this.publicClient.readContract({
      address: this.config.performanceOracle,
      abi: ORACLE_ABI,
      functionName: 'getMatchProof',
      args: [matchIdBytes],
    });

    return { dataHash, isFinalized, finalizedAt };
  }

  // ==================== Burn Contract Methods ====================

  /**
   * Execute burn for performance
   */
  async burnForPerformance(request: BurnRequest): Promise<BurnResult> {
    const matchIdBytes = this.stringToBytes32(request.matchId);

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.deflatinaryBurn,
        abi: BURN_ABI,
        functionName: 'burnForPerformance',
        args: [
          matchIdBytes,
          request.playerAddress as Address,
          request.tier,
          BigInt(request.effortScore),
        ],
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse logs to get burn and reward amounts
      // (Simplified - in production, parse event logs)
      const burnAmount = BigInt(0); // Extract from logs
      const rewardAmount = BigInt(0); // Extract from logs

      this.logger.log(
        `Burn executed for ${request.playerAddress}, tier: ${request.tier}, tx: ${hash}`,
      );

      return {
        txHash: hash,
        burnAmount,
        rewardAmount,
        tier: request.tier,
        player: request.playerAddress as Address,
      };
    } catch (error) {
      this.logger.error(`Burn failed: ${error.message}`);
      throw new BadRequestException(`Burn execution failed: ${error.message}`);
    }
  }

  /**
   * Calculate reward estimate (read-only)
   */
  async calculateReward(tier: RewardTier, effortScore: number): Promise<bigint> {
    const reward = await this.publicClient.readContract({
      address: this.config.deflatinaryBurn,
      abi: BURN_ABI,
      functionName: 'calculateReward',
      args: [tier, BigInt(effortScore)],
    });

    return reward;
  }

  /**
   * Get total burned tokens
   */
  async getTotalBurned(): Promise<bigint> {
    const total = await this.publicClient.readContract({
      address: this.config.deflatinaryBurn,
      abi: BURN_ABI,
      functionName: 'totalBurned',
      args: [],
    });

    return total;
  }

  // ==================== NFT Contract Methods ====================

  /**
   * Mint athlete profile NFT
   */
  async mintAthleteProfile(
    athleteAddress: Address,
    athleteName: string,
  ): Promise<{ tokenId: bigint; txHash: `0x${string}` }> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.athleteNFT,
        abi: NFT_ABI,
        functionName: 'mintAthleteProfile',
        args: [athleteAddress, athleteName],
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse tokenId from logs (simplified)
      const tokenId = BigInt(1); // Extract from event logs

      this.logger.log(`Athlete profile minted: ${athleteName}, tokenId: ${tokenId}`);

      return { tokenId, txHash: hash };
    } catch (error) {
      this.logger.error(`Failed to mint athlete profile: ${error.message}`);
      throw new BadRequestException(`Mint failed: ${error.message}`);
    }
  }

  /**
   * Update athlete stats from match
   */
  async updateAthleteStats(
    tokenId: bigint,
    matchId: string,
    runs: number,
    wickets: number,
  ): Promise<`0x${string}`> {
    const matchIdBytes = this.stringToBytes32(matchId);

    try {
      const hash = await this.walletClient.writeContract({
        address: this.config.athleteNFT,
        abi: NFT_ABI,
        functionName: 'updateStatsFromMatch',
        args: [tokenId, matchIdBytes, BigInt(runs), BigInt(wickets)],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      this.logger.log(`Athlete stats updated: tokenId ${tokenId}, match ${matchId}`);

      return hash;
    } catch (error) {
      this.logger.error(`Failed to update athlete stats: ${error.message}`);
      throw new BadRequestException(`Stats update failed: ${error.message}`);
    }
  }

  /**
   * Get athlete stats
   */
  async getAthleteStats(tokenId: bigint): Promise<{
    power: bigint;
    speed: bigint;
    accuracy: bigint;
    matchesPlayed: bigint;
    totalRuns: bigint;
    totalWickets: bigint;
  }> {
    const [power, speed, accuracy, matchesPlayed, totalRuns, totalWickets] =
      await this.publicClient.readContract({
        address: this.config.athleteNFT,
        abi: NFT_ABI,
        functionName: 'getAthleteStats',
        args: [tokenId],
      });

    return { power, speed, accuracy, matchesPlayed, totalRuns, totalWickets };
  }

  // ==================== Helper Methods ====================

  /**
   * Convert string to bytes32
   */
  private stringToBytes32(str: string): `0x${string}` {
    // If already hex, return as is
    if (str.startsWith('0x') && str.length === 66) {
      return str as `0x${string}`;
    }

    // Otherwise hash it
    return keccak256(toHex(str));
  }

  /**
   * Calculate data hash for match finalization
   */
  private calculateDataHash(data: MatchFinalizationData): `0x${string}` {
    // Create deterministic hash from performance data
    const dataString = JSON.stringify(data.performances);
    return keccak256(toHex(dataString));
  }

  /**
   * Format wei to ether string
   */
  formatAmount(wei: bigint): string {
    return formatEther(wei);
  }

  /**
   * Parse ether string to wei
   */
  parseAmount(ether: string): bigint {
    return parseEther(ether);
  }
}
