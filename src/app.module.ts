import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Shared Modules
import { RedisModule } from './shared/redis/redis.module';
import { WebacyModule } from './modules/webacy/webacy.module';

// Feature Modules (All 11 Modules)
import { AuthModule } from './modules/auth/auth.module';
import { SportsModule } from './modules/sports/sports.module';
import { MatchesModule } from './modules/matches/matches.module';
import { EventsModule } from './modules/events/events.module';
import { ForumsModule } from './modules/forums/forums.module';
import { SocialModule } from './modules/social/social.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { CommentaryModule } from './modules/commentary/commentary.module';
import { WearablesModule } from './modules/wearables/wearables.module';

/**
 * Sport Performance Protocol - Main Application Module
 *
 * Complete Module Structure (Phase 1-5):
 * 1. Auth Module - User Account & Profile System
 * 2. Sports Module - Sport Selection & Skill Integration
 * 3. Matches Module - Match & Tournament Management
 * 4. Events Module - Event Ingestion & Cricket Scoring Engine
 * 5. Forums Module - Community Discussion Space
 * 6. Social Module - Follow System & Social Feed
 * 7. E-Commerce Module - Sports Gear Marketplace
 * 8. Analytics Module - AI-Powered Performance Tracking
 * 9. Blockchain Module - Tokenomics (Solana)
 * 10. Commentary Module - Real-Time Commentary Engine
 * 11. Wearables Module - Calorie Integration
 *
 * Shared Infrastructure:
 * - Redis Module - Pub/Sub for real-time updates
 * - Event Emitter - Cross-module event communication
 * - Webacy Module - Security screening (wallet risk, sanctions, contracts)
 */
@Module({
  imports: [
    // Infrastructure
    EventEmitterModule.forRoot(),
    RedisModule,
    WebacyModule,

    // Feature Modules
    AuthModule,
    SportsModule,
    MatchesModule,
    EventsModule,
    ForumsModule,
    SocialModule,
    EcommerceModule,
    AnalyticsModule,
    BlockchainModule,
    CommentaryModule,
    WearablesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
