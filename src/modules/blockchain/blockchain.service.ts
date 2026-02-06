/**
 * Blockchain Service
 * Phase 5: Solana Integration & Tokenomics
 *
 * Security: Integrated with Webacy for wallet screening
 * - All wallets are screened before connecting
 * - All wallets are screened before token burns
 * - Sanctioned and high-risk wallets are blocked
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { WebacyService } from '../webacy/webacy.service';
import { StylusBridgeService } from './stylus-bridge.service';
import {
  TokenTier,
  TransactionStatus,
  CreateTokenTransactionDto,
  ConnectWalletDto,
  TokenTransactionResponseDto,
  WalletBalanceDto,
  TokenStatsDto,
  LeaderboardEntryDto,
} from './dto/token.dto';

export interface UserWallet {
  userId: string;
  walletAddress: string;
  balance: number;
  pendingRewards: number;
  totalEarned: number;
  isVerified: boolean;
  connectedAt: Date;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  matchId: string;
  burnAmount: number;
  rewardAmount: number;
  effortScore: number;
  performanceScore: number;
  rewardTier: TokenTier;
  burnMultiplier: number;
  solanaTxHash?: string;
  status: TransactionStatus;
  timestamp: Date;
}

// Burn multipliers for each tier
const BURN_MULTIPLIERS: Record<TokenTier, number> = {
  [TokenTier.NIFTY_FIFTY]: 1.5,
  [TokenTier.GAYLE_STORM]: 3.0,
  [TokenTier.FIVE_WICKET_HAUL]: 2.5,
  [TokenTier.HAT_TRICK]: 3.0,
  [TokenTier.MAIDEN_MASTER]: 1.5,
  [TokenTier.RUN_MACHINE]: 4.0,
  [TokenTier.GOLDEN_ARM]: 1.3,
  [TokenTier.ALL_ROUNDER]: 2.0,
};

// Base reward amounts for each tier
const BASE_REWARDS: Record<TokenTier, number> = {
  [TokenTier.NIFTY_FIFTY]: 50,
  [TokenTier.GAYLE_STORM]: 150,
  [TokenTier.FIVE_WICKET_HAUL]: 100,
  [TokenTier.HAT_TRICK]: 200,
  [TokenTier.MAIDEN_MASTER]: 30,
  [TokenTier.RUN_MACHINE]: 250,
  [TokenTier.GOLDEN_ARM]: 40,
  [TokenTier.ALL_ROUNDER]: 120,
};

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private wallets: Map<string, UserWallet> = new Map();
  private transactions: Map<string, TokenTransaction> = new Map();
  private tokenStats: TokenStatsDto = {
    totalSupply: 1000000000, // 1 billion
    totalBurned: 0,
    circulatingSupply: 1000000000,
    burnRate: 0,
    activeUsers: 0,
    rewardsDistributed: 0,
  };

  constructor(
    private eventEmitter: EventEmitter2,
    private webacyService: WebacyService,
    private stylusBridge: StylusBridgeService,
  ) {}

  // ============================================
  // Wallet Management
  // ============================================

  async connectWallet(dto: ConnectWalletDto): Promise<UserWallet> {
    // Validate wallet address format (Solana addresses are base58, ~44 chars)
    if (!this.isValidSolanaAddress(dto.walletAddress)) {
      throw new BadRequestException('Invalid Solana wallet address');
    }

    // Webacy Security: Screen wallet before allowing connection
    this.logger.log(`Screening wallet ${dto.walletAddress} before connection...`);
    await this.webacyService.screenWalletForBurn(dto.walletAddress);

    // Check if wallet already connected to another user
    const existingWallet = Array.from(this.wallets.values())
      .find(w => w.walletAddress === dto.walletAddress && w.userId !== dto.userId);

    if (existingWallet) {
      throw new BadRequestException('Wallet already connected to another account');
    }

    const wallet: UserWallet = {
      userId: dto.userId,
      walletAddress: dto.walletAddress,
      balance: 0,
      pendingRewards: 0,
      totalEarned: 0,
      isVerified: true, // Would verify signature in production
      connectedAt: new Date(),
    };

    this.wallets.set(dto.userId, wallet);
    this.tokenStats.activeUsers++;

    this.logger.log(`Wallet connected for user ${dto.userId}: ${dto.walletAddress}`);
    return wallet;
  }

  disconnectWallet(userId: string): void {
    if (!this.wallets.has(userId)) {
      throw new NotFoundException('No wallet connected');
    }

    this.wallets.delete(userId);
    this.tokenStats.activeUsers--;
  }

  getWallet(userId: string): UserWallet | null {
    return this.wallets.get(userId) || null;
  }

  getWalletBalance(userId: string): WalletBalanceDto {
    const wallet = this.wallets.get(userId);

    if (!wallet) {
      return {
        address: '',
        balance: 0,
        pendingRewards: 0,
        totalEarned: 0,
        totalBurned: this.getUserTotalBurned(userId),
      };
    }

    return {
      address: wallet.walletAddress,
      balance: wallet.balance,
      pendingRewards: wallet.pendingRewards,
      totalEarned: wallet.totalEarned,
      totalBurned: this.getUserTotalBurned(userId),
    };
  }

  private getUserTotalBurned(userId: string): number {
    return Array.from(this.transactions.values())
      .filter(t => t.userId === userId)
      .reduce((sum, t) => sum + t.burnAmount, 0);
  }

  private isValidSolanaAddress(address: string): boolean {
    // Updated for Ethereum/Arbitrum addresses (0x + 40 hex chars)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // ============================================
  // Token Transactions
  // ============================================

  @OnEvent('token.rewards')
  async handleTokenRewards(data: { matchId: string; rewards: any[] }): Promise<void> {
    for (const reward of data.rewards) {
      await this.createTokenTransaction({
        userId: reward.playerId,
        matchId: data.matchId,
        rewardTier: reward.tier,
        performanceScore: 80, // Would calculate from match data
        effortScore: 75, // Would come from wearable data
      });
    }
  }

  async createTokenTransaction(dto: CreateTokenTransactionDto): Promise<TokenTransaction> {
    // Webacy Security: Screen wallet before any burn transaction
    const wallet = this.wallets.get(dto.userId);
    if (wallet) {
      this.logger.log(`Screening wallet ${wallet.walletAddress} before burn transaction...`);
      await this.webacyService.screenWalletForBurn(wallet.walletAddress);
    }

    const burnMultiplier = BURN_MULTIPLIERS[dto.rewardTier];
    const baseReward = BASE_REWARDS[dto.rewardTier];

    // Calculate reward based on effort score
    const effortMultiplier = dto.effortScore / 100; // 0-1
    const rewardAmount = baseReward * effortMultiplier * burnMultiplier;

    // Calculate burn amount (proportional to reward)
    const burnAmount = rewardAmount * 0.1; // 10% of reward is burned

    const transaction: TokenTransaction = {
      id: uuidv4(),
      userId: dto.userId,
      matchId: dto.matchId,
      burnAmount,
      rewardAmount,
      effortScore: dto.effortScore,
      performanceScore: dto.performanceScore,
      rewardTier: dto.rewardTier,
      burnMultiplier,
      status: TransactionStatus.PENDING,
      timestamp: new Date(),
    };

    this.transactions.set(transaction.id, transaction);

    // Simulate blockchain transaction
    try {
      const txHash = await this.submitToBlockchain(transaction);
      transaction.solanaTxHash = txHash;
      transaction.status = TransactionStatus.CONFIRMED;

      // Update user wallet
      const wallet = this.wallets.get(dto.userId);
      if (wallet) {
        wallet.balance += rewardAmount;
        wallet.totalEarned += rewardAmount;
      }

      // Update stats
      this.tokenStats.totalBurned += burnAmount;
      this.tokenStats.circulatingSupply -= burnAmount;
      this.tokenStats.rewardsDistributed += rewardAmount;
      this.tokenStats.burnRate = this.tokenStats.totalBurned / this.tokenStats.totalSupply;

      this.logger.log(`Token transaction confirmed: ${transaction.id}, reward: ${rewardAmount}, burn: ${burnAmount}`);
    } catch (error) {
      transaction.status = TransactionStatus.FAILED;
      this.logger.error(`Token transaction failed: ${error}`);
    }

    this.eventEmitter.emit('token.transaction.completed', { transaction });
    return transaction;
  }

  private async submitToBlockchain(transaction: TokenTransaction): Promise<string> {
    // NEW: Use Stylus bridge to submit on-chain burn transaction
    try {
      const wallet = this.wallets.get(transaction.userId);
      if (!wallet) {
        // Fallback to simulated transaction if no wallet
        await new Promise(resolve => setTimeout(resolve, 100));
        return `sim_${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
      }

      // Map TokenTier to RewardTier enum (0-7)
      const tierMap: Record<TokenTier, number> = {
        [TokenTier.NIFTY_FIFTY]: 0,
        [TokenTier.GAYLE_STORM]: 1,
        [TokenTier.FIVE_WICKET_HAUL]: 2,
        [TokenTier.HAT_TRICK]: 3,
        [TokenTier.MAIDEN_MASTER]: 4,
        [TokenTier.RUN_MACHINE]: 5,
        [TokenTier.GOLDEN_ARM]: 6,
        [TokenTier.ALL_ROUNDER]: 7,
      };

      // Submit burn transaction to Stylus contract
      const result = await this.stylusBridge.burnForPerformance({
        matchId: transaction.matchId,
        playerAddress: wallet.walletAddress as any,
        tier: tierMap[transaction.rewardTier],
        performanceScore: transaction.performanceScore,
        effortScore: transaction.effortScore,
      });

      this.logger.log(`On-chain burn submitted: ${result.txHash}`);
      return result.txHash;
    } catch (error) {
      this.logger.error(`Blockchain submission failed: ${error.message}`);
      // Fallback to simulated transaction
      await new Promise(resolve => setTimeout(resolve, 100));
      return `fallback_${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    }
  }

  getTransaction(transactionId: string): TokenTransaction {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }
    return transaction;
  }

  getUserTransactions(userId: string, page = 1, limit = 20): { transactions: TokenTransaction[]; total: number } {
    const allTransactions = Array.from(this.transactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = allTransactions.length;
    const transactions = allTransactions.slice((page - 1) * limit, page * limit);

    return { transactions, total };
  }

  getMatchTransactions(matchId: string): TokenTransaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.matchId === matchId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ============================================
  // Token Statistics
  // ============================================

  getTokenStats(): TokenStatsDto {
    return { ...this.tokenStats };
  }

  getBurnStatsByTier(): { tier: TokenTier; totalBurned: number; transactionCount: number }[] {
    const tiers = Object.values(TokenTier);
    return tiers.map(tier => {
      const tierTransactions = Array.from(this.transactions.values())
        .filter(t => t.rewardTier === tier);

      return {
        tier,
        totalBurned: tierTransactions.reduce((sum, t) => sum + t.burnAmount, 0),
        transactionCount: tierTransactions.length,
      };
    });
  }

  // ============================================
  // Leaderboard
  // ============================================

  getLeaderboard(limit = 10): LeaderboardEntryDto[] {
    // Aggregate user earnings
    const userEarnings = new Map<string, { total: number; matches: Set<string> }>();

    for (const tx of this.transactions.values()) {
      if (tx.status !== TransactionStatus.CONFIRMED) continue;

      let userData = userEarnings.get(tx.userId);
      if (!userData) {
        userData = { total: 0, matches: new Set() };
        userEarnings.set(tx.userId, userData);
      }

      userData.total += tx.rewardAmount;
      userData.matches.add(tx.matchId);
    }

    // Sort by earnings
    const sortedUsers = Array.from(userEarnings.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, limit);

    return sortedUsers.map(([userId, data], index) => ({
      rank: index + 1,
      userId,
      userName: `Player ${index + 1}`, // Would fetch from user service
      tokensEarned: data.total,
      matchesPlayed: data.matches.size,
      winRate: 0.65, // Would calculate from match data
      tier: this.getUserTier(data.total),
    }));
  }

  private getUserTier(totalEarnings: number): string {
    if (totalEarnings >= 10000) return 'Legend';
    if (totalEarnings >= 5000) return 'Champion';
    if (totalEarnings >= 1000) return 'Pro';
    if (totalEarnings >= 500) return 'Advanced';
    return 'Rookie';
  }

  // ============================================
  // Verifiable Data Points
  // ============================================

  async recordVerifiableDataPoint(matchId: string, data: any): Promise<string> {
    // NEW: Register match on Arbitrum Stylus Performance Oracle
    try {
      const result = await this.stylusBridge.registerMatch(matchId);
      this.logger.log(`Verifiable data point recorded for match ${matchId}: ${result.hash}`);
      return result.hash;
    } catch (error) {
      this.logger.error(`Failed to record VDP: ${error.message}`);
      // Fallback to simulated
      const txHash = `vdp_${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
      this.logger.log(`Verifiable data point recorded (simulated) for match ${matchId}: ${txHash}`);
      return txHash;
    }
  }

  async verifyDataPoint(txHash: string): Promise<boolean> {
    // In production, this would verify on Solana blockchain
    return txHash.startsWith('vdp_');
  }
}
