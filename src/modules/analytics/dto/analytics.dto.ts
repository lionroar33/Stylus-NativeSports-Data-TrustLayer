/**
 * AI Analytics Module - DTOs
 * Phase 5: Performance Tracking & Insights
 */

import { IsString, IsUUID, IsOptional, IsNumber, IsArray, IsEnum, IsDate } from 'class-validator';

export enum InsightType {
  STRENGTH = 'strength',
  WEAKNESS = 'weakness',
  IMPROVEMENT = 'improvement',
  WARNING = 'warning',
  RECOMMENDATION = 'recommendation',
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

export class GenerateInsightsDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  sportId: string;

  @IsOptional()
  @IsNumber()
  matchCount?: number;
}

export class PerformanceInsightDto {
  id: string;
  userId: string;
  sportId: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number; // 0-1
  data?: Record<string, any>;
  createdAt: Date;
}

export class PlayerStatsDto {
  userId: string;
  sportId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  averageScore: number;
  highestScore: number;
  recentForm: string[]; // W, L, W, W, L
  trendDirection: TrendDirection;
  lastUpdated: Date;
}

export class MatchAnalyticsDto {
  matchId: string;
  userId: string;
  sportId: string;
  performance: {
    score: number;
    efficiency: number;
    consistency: number;
    improvement: number;
  };
  keyMoments: {
    timestamp: Date;
    event: string;
    impact: 'positive' | 'negative' | 'neutral';
  }[];
  comparison: {
    vsOpponent: number;
    vsAverage: number;
    vsBest: number;
  };
}

export class InjuryRiskDto {
  userId: string;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
  lastAssessed: Date;
}

export class DrillRecommendationDto {
  id: string;
  sportId: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  targetAreas: string[];
  expectedImprovement: string;
}
