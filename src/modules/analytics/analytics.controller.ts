/**
 * AI Analytics Controller
 * Phase 5: Performance Tracking & AI-Powered Insights
 */

import { Controller, Get, Post, Param, Query, Render } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ============================================
  // UI Routes
  // ============================================

  @Get()
  @Render('analytics/index')
  analyticsIndex() {
    return {
      title: 'Performance Analytics',
      layout: 'layouts/main',
      pageTitle: 'AI Performance Analytics',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }

  // ============================================
  // API Routes - Insights
  // ============================================

  @Get('api/insights/:userId/:sportId')
  async getInsights(@Param('userId') userId: string, @Param('sportId') sportId: string) {
    const insights = await this.analyticsService.analyzePerformance(userId, sportId);
    return { success: true, data: insights };
  }

  @Post('api/insights/:userId/:sportId/refresh')
  async refreshInsights(@Param('userId') userId: string, @Param('sportId') sportId: string) {
    const insights = await this.analyticsService.analyzePerformance(userId, sportId);
    return { success: true, data: insights, message: 'Insights refreshed' };
  }

  // ============================================
  // API Routes - Statistics
  // ============================================

  @Get('api/stats/:userId/:sportId')
  getPlayerStats(@Param('userId') userId: string, @Param('sportId') sportId: string) {
    const stats = this.analyticsService.getPlayerStats(userId, sportId);
    return { success: true, data: stats };
  }

  @Get('api/trends/:userId/:sportId')
  getTrendData(
    @Param('userId') userId: string,
    @Param('sportId') sportId: string,
    @Query('days') days = 30
  ) {
    const trends = this.analyticsService.getTrendData(userId, sportId, +days);
    return { success: true, data: trends };
  }

  // ============================================
  // API Routes - Match Analysis
  // ============================================

  @Get('api/match/:matchId/analysis')
  analyzeMatch(
    @Param('matchId') matchId: string,
    @Query('userId') userId: string,
    @Query('sportId') sportId: string
  ) {
    const analysis = this.analyticsService.analyzeMatch(matchId, userId, sportId);
    return { success: true, data: analysis };
  }

  // ============================================
  // API Routes - Injury Risk
  // ============================================

  @Get('api/injury-risk/:userId')
  getInjuryRisk(@Param('userId') userId: string) {
    const risk = this.analyticsService.assessInjuryRisk(userId);
    return { success: true, data: risk };
  }

  // ============================================
  // API Routes - Drills
  // ============================================

  @Get('api/drills')
  getAllDrills() {
    const drills = this.analyticsService.getAllDrills();
    return { success: true, data: drills };
  }

  @Get('api/drills/:sportId')
  getRecommendedDrills(
    @Param('sportId') sportId: string,
    @Query('level') skillLevel?: string
  ) {
    const drills = this.analyticsService.getRecommendedDrills(sportId, skillLevel);
    return { success: true, data: drills };
  }
}
