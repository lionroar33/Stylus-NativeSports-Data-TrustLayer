import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/**
 * Module 8 - AI-Based Performance Tracking
 * AI-powered analytics and insights.
 *
 * Features:
 * - Dynamic stat cards per sport
 * - AI-powered suggestions and improvement tips
 * - Injury risk warnings
 * - Drill recommendations
 * - Trend analysis and visualizations
 */
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
