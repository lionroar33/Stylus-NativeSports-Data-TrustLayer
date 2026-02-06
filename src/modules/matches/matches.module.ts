import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';

/**
 * Module 3 - Match & Tournament Management
 * Handles match creation, lifecycle, and tournament brackets.
 *
 * Features:
 * - Create match or tournament by sport/format
 * - Match lifecycle: Create > Start > Pause > Resume > Finish > Archive
 * - Bracket generator: Round Robin, Knockout, League with Playoffs
 * - Practice Mode and Tournament Mode
 */
@Module({
  controllers: [MatchesController],
  providers: [],
})
export class MatchesModule {}
