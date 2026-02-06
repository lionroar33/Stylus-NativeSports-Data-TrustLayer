import { Controller, Get, Post, Body, Param, Render, Delete } from '@nestjs/common';
import { CricketScoringService } from './cricket/cricket-scoring.service';
import {
  CreateMatchDto,
  CreateBallEventDto,
  TossResultDto,
  StartInningsDto,
  ChangeBowlerDto,
} from './dto/ball-bowled.dto';

/**
 * Events Controller - Cricket Scoring API
 * Phase 3: Event Ingestion & Scoring Engine
 */
@Controller()
export class EventsController {
  constructor(private readonly cricketService: CricketScoringService) {}

  // ============================================
  // UI Routes
  // ============================================

  @Get('scoring')
  @Render('scoring/index')
  scoringDashboard() {
    return {
      title: 'Live Scoring',
      layout: 'layouts/main',
      isScoring: true,
      pageTitle: 'Live Scoring',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }

  @Get('scoring/cricket')
  @Render('scoring/cricket')
  cricketScorer() {
    return {
      title: 'Cricket Scorer',
      layout: 'layouts/main',
      isScoring: true,
      pageTitle: 'Cricket Scorer',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }

  // ============================================
  // Cricket API Routes
  // ============================================

  /**
   * Create a new cricket match
   * POST /api/v1/cricket/matches
   */
  @Post('api/v1/cricket/matches')
  createMatch(@Body() dto: CreateMatchDto) {
    const match = this.cricketService.createMatch(dto);
    return {
      success: true,
      data: {
        matchId: match.matchId,
        status: match.status,
        teamA: match.teamA.name,
        teamB: match.teamB.name,
        config: match.config,
      },
    };
  }

  /**
   * Get match state
   * GET /api/v1/cricket/matches/:id
   */
  @Get('api/v1/cricket/matches/:id')
  getMatch(@Param('id') matchId: string) {
    const match = this.cricketService.getMatch(matchId);
    return {
      success: true,
      data: this.formatMatchState(match),
    };
  }

  /**
   * Record toss result
   * POST /api/v1/cricket/matches/:id/toss
   */
  @Post('api/v1/cricket/matches/:id/toss')
  recordToss(@Param('id') matchId: string, @Body() dto: Omit<TossResultDto, 'matchId'>) {
    const match = this.cricketService.recordToss({ ...dto, matchId });
    return {
      success: true,
      data: {
        matchId: match.matchId,
        tossWinner: match.tossWinner,
        tossDecision: match.tossDecision,
        status: match.status,
      },
    };
  }

  /**
   * Start innings
   * POST /api/v1/cricket/matches/:id/innings/start
   */
  @Post('api/v1/cricket/matches/:id/innings/start')
  startInnings(@Param('id') matchId: string, @Body() dto: Omit<StartInningsDto, 'matchId'>) {
    const match = this.cricketService.startInnings({ ...dto, matchId });
    const innings = match.innings[match.currentInnings - 1];
    return {
      success: true,
      data: {
        matchId: match.matchId,
        inningsNumber: match.currentInnings,
        battingTeam: innings?.battingTeamId,
        bowlingTeam: innings?.bowlingTeamId,
        status: match.status,
      },
    };
  }

  /**
   * Record a ball event
   * POST /api/v1/cricket/matches/:id/events
   */
  @Post('api/v1/cricket/matches/:id/events')
  recordBall(@Param('id') matchId: string, @Body() dto: Omit<CreateBallEventDto, 'matchId'>) {
    const { match, event, rewards } = this.cricketService.processBall({ ...dto, matchId });
    const innings = match.innings[match.currentInnings - 1];

    return {
      success: true,
      data: {
        eventId: event.id,
        over: `${innings?.overs}.${innings?.balls}`,
        score: `${innings?.totalRuns}/${innings?.wickets}`,
        runRate: innings?.runRate?.toFixed(2),
        requiredRunRate: innings?.requiredRunRate?.toFixed(2),
        commentary: event.payload.commentaryTag,
        rewards: rewards.map(r => ({
          tier: r.tier,
          player: r.playerId,
          multiplier: r.burnMultiplier,
        })),
      },
    };
  }

  /**
   * Get match events
   * GET /api/v1/cricket/matches/:id/events
   */
  @Get('api/v1/cricket/matches/:id/events')
  getMatchEvents(@Param('id') matchId: string) {
    const events = this.cricketService.getMatchEvents(matchId);
    return {
      success: true,
      data: events.map(e => ({
        id: e.id,
        over: `${e.period.over}.${e.period.ball}`,
        batsman: e.actors.batsmanOnStrike,
        bowler: e.actors.bowler,
        runs: e.payload.runsScored,
        extras: e.payload.extras,
        wicket: e.payload.wicket,
        timestamp: e.timestamp,
      })),
    };
  }

  /**
   * Change bowler
   * POST /api/v1/cricket/matches/:id/bowler
   */
  @Post('api/v1/cricket/matches/:id/bowler')
  changeBowler(@Param('id') matchId: string, @Body() dto: Omit<ChangeBowlerDto, 'matchId'>) {
    const match = this.cricketService.changeBowler({ ...dto, matchId });
    const innings = match.innings[match.currentInnings - 1];
    return {
      success: true,
      data: {
        currentBowler: innings?.currentBowler,
      },
    };
  }

  /**
   * Bring new batsman
   * POST /api/v1/cricket/matches/:id/batsman
   */
  @Post('api/v1/cricket/matches/:id/batsman')
  bringNewBatsman(
    @Param('id') matchId: string,
    @Body() dto: { newBatsmanId: string; isOnStrike: boolean }
  ) {
    const match = this.cricketService.bringNewBatsman(matchId, dto.newBatsmanId, dto.isOnStrike);
    const innings = match.innings[match.currentInnings - 1];
    return {
      success: true,
      data: {
        batsmanOnStrike: innings?.batsmanOnStrike,
        batsmanNonStrike: innings?.batsmanNonStrike,
      },
    };
  }

  /**
   * Undo last ball
   * DELETE /api/v1/cricket/matches/:id/events/last
   */
  @Delete('api/v1/cricket/matches/:id/events/last')
  undoLastBall(@Param('id') matchId: string) {
    const match = this.cricketService.undoLastBall(matchId);
    return {
      success: true,
      message: 'Last ball undone',
    };
  }

  /**
   * Get all matches
   * GET /api/v1/cricket/matches
   */
  @Get('api/v1/cricket/matches')
  getAllMatches() {
    const matches = this.cricketService.getAllMatches();
    return {
      success: true,
      data: matches.map(m => ({
        matchId: m.matchId,
        teamA: m.teamA.name,
        teamB: m.teamB.name,
        status: m.status,
        format: m.config.format,
        createdAt: m.createdAt,
      })),
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private formatMatchState(match: any) {
    const innings = match.innings[match.currentInnings - 1];

    if (!innings) {
      return {
        matchId: match.matchId,
        status: match.status,
        teamA: match.teamA.name,
        teamB: match.teamB.name,
        tossWinner: match.tossWinner,
        tossDecision: match.tossDecision,
      };
    }

    const batsmanOnStrike = innings.batsmanStats.get(innings.batsmanOnStrike);
    const batsmanNonStrike = innings.batsmanStats.get(innings.batsmanNonStrike);
    const currentBowler = innings.bowlerStats.get(innings.currentBowler);

    return {
      matchId: match.matchId,
      status: match.status,
      currentInnings: match.currentInnings,
      battingTeam: innings.battingTeamId,
      bowlingTeam: innings.bowlingTeamId,
      score: {
        runs: innings.totalRuns,
        wickets: innings.wickets,
        overs: `${innings.overs}.${innings.balls}`,
        runRate: innings.runRate?.toFixed(2),
        target: innings.target,
        requiredRunRate: innings.requiredRunRate?.toFixed(2),
        requiredRuns: innings.requiredRuns,
        remainingBalls: innings.remainingBalls,
      },
      batting: {
        onStrike: batsmanOnStrike ? {
          id: batsmanOnStrike.playerId,
          runs: batsmanOnStrike.runs,
          balls: batsmanOnStrike.ballsFaced,
          fours: batsmanOnStrike.fours,
          sixes: batsmanOnStrike.sixes,
          strikeRate: batsmanOnStrike.strikeRate?.toFixed(2),
        } : null,
        nonStrike: batsmanNonStrike ? {
          id: batsmanNonStrike.playerId,
          runs: batsmanNonStrike.runs,
          balls: batsmanNonStrike.ballsFaced,
          fours: batsmanNonStrike.fours,
          sixes: batsmanNonStrike.sixes,
          strikeRate: batsmanNonStrike.strikeRate?.toFixed(2),
        } : null,
      },
      bowling: currentBowler ? {
        id: currentBowler.playerId,
        overs: `${currentBowler.overs}.${currentBowler.balls}`,
        maidens: currentBowler.maidens,
        runs: currentBowler.runsConceded,
        wickets: currentBowler.wickets,
        economy: currentBowler.economyRate?.toFixed(2),
      } : null,
      partnership: {
        runs: innings.partnerships.find((p: any) => p.isActive)?.runs || 0,
        balls: innings.partnerships.find((p: any) => p.isActive)?.balls || 0,
      },
      extras: innings.extras,
      fallOfWickets: innings.fallOfWickets,
    };
  }
}
