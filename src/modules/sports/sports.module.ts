import { Module } from '@nestjs/common';
import { SportsController } from './sports.controller';

/**
 * Module 2 - Sport Selection & Skill Integration
 * Handles sport catalog and user sport profiles with skill levels.
 *
 * Features:
 * - Sport picker during onboarding
 * - Skill level tagging (Beginner/Intermediate/Advanced/Professional)
 * - Practice/tournament availability toggle
 */
@Module({
  controllers: [SportsController],
  providers: [],
})
export class SportsModule {}
