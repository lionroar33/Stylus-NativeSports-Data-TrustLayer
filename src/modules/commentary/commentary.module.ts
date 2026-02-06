import { Module } from '@nestjs/common';
import { CommentaryController } from './commentary.controller';
import { CommentaryService } from './services/commentary.service';
import { MatchGateway } from './gateways/match.gateway';
import { RedisModule } from '../../shared/redis/redis.module';

/**
 * Module 10 - Real-Time Commentary Engine
 * NLG-powered automated commentary.
 *
 * Features:
 * - NLG pipeline subscribing to match events via Redis pub/sub
 * - Templated, localized commentary lines
 * - Cooldown logic to prevent spam
 * - Persona toggles: Play-by-play, Energetic, Coaching
 * - 12 cricket-specific commentary triggers
 * - WebSocket gateway for real-time updates
 */
@Module({
  imports: [RedisModule],
  controllers: [CommentaryController],
  providers: [CommentaryService, MatchGateway],
  exports: [CommentaryService, MatchGateway],
})
export class CommentaryModule {}
