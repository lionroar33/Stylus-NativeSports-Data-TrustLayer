import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { StylusBridgeService } from './stylus-bridge.service';
import { WebacyModule } from '../webacy/webacy.module';

/**
 * Module 9 - Blockchain & Tokenomics (Hybrid: Arbitrum Stylus + NestJS)
 * Verifiable data points and token burn mechanics.
 *
 * **Architecture Update:**
 * - On-chain (Arbitrum Stylus): Performance Oracle, Deflationary Burn, SPP Token, Athlete NFTs
 * - Off-chain (NestJS): Ball-by-ball scoring, real-time updates, HealthKit integration
 * - Bridge Service: Handles RPC calls to Stylus contracts via viem
 *
 * Features:
 * - Finalized match data as Verifiable Data Points on Arbitrum
 * - Token burns proportional to performance-to-effort ratio
 * - Reward tiers: Nifty Fifty, Gayle Storm, 5-Wicket Haul, Hat-trick, etc.
 * - Computational NFTs (Living Athlete Resumes) with dynamic stats
 * - Immutable, auditable on-chain transactions
 * - Wallet connection and balance management
 * - Leaderboard and statistics
 * - Webacy security integration for wallet screening
 */
@Module({
  imports: [WebacyModule],
  controllers: [BlockchainController],
  providers: [BlockchainService, StylusBridgeService],
  exports: [BlockchainService, StylusBridgeService],
})
export class BlockchainModule {}
