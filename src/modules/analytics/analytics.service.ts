/**
 * AI Analytics Service
 * Phase 5: Performance Tracking & AI-Powered Insights
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  InsightType,
  TrendDirection,
  PerformanceInsightDto,
  PlayerStatsDto,
  MatchAnalyticsDto,
  InjuryRiskDto,
  DrillRecommendationDto,
} from './dto/analytics.dto';

interface MatchData {
  matchId: string;
  userId: string;
  sportId: string;
  score: number;
  result: 'win' | 'loss' | 'draw';
  stats: Record<string, number>;
  timestamp: Date;
}

interface UserPerformanceData {
  userId: string;
  sportId: string;
  matches: MatchData[];
  insights: PerformanceInsightDto[];
  lastAnalyzed: Date;
}

@Injectable()
export class AnalyticsService {
  private performanceData: Map<string, UserPerformanceData> = new Map();
  private drillLibrary: DrillRecommendationDto[] = [];

  constructor() {
    this.initializeDrillLibrary();
  }

  private initializeDrillLibrary(): void {
    this.drillLibrary = [
      {
        id: uuidv4(),
        sportId: 'cricket',
        title: 'Shadow Batting Practice',
        description: 'Practice batting techniques without a ball to improve muscle memory and form',
        difficulty: 'beginner',
        duration: 15,
        targetAreas: ['technique', 'footwork', 'balance'],
        expectedImprovement: 'Better shot execution and timing',
      },
      {
        id: uuidv4(),
        sportId: 'cricket',
        title: 'Throw-Down Drill',
        description: 'Face rapid throw-downs to improve reaction time and shot selection',
        difficulty: 'intermediate',
        duration: 30,
        targetAreas: ['reaction', 'shot_selection', 'timing'],
        expectedImprovement: 'Faster reflexes and better decision making',
      },
      {
        id: uuidv4(),
        sportId: 'cricket',
        title: 'Death Bowling Practice',
        description: 'Practice yorkers and slower balls at the death',
        difficulty: 'advanced',
        duration: 45,
        targetAreas: ['accuracy', 'variation', 'pressure'],
        expectedImprovement: 'Better economy rate in death overs',
      },
      {
        id: uuidv4(),
        sportId: 'tennis',
        title: 'Serve Accuracy Drill',
        description: 'Target specific areas of the service box to improve placement',
        difficulty: 'intermediate',
        duration: 20,
        targetAreas: ['serve', 'accuracy', 'consistency'],
        expectedImprovement: 'Higher first serve percentage',
      },
      {
        id: uuidv4(),
        sportId: 'football',
        title: 'Ball Control Drill',
        description: 'Practice close ball control in tight spaces',
        difficulty: 'beginner',
        duration: 15,
        targetAreas: ['dribbling', 'control', 'agility'],
        expectedImprovement: 'Better ball retention under pressure',
      },
    ];
  }

  // ============================================
  // Performance Analysis
  // ============================================

  async analyzePerformance(userId: string, sportId: string): Promise<PerformanceInsightDto[]> {
    const key = `${userId}:${sportId}`;
    let data = this.performanceData.get(key);

    if (!data) {
      data = {
        userId,
        sportId,
        matches: this.generateSampleMatchData(userId, sportId),
        insights: [],
        lastAnalyzed: new Date(),
      };
      this.performanceData.set(key, data);
    }

    // Generate insights based on match data
    const insights = this.generateInsights(data);
    data.insights = insights;
    data.lastAnalyzed = new Date();

    return insights;
  }

  private generateInsights(data: UserPerformanceData): PerformanceInsightDto[] {
    const insights: PerformanceInsightDto[] = [];
    const { matches, userId, sportId } = data;

    if (matches.length === 0) {
      return [{
        id: uuidv4(),
        userId,
        sportId,
        type: InsightType.RECOMMENDATION,
        title: 'Start Playing',
        description: 'Play your first match to start tracking your performance.',
        confidence: 1,
        createdAt: new Date(),
      }];
    }

    // Analyze win rate
    const wins = matches.filter(m => m.result === 'win').length;
    const winRate = wins / matches.length;

    if (winRate > 0.6) {
      insights.push({
        id: uuidv4(),
        userId,
        sportId,
        type: InsightType.STRENGTH,
        title: 'Winning Form',
        description: `You have a ${(winRate * 100).toFixed(1)}% win rate. Keep up the great work!`,
        confidence: 0.9,
        data: { winRate, wins, total: matches.length },
        createdAt: new Date(),
      });
    } else if (winRate < 0.4) {
      insights.push({
        id: uuidv4(),
        userId,
        sportId,
        type: InsightType.IMPROVEMENT,
        title: 'Room for Growth',
        description: 'Your win rate indicates opportunity for improvement. Consider practicing more.',
        confidence: 0.85,
        data: { winRate, wins, total: matches.length },
        createdAt: new Date(),
      });
    }

    // Analyze recent form
    const recentMatches = matches.slice(-5);
    const recentWins = recentMatches.filter(m => m.result === 'win').length;

    if (recentWins >= 4) {
      insights.push({
        id: uuidv4(),
        userId,
        sportId,
        type: InsightType.STRENGTH,
        title: 'Hot Streak',
        description: `You're on fire! Won ${recentWins} of your last ${recentMatches.length} matches.`,
        confidence: 0.95,
        data: { recentWins, recentMatches: recentMatches.length },
        createdAt: new Date(),
      });
    } else if (recentWins <= 1 && recentMatches.length >= 3) {
      insights.push({
        id: uuidv4(),
        userId,
        sportId,
        type: InsightType.WARNING,
        title: 'Form Dip',
        description: 'Recent results show a dip in form. Take a break or analyze your recent games.',
        confidence: 0.8,
        data: { recentWins, recentMatches: recentMatches.length },
        createdAt: new Date(),
      });
    }

    // Analyze score trends
    const avgScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
    const recentAvgScore = recentMatches.reduce((sum, m) => sum + m.score, 0) / recentMatches.length;

    if (recentAvgScore > avgScore * 1.2) {
      insights.push({
        id: uuidv4(),
        userId,
        sportId,
        type: InsightType.STRENGTH,
        title: 'Scoring Improvement',
        description: 'Your recent scoring has improved significantly compared to your average.',
        confidence: 0.85,
        data: { avgScore, recentAvgScore, improvement: ((recentAvgScore - avgScore) / avgScore * 100).toFixed(1) },
        createdAt: new Date(),
      });
    }

    // Add recommendations
    insights.push({
      id: uuidv4(),
      userId,
      sportId,
      type: InsightType.RECOMMENDATION,
      title: 'Practice Suggestion',
      description: 'Based on your stats, consider focusing on consistency. Try the recommended drills below.',
      confidence: 0.75,
      createdAt: new Date(),
    });

    return insights;
  }

  private generateSampleMatchData(userId: string, sportId: string): MatchData[] {
    // Generate sample historical data for demo
    const matches: MatchData[] = [];
    const now = Date.now();

    for (let i = 0; i < 10; i++) {
      const score = Math.floor(Math.random() * 100) + 20;
      const result = Math.random() > 0.45 ? 'win' : 'loss';

      matches.push({
        matchId: uuidv4(),
        userId,
        sportId,
        score,
        result: result as 'win' | 'loss',
        stats: {
          accuracy: Math.floor(Math.random() * 40) + 60,
          efficiency: Math.floor(Math.random() * 30) + 70,
        },
        timestamp: new Date(now - i * 86400000 * 3), // Every 3 days
      });
    }

    return matches.reverse();
  }

  // ============================================
  // Player Statistics
  // ============================================

  getPlayerStats(userId: string, sportId: string): PlayerStatsDto {
    const key = `${userId}:${sportId}`;
    const data = this.performanceData.get(key);

    if (!data || data.matches.length === 0) {
      return {
        userId,
        sportId,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        averageScore: 0,
        highestScore: 0,
        recentForm: [],
        trendDirection: TrendDirection.STABLE,
        lastUpdated: new Date(),
      };
    }

    const { matches } = data;
    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;

    return {
      userId,
      sportId,
      matchesPlayed: matches.length,
      wins,
      losses,
      winRate: wins / matches.length,
      averageScore: matches.reduce((sum, m) => sum + m.score, 0) / matches.length,
      highestScore: Math.max(...matches.map(m => m.score)),
      recentForm: matches.slice(-5).map(m => m.result === 'win' ? 'W' : 'L'),
      trendDirection: this.calculateTrend(matches),
      lastUpdated: new Date(),
    };
  }

  private calculateTrend(matches: MatchData[]): TrendDirection {
    if (matches.length < 4) return TrendDirection.STABLE;

    const recent = matches.slice(-3);
    const older = matches.slice(-6, -3);

    const recentWinRate = recent.filter(m => m.result === 'win').length / recent.length;
    const olderWinRate = older.filter(m => m.result === 'win').length / older.length;

    if (recentWinRate > olderWinRate + 0.2) return TrendDirection.UP;
    if (recentWinRate < olderWinRate - 0.2) return TrendDirection.DOWN;
    return TrendDirection.STABLE;
  }

  // ============================================
  // Match Analytics
  // ============================================

  analyzeMatch(matchId: string, userId: string, sportId: string): MatchAnalyticsDto {
    return {
      matchId,
      userId,
      sportId,
      performance: {
        score: Math.floor(Math.random() * 50) + 50,
        efficiency: Math.floor(Math.random() * 30) + 70,
        consistency: Math.floor(Math.random() * 25) + 75,
        improvement: Math.floor(Math.random() * 20) - 10,
      },
      keyMoments: [
        { timestamp: new Date(), event: 'Great start', impact: 'positive' },
        { timestamp: new Date(), event: 'Momentum shift', impact: 'negative' },
        { timestamp: new Date(), event: 'Strong finish', impact: 'positive' },
      ],
      comparison: {
        vsOpponent: Math.floor(Math.random() * 40) - 20,
        vsAverage: Math.floor(Math.random() * 30) - 15,
        vsBest: Math.floor(Math.random() * 50) * -1,
      },
    };
  }

  // ============================================
  // Injury Risk Assessment
  // ============================================

  assessInjuryRisk(userId: string): InjuryRiskDto {
    // Simulated injury risk assessment
    const riskLevel = Math.random() > 0.7 ? 'medium' : 'low';

    const factors: string[] = [];
    const recommendations: string[] = [];

    if (riskLevel === 'medium') {
      factors.push('Increased match frequency in recent weeks');
      factors.push('Lower recovery time between matches');
      recommendations.push('Consider taking a rest day between matches');
      recommendations.push('Focus on warm-up and cool-down routines');
    }

    factors.push('Regular physical activity detected');
    recommendations.push('Maintain current hydration levels');
    recommendations.push('Continue with stretching exercises');

    return {
      userId,
      riskLevel: riskLevel as 'low' | 'medium' | 'high',
      factors,
      recommendations,
      lastAssessed: new Date(),
    };
  }

  // ============================================
  // Drill Recommendations
  // ============================================

  getRecommendedDrills(sportId: string, skillLevel?: string): DrillRecommendationDto[] {
    let drills = this.drillLibrary.filter(d => d.sportId === sportId);

    if (skillLevel) {
      drills = drills.filter(d => d.difficulty === skillLevel);
    }

    return drills;
  }

  getAllDrills(): DrillRecommendationDto[] {
    return this.drillLibrary;
  }

  // ============================================
  // Trend Data for Graphs
  // ============================================

  getTrendData(userId: string, sportId: string, days = 30): { date: string; score: number; result: string }[] {
    const key = `${userId}:${sportId}`;
    const data = this.performanceData.get(key);

    if (!data) {
      return [];
    }

    const cutoff = new Date(Date.now() - days * 86400000);
    return data.matches
      .filter(m => m.timestamp >= cutoff)
      .map(m => ({
        date: m.timestamp.toISOString().split('T')[0],
        score: m.score,
        result: m.result,
      }));
  }
}
