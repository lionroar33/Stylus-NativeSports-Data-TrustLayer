/**
 * Blockchain Module - DTOs
 * Phase 5: Solana Integration & Tokenomics
 */

import { IsString, IsUUID, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';

export enum TokenTier {
  NIFTY_FIFTY = 'nifty_fifty',
  GAYLE_STORM = 'gayle_storm',
  FIVE_WICKET_HAUL = 'five_wicket_haul',
  HAT_TRICK = 'hat_trick',
  MAIDEN_MASTER = 'maiden_master',
  RUN_MACHINE = 'run_machine',
  GOLDEN_ARM = 'golden_arm',
  ALL_ROUNDER = 'all_rounder',
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export class CreateTokenTransactionDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  matchId: string;

  @IsEnum(TokenTier)
  rewardTier: TokenTier;

  @IsNumber()
  @Min(0)
  performanceScore: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  effortScore: number;
}

export class ConnectWalletDto {
  @IsUUID()
  userId: string;

  @IsString()
  walletAddress: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

export class TokenTransactionResponseDto {
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

export class WalletBalanceDto {
  address: string;
  balance: number;
  pendingRewards: number;
  totalEarned: number;
  totalBurned: number;
}

export class TokenStatsDto {
  totalSupply: number;
  totalBurned: number;
  circulatingSupply: number;
  burnRate: number;
  activeUsers: number;
  rewardsDistributed: number;
}

export class LeaderboardEntryDto {
  rank: number;
  userId: string;
  userName: string;
  tokensEarned: number;
  matchesPlayed: number;
  winRate: number;
  tier: string;
}
