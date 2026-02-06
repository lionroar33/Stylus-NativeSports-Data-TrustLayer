import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsController } from './events.controller';
import { CricketScoringService } from './cricket/cricket-scoring.service';

/**
 * Module 4 - Event Ingestion & Scoring Engine
 * Core scoring engine - the heart of the system.
 *
 * Features:
 * - Ball-by-ball event ingestion for cricket
 * - Append-only, immutable event store
 * - Real-time score computation
 * - Support for all sport-specific events
 * - Token reward triggers
 * - Commentary event emission
 */
@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [EventsController],
  providers: [CricketScoringService],
  exports: [CricketScoringService],
})
export class EventsModule {}
