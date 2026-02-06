import { Module } from '@nestjs/common';
import { WearablesController } from './wearables.controller';

/**
 * Module 11 - Wearable & Calorie Integration
 * Biometric validation for effort scoring.
 *
 * Features:
 * - Apple HealthKit integration
 * - Google Health Connect integration
 * - Active heart rate and calorie data during match windows
 * - Effort Score computation
 * - Effort Score feeds into Deflationary Burn Engine
 */
@Module({
  controllers: [WearablesController],
  providers: [],
})
export class WearablesModule {}
