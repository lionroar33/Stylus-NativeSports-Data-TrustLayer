/**
 * Cricket Scoring Engine - Service
 * Phase 3: Complete cricket scoring logic with all rules
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  BallBowledEvent,
  MatchState,
  InningsState,
  MatchConfig,
  MatchStatus,
  InningsStatus,
  ExtraType,
  WicketType,
  MatchResult,
  BatsmanStats,
  BowlerStats,
  Partnership,
  FallOfWicket,
  TokenTier,
  TokenReward,
  CommentaryTrigger,
  CricketFormat,
} from '../interfaces/cricket.interface';
import {
  CreateBallEventDto,
  CreateMatchDto,
  TossResultDto,
  StartInningsDto,
  ChangeBowlerDto,
} from '../dto/ball-bowled.dto';

@Injectable()
export class CricketScoringService {
  private matches: Map<string, MatchState> = new Map();
  private undoStack: Map<string, BallBowledEvent[]> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // ============================================
  // Match Lifecycle
  // ============================================

  createMatch(dto: CreateMatchDto): MatchState {
    const matchId = uuidv4();
    const config = this.validateAndNormalizeConfig(dto.config);

    const match: MatchState = {
      matchId,
      config,
      status: MatchStatus.PENDING,
      teamA: {
        id: dto.teamA.id,
        name: dto.teamA.name,
        players: dto.teamA.players,
        battingOrder: dto.teamA.battingOrder,
      },
      teamB: {
        id: dto.teamB.id,
        name: dto.teamB.name,
        players: dto.teamB.players,
        battingOrder: dto.teamB.battingOrder,
      },
      currentInnings: 1,
      innings: [undefined, undefined],
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.matches.set(matchId, match);
    this.undoStack.set(matchId, []);

    this.eventEmitter.emit('match.created', { matchId, match });
    return match;
  }

  recordToss(dto: TossResultDto): MatchState {
    const match = this.getMatch(dto.matchId);

    if (match.status !== MatchStatus.PENDING) {
      throw new BadRequestException('Toss can only be recorded for pending matches');
    }

    match.tossWinner = dto.tossWinner;
    match.tossDecision = dto.decision;
    match.status = MatchStatus.TOSS;
    match.updatedAt = new Date();

    this.eventEmitter.emit('match.toss', { matchId: match.matchId, tossWinner: dto.tossWinner, decision: dto.decision });
    return match;
  }

  startInnings(dto: StartInningsDto): MatchState {
    const match = this.getMatch(dto.matchId);

    if (match.status !== MatchStatus.TOSS && match.status !== MatchStatus.INNINGS_BREAK) {
      throw new BadRequestException('Cannot start innings in current match state');
    }

    const inningsNumber = match.status === MatchStatus.TOSS ? 1 : 2;
    const battingTeamId = this.determineBattingTeam(match, inningsNumber);
    const bowlingTeamId = battingTeamId === match.teamA.id ? match.teamB.id : match.teamA.id;

    const innings: InningsState = {
      inningsNumber: inningsNumber as 1 | 2,
      battingTeamId,
      bowlingTeamId,
      status: InningsStatus.IN_PROGRESS,
      totalRuns: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0, total: 0 },
      runRate: 0,
      batsmanOnStrike: dto.openingBatsman1,
      batsmanNonStrike: dto.openingBatsman2,
      currentBowler: dto.openingBowler,
      batsmanStats: new Map(),
      bowlerStats: new Map(),
      partnerships: [],
      fallOfWickets: [],
      overHistory: [[]],
    };

    // Initialize batsman stats
    innings.batsmanStats.set(dto.openingBatsman1, this.createBatsmanStats(dto.openingBatsman1));
    innings.batsmanStats.set(dto.openingBatsman2, this.createBatsmanStats(dto.openingBatsman2));

    // Initialize bowler stats
    innings.bowlerStats.set(dto.openingBowler, this.createBowlerStats(dto.openingBowler));

    // Initialize partnership
    innings.partnerships.push({
      batsman1: dto.openingBatsman1,
      batsman2: dto.openingBatsman2,
      runs: 0,
      balls: 0,
      startScore: 0,
      isActive: true,
    });

    // Set target for 2nd innings
    if (inningsNumber === 2 && match.innings[0]) {
      innings.target = match.innings[0].totalRuns + 1;
      innings.requiredRuns = innings.target;
      innings.remainingBalls = match.config.oversPerInnings * 6;
    }

    match.innings[inningsNumber - 1] = innings;
    match.currentInnings = inningsNumber as 1 | 2;
    match.status = MatchStatus.ACTIVE;
    match.updatedAt = new Date();

    this.eventEmitter.emit('innings.started', { matchId: match.matchId, inningsNumber, battingTeamId });
    return match;
  }

  // ============================================
  // Ball Event Processing
  // ============================================

  processBall(dto: CreateBallEventDto): { match: MatchState; event: BallBowledEvent; rewards: TokenReward[] } {
    const match = this.getMatch(dto.matchId);
    const innings = this.getCurrentInnings(match);

    this.validateBallEvent(match, innings, dto);

    const event = this.createBallEvent(match, innings, dto);
    const previousState = this.captureState(innings);

    // Process the ball
    this.applyBallToInnings(innings, event, match.config);

    // Check for innings end
    if (this.isInningsComplete(innings, match.config)) {
      this.endInnings(match, innings);
    }

    // Store event
    match.events.push(event);
    this.undoStack.get(match.matchId)?.push(event);
    match.updatedAt = new Date();

    // Check for token rewards
    const rewards = this.checkTokenRewards(match, innings, event, previousState);

    // Emit events for real-time updates
    this.eventEmitter.emit('ball.bowled', { matchId: match.matchId, event, innings: this.serializeInnings(innings) });

    // Check commentary triggers
    this.checkCommentaryTriggers(match, innings, event, previousState);

    return { match, event, rewards };
  }

  private applyBallToInnings(innings: InningsState, event: BallBowledEvent, config: MatchConfig): void {
    const { payload, actors } = event;
    const isLegalDelivery = this.isLegalDelivery(payload.extras.type, config);

    // Update total runs
    let totalRuns = payload.runsScored;
    if (payload.extras.type !== ExtraType.NONE) {
      totalRuns += payload.extras.runs;
      this.updateExtras(innings, payload.extras);
    }
    innings.totalRuns += totalRuns;

    // Update batsman stats
    const batsmanStats = innings.batsmanStats.get(actors.batsmanOnStrike);
    if (batsmanStats) {
      // Runs scored by bat (not byes/leg-byes)
      if (payload.extras.type !== ExtraType.BYE && payload.extras.type !== ExtraType.LEG_BYE) {
        batsmanStats.runs += payload.runsScored;
      }
      if (isLegalDelivery || payload.extras.type === ExtraType.NO_BALL) {
        batsmanStats.ballsFaced++;
      }
      if (payload.isBoundary && !payload.isSix) batsmanStats.fours++;
      if (payload.isSix) batsmanStats.sixes++;
      batsmanStats.strikeRate = batsmanStats.ballsFaced > 0
        ? (batsmanStats.runs / batsmanStats.ballsFaced) * 100
        : 0;
    }

    // Update bowler stats
    const bowlerStats = innings.bowlerStats.get(actors.bowler);
    if (bowlerStats) {
      if (isLegalDelivery) {
        bowlerStats.balls++;
        if (bowlerStats.balls === 6) {
          bowlerStats.overs++;
          bowlerStats.balls = 0;
        }
      }

      // Runs conceded (not byes/leg-byes)
      if (payload.extras.type !== ExtraType.BYE && payload.extras.type !== ExtraType.LEG_BYE) {
        bowlerStats.runsConceded += payload.runsScored;
      }
      if (payload.extras.type === ExtraType.WIDE) {
        bowlerStats.runsConceded += payload.extras.runs;
        bowlerStats.wides++;
      }
      if (payload.extras.type === ExtraType.NO_BALL) {
        bowlerStats.runsConceded += payload.extras.runs;
        bowlerStats.noBalls++;
      }

      if (payload.isDotBall && isLegalDelivery) bowlerStats.dotBalls++;

      const totalOvers = bowlerStats.overs + bowlerStats.balls / 6;
      bowlerStats.economyRate = totalOvers > 0 ? bowlerStats.runsConceded / totalOvers : 0;
    }

    // Update overs
    if (isLegalDelivery) {
      innings.balls++;
      if (innings.balls === 6) {
        innings.overs++;
        innings.balls = 0;
        innings.overHistory.push([]);

        // Check for maiden
        if (bowlerStats) {
          const lastOver = innings.overHistory[innings.overHistory.length - 2];
          if (lastOver && this.isMaidenOver(lastOver)) {
            bowlerStats.maidens++;
            this.eventEmitter.emit('commentary.trigger', {
              trigger: CommentaryTrigger.MAIDEN_OVER,
              matchId: event.matchId,
              bowler: actors.bowler,
            });
          }
        }
      }
    }

    // Add to over history
    const currentOver = innings.overHistory[innings.overHistory.length - 1];
    currentOver.push(event);

    // Update partnership
    const activePartnership = innings.partnerships.find(p => p.isActive);
    if (activePartnership) {
      activePartnership.runs += totalRuns;
      if (isLegalDelivery) activePartnership.balls++;
    }

    // Handle wicket
    if (payload.wicket.isWicket) {
      this.handleWicket(innings, event);
    }

    // Strike rotation
    this.handleStrikeRotation(innings, event, config);

    // Update run rate
    const totalOvers = innings.overs + innings.balls / 6;
    innings.runRate = totalOvers > 0 ? innings.totalRuns / totalOvers : 0;

    // Update required run rate (2nd innings)
    if (innings.target) {
      innings.requiredRuns = innings.target - innings.totalRuns;
      innings.remainingBalls = (config.oversPerInnings * 6) - (innings.overs * 6 + innings.balls);
      if (innings.remainingBalls > 0) {
        innings.requiredRunRate = (innings.requiredRuns / innings.remainingBalls) * 6;
      }
    }

    // Check powerplay
    event.context.isPowerplay = this.isPowerplayOver(innings.overs, config);
  }

  private handleWicket(innings: InningsState, event: BallBowledEvent): void {
    const { payload, actors } = event;
    const dismissedPlayerId = payload.wicket.dismissedPlayer || actors.batsmanOnStrike;

    innings.wickets++;

    // Update batsman stats
    const batsmanStats = innings.batsmanStats.get(dismissedPlayerId);
    if (batsmanStats) {
      batsmanStats.isOut = true;
      batsmanStats.dismissalType = payload.wicket.type;
      batsmanStats.dismissedBy = actors.bowler;
      batsmanStats.fielder = payload.wicket.fielder;
    }

    // Update bowler stats (if applicable)
    if (this.isWicketCreditedToBowler(payload.wicket.type)) {
      const bowlerStats = innings.bowlerStats.get(actors.bowler);
      if (bowlerStats) {
        bowlerStats.wickets++;
      }
    }

    // Record fall of wicket
    innings.fallOfWickets.push({
      wicketNumber: innings.wickets,
      score: innings.totalRuns,
      overs: innings.overs,
      balls: innings.balls,
      dismissedPlayer: dismissedPlayerId,
      dismissalType: payload.wicket.type!,
    });

    // End current partnership
    const activePartnership = innings.partnerships.find(p => p.isActive);
    if (activePartnership) {
      activePartnership.isActive = false;
      activePartnership.endScore = innings.totalRuns;
    }

    this.eventEmitter.emit('commentary.trigger', {
      trigger: CommentaryTrigger.WICKET,
      matchId: event.matchId,
      dismissedPlayer: dismissedPlayerId,
      wicketType: payload.wicket.type,
      score: innings.totalRuns,
      wickets: innings.wickets,
    });
  }

  private handleStrikeRotation(innings: InningsState, event: BallBowledEvent, config: MatchConfig): void {
    const { payload } = event;
    const isLegalDelivery = this.isLegalDelivery(payload.extras.type, config);

    // Calculate total runs for strike rotation
    let totalRuns = payload.runsScored;
    if (payload.extras.type === ExtraType.BYE || payload.extras.type === ExtraType.LEG_BYE) {
      totalRuns += payload.extras.runs;
    }

    // Odd runs = swap strike
    const shouldSwap = totalRuns % 2 === 1;

    // End of over = swap strike (if not already swapped)
    const isEndOfOver = isLegalDelivery && innings.balls === 0 && innings.overs > 0;

    if (shouldSwap !== isEndOfOver) {
      // XOR logic: swap only if one condition is true
      if (shouldSwap || isEndOfOver) {
        const temp = innings.batsmanOnStrike;
        innings.batsmanOnStrike = innings.batsmanNonStrike;
        innings.batsmanNonStrike = temp;
      }
    }
  }

  // ============================================
  // Validation Methods
  // ============================================

  private validateBallEvent(match: MatchState, innings: InningsState, dto: CreateBallEventDto): void {
    if (match.status !== MatchStatus.ACTIVE) {
      throw new BadRequestException('Match is not active');
    }

    if (innings.status !== InningsStatus.IN_PROGRESS) {
      throw new BadRequestException('Innings is not in progress');
    }

    // Validate batsmen are at crease
    if (dto.batsmanOnStrike !== innings.batsmanOnStrike) {
      throw new BadRequestException('Invalid batsman on strike');
    }

    // Validate bowler
    if (dto.bowler !== innings.currentBowler) {
      throw new BadRequestException('Invalid bowler');
    }

    // Validate bowling restrictions
    const bowlerStats = innings.bowlerStats.get(dto.bowler);
    if (bowlerStats && bowlerStats.overs >= match.config.maxOversPerBowler) {
      throw new BadRequestException('Bowler has completed maximum overs');
    }

    // Validate runs
    if (dto.runsScored > 6 && !dto.extras.type) {
      throw new BadRequestException('Invalid runs scored');
    }
  }

  private validateAndNormalizeConfig(config: MatchConfigDto): MatchConfig {
    const maxOversPerBowler = config.maxOversPerBowler || Math.ceil(config.oversPerInnings / 5);

    return {
      ...config,
      maxOversPerBowler,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private createBallEvent(match: MatchState, innings: InningsState, dto: CreateBallEventDto): BallBowledEvent {
    const isDotBall = dto.runsScored === 0 &&
      dto.extras.type === ExtraType.NONE &&
      !dto.wicket.isWicket;

    // Determine if this is a free hit
    const lastEvent = match.events[match.events.length - 1];
    const isFreeHit = lastEvent?.payload.extras.type === ExtraType.NO_BALL && match.config.freeHitOnNoBall;

    return {
      id: uuidv4(),
      matchId: match.matchId,
      sport: 'cricket',
      type: 'BallBowled',
      timestamp: new Date(),
      period: {
        innings: innings.inningsNumber,
        over: innings.overs,
        ball: innings.balls + 1,
        legalBallsInOver: innings.balls,
      },
      actors: {
        batsmanOnStrike: dto.batsmanOnStrike,
        batsmanNonStrike: dto.batsmanNonStrike,
        bowler: dto.bowler,
        fielder: dto.wicket.fielder,
      },
      context: {
        totalScore: innings.totalRuns,
        wicketsFallen: innings.wickets,
        currentRunRate: innings.runRate,
        requiredRunRate: innings.requiredRunRate,
        target: innings.target,
        partnershipRuns: innings.partnerships.find(p => p.isActive)?.runs || 0,
        partnershipBalls: innings.partnerships.find(p => p.isActive)?.balls || 0,
        isPowerplay: this.isPowerplayOver(innings.overs, match.config),
        isFreeHit,
      },
      payload: {
        runsScored: dto.runsScored,
        isBoundary: dto.isBoundary,
        isSix: dto.isSix,
        isDotBall,
        extras: dto.extras,
        wicket: dto.wicket,
        shotType: dto.shotType,
        isFreeHit,
        commentaryTag: this.generateCommentaryTag(dto),
      },
      meta: {
        source: dto.source,
        offlineSeq: dto.offlineSeq,
        enteredBy: 'scorer', // Should come from auth context
      },
      isDeleted: false,
      createdAt: new Date(),
    };
  }

  private isLegalDelivery(extraType: ExtraType, config: MatchConfig): boolean {
    if (extraType === ExtraType.WIDE && config.wideRedelivery) return false;
    if (extraType === ExtraType.NO_BALL && config.noBallRedelivery) return false;
    return extraType !== ExtraType.WIDE && extraType !== ExtraType.NO_BALL;
  }

  private isWicketCreditedToBowler(wicketType?: WicketType): boolean {
    if (!wicketType) return false;
    return [
      WicketType.BOWLED,
      WicketType.CAUGHT,
      WicketType.LBW,
      WicketType.STUMPED,
      WicketType.HIT_WICKET,
    ].includes(wicketType);
  }

  private isMaidenOver(overEvents: BallBowledEvent[]): boolean {
    return overEvents.every(e =>
      e.payload.runsScored === 0 &&
      e.payload.extras.type !== ExtraType.WIDE &&
      e.payload.extras.type !== ExtraType.NO_BALL
    );
  }

  private isPowerplayOver(over: number, config: MatchConfig): boolean {
    return config.powerplayOvers.includes(over + 1);
  }

  private updateExtras(innings: InningsState, extras: { type: ExtraType; runs: number }): void {
    innings.extras.total += extras.runs;
    switch (extras.type) {
      case ExtraType.WIDE:
        innings.extras.wides += extras.runs;
        break;
      case ExtraType.NO_BALL:
        innings.extras.noBalls += extras.runs;
        break;
      case ExtraType.BYE:
        innings.extras.byes += extras.runs;
        break;
      case ExtraType.LEG_BYE:
        innings.extras.legByes += extras.runs;
        break;
      case ExtraType.PENALTY:
        innings.extras.penalties += extras.runs;
        break;
    }
  }

  private createBatsmanStats(playerId: string): BatsmanStats {
    return {
      playerId,
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
    };
  }

  private createBowlerStats(playerId: string): BowlerStats {
    return {
      playerId,
      overs: 0,
      balls: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      economyRate: 0,
      wides: 0,
      noBalls: 0,
      dotBalls: 0,
    };
  }

  private determineBattingTeam(match: MatchState, inningsNumber: number): string {
    if (inningsNumber === 1) {
      if (match.tossWinner === match.teamA.id) {
        return match.tossDecision === 'bat' ? match.teamA.id : match.teamB.id;
      } else {
        return match.tossDecision === 'bat' ? match.teamB.id : match.teamA.id;
      }
    } else {
      // 2nd innings - other team bats
      return match.innings[0]?.battingTeamId === match.teamA.id ? match.teamB.id : match.teamA.id;
    }
  }

  private generateCommentaryTag(dto: CreateBallEventDto): string {
    if (dto.wicket.isWicket) return 'wicket';
    if (dto.isSix) return 'six';
    if (dto.isBoundary) return 'boundary';
    if (dto.runsScored === 0 && dto.extras.type === ExtraType.NONE) return 'dot';
    return 'runs';
  }

  // ============================================
  // Innings & Match Completion
  // ============================================

  private isInningsComplete(innings: InningsState, config: MatchConfig): boolean {
    // All out
    if (innings.wickets >= config.playersPerSide - 1) return true;

    // Overs completed
    if (innings.overs >= config.oversPerInnings) return true;

    // Target chased (2nd innings)
    if (innings.target && innings.totalRuns >= innings.target) return true;

    return false;
  }

  private endInnings(match: MatchState, innings: InningsState): void {
    innings.status = InningsStatus.COMPLETED;

    if (innings.inningsNumber === 1) {
      match.status = MatchStatus.INNINGS_BREAK;
      this.eventEmitter.emit('innings.ended', { matchId: match.matchId, inningsNumber: 1 });
      this.eventEmitter.emit('commentary.trigger', {
        trigger: CommentaryTrigger.INNINGS_END,
        matchId: match.matchId,
        score: innings.totalRuns,
        wickets: innings.wickets,
        overs: `${innings.overs}.${innings.balls}`,
      });
    } else {
      this.endMatch(match);
    }
  }

  private endMatch(match: MatchState): void {
    match.status = MatchStatus.COMPLETED;

    const innings1 = match.innings[0]!;
    const innings2 = match.innings[1]!;

    if (innings2.totalRuns > innings1.totalRuns) {
      // Batting second won
      match.result = innings2.battingTeamId === match.teamA.id ? MatchResult.TEAM_A_WON : MatchResult.TEAM_B_WON;
      match.winningTeam = innings2.battingTeamId;
      match.winMargin = `${match.config.playersPerSide - 1 - innings2.wickets} wickets`;
    } else if (innings1.totalRuns > innings2.totalRuns) {
      // Batting first won
      match.result = innings1.battingTeamId === match.teamA.id ? MatchResult.TEAM_A_WON : MatchResult.TEAM_B_WON;
      match.winningTeam = innings1.battingTeamId;
      match.winMargin = `${innings1.totalRuns - innings2.totalRuns} runs`;
    } else {
      // Tie
      match.result = MatchResult.TIE;
    }

    this.eventEmitter.emit('match.ended', { matchId: match.matchId, result: match.result });
    this.eventEmitter.emit('commentary.trigger', {
      trigger: CommentaryTrigger.MATCH_WON,
      matchId: match.matchId,
      winner: match.winningTeam,
      margin: match.winMargin,
    });
  }

  // ============================================
  // Token Rewards
  // ============================================

  private checkTokenRewards(
    match: MatchState,
    innings: InningsState,
    event: BallBowledEvent,
    previousState: any
  ): TokenReward[] {
    const rewards: TokenReward[] = [];

    // Check batsman milestones
    const batsmanStats = innings.batsmanStats.get(event.actors.batsmanOnStrike);
    if (batsmanStats) {
      // Nifty Fifty
      if (previousState.batsmanRuns < 50 && batsmanStats.runs >= 50) {
        rewards.push({
          tier: TokenTier.NIFTY_FIFTY,
          playerId: event.actors.batsmanOnStrike,
          matchId: match.matchId,
          burnMultiplier: 1.5,
          triggeredAt: new Date(),
          description: 'Scored 50 runs',
        });
        this.eventEmitter.emit('commentary.trigger', {
          trigger: CommentaryTrigger.FIFTY,
          matchId: match.matchId,
          playerId: event.actors.batsmanOnStrike,
          runs: batsmanStats.runs,
        });
      }

      // Gayle Storm (100+ with SR > 150)
      if (previousState.batsmanRuns < 100 && batsmanStats.runs >= 100 && batsmanStats.strikeRate > 150) {
        rewards.push({
          tier: TokenTier.GAYLE_STORM,
          playerId: event.actors.batsmanOnStrike,
          matchId: match.matchId,
          burnMultiplier: 3.0,
          triggeredAt: new Date(),
          description: 'Century with strike rate > 150',
        });
        this.eventEmitter.emit('commentary.trigger', {
          trigger: CommentaryTrigger.HUNDRED,
          matchId: match.matchId,
          playerId: event.actors.batsmanOnStrike,
          runs: batsmanStats.runs,
          strikeRate: batsmanStats.strikeRate,
        });
      }
    }

    // Check bowler milestones
    const bowlerStats = innings.bowlerStats.get(event.actors.bowler);
    if (bowlerStats && event.payload.wicket.isWicket) {
      // 5-wicket haul
      if (previousState.bowlerWickets === 4 && bowlerStats.wickets >= 5) {
        rewards.push({
          tier: TokenTier.FIVE_WICKET_HAUL,
          playerId: event.actors.bowler,
          matchId: match.matchId,
          burnMultiplier: 2.5,
          triggeredAt: new Date(),
          description: '5 wicket haul',
        });
        this.eventEmitter.emit('commentary.trigger', {
          trigger: CommentaryTrigger.FIVE_WICKET_HAUL,
          matchId: match.matchId,
          playerId: event.actors.bowler,
          wickets: bowlerStats.wickets,
        });
      }

      // Hat-trick
      if (this.isHatTrick(match, event)) {
        rewards.push({
          tier: TokenTier.HAT_TRICK,
          playerId: event.actors.bowler,
          matchId: match.matchId,
          burnMultiplier: 3.0,
          triggeredAt: new Date(),
          description: 'Hat-trick',
        });
        this.eventEmitter.emit('commentary.trigger', {
          trigger: CommentaryTrigger.HAT_TRICK,
          matchId: match.matchId,
          playerId: event.actors.bowler,
        });
      }
    }

    if (rewards.length > 0) {
      this.eventEmitter.emit('token.rewards', { matchId: match.matchId, rewards });
    }

    return rewards;
  }

  private isHatTrick(match: MatchState, currentEvent: BallBowledEvent): boolean {
    const events = match.events;
    if (events.length < 2) return false;

    const lastThreeWickets = events
      .filter(e => e.payload.wicket.isWicket && e.actors.bowler === currentEvent.actors.bowler)
      .slice(-3);

    if (lastThreeWickets.length < 3) return false;

    // Check if consecutive deliveries
    for (let i = 1; i < lastThreeWickets.length; i++) {
      const prev = lastThreeWickets[i - 1];
      const curr = lastThreeWickets[i];

      // Find events between these wickets
      const prevIndex = events.indexOf(prev);
      const currIndex = events.indexOf(curr);

      // Check no legal deliveries between them (for the same bowler)
      const eventsBetween = events.slice(prevIndex + 1, currIndex);
      const legalBallsBetween = eventsBetween.filter(
        e => e.actors.bowler === currentEvent.actors.bowler &&
        e.payload.extras.type !== ExtraType.WIDE &&
        e.payload.extras.type !== ExtraType.NO_BALL
      );

      if (legalBallsBetween.length > 0) return false;
    }

    return true;
  }

  private captureState(innings: InningsState): any {
    const batsmanOnStrike = innings.batsmanOnStrike;
    const bowler = innings.currentBowler;

    return {
      batsmanRuns: batsmanOnStrike ? innings.batsmanStats.get(batsmanOnStrike)?.runs || 0 : 0,
      bowlerWickets: bowler ? innings.bowlerStats.get(bowler)?.wickets || 0 : 0,
      totalScore: innings.totalRuns,
      wickets: innings.wickets,
    };
  }

  // ============================================
  // Commentary Triggers
  // ============================================

  private checkCommentaryTriggers(
    match: MatchState,
    innings: InningsState,
    event: BallBowledEvent,
    previousState: any
  ): void {
    if (event.payload.isSix) {
      this.eventEmitter.emit('commentary.trigger', {
        trigger: CommentaryTrigger.SIX,
        matchId: match.matchId,
        batsman: event.actors.batsmanOnStrike,
      });
    } else if (event.payload.isBoundary) {
      this.eventEmitter.emit('commentary.trigger', {
        trigger: CommentaryTrigger.BOUNDARY,
        matchId: match.matchId,
        batsman: event.actors.batsmanOnStrike,
      });
    }

    // Powerplay end
    if (this.isPowerplayOver(innings.overs - 1, match.config) && !this.isPowerplayOver(innings.overs, match.config)) {
      this.eventEmitter.emit('commentary.trigger', {
        trigger: CommentaryTrigger.POWERPLAY_END,
        matchId: match.matchId,
        score: innings.totalRuns,
        wickets: innings.wickets,
      });
    }

    // Dot ball pressure (3+ consecutive dots)
    const currentOver = innings.overHistory[innings.overHistory.length - 1];
    const consecutiveDots = this.countConsecutiveDots(currentOver);
    if (consecutiveDots >= 3) {
      this.eventEmitter.emit('commentary.trigger', {
        trigger: CommentaryTrigger.DOT_BALL_PRESSURE,
        matchId: match.matchId,
        consecutiveDots,
      });
    }
  }

  private countConsecutiveDots(overEvents: BallBowledEvent[]): number {
    let count = 0;
    for (let i = overEvents.length - 1; i >= 0; i--) {
      if (overEvents[i].payload.isDotBall) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  // ============================================
  // Bowler Change
  // ============================================

  changeBowler(dto: ChangeBowlerDto): MatchState {
    const match = this.getMatch(dto.matchId);
    const innings = this.getCurrentInnings(match);

    // Validate it's end of over
    if (innings.balls !== 0) {
      throw new BadRequestException('Bowler can only be changed at end of over');
    }

    // Validate same bowler not bowling consecutive overs
    if (innings.currentBowler === dto.newBowler) {
      throw new BadRequestException('Same bowler cannot bowl consecutive overs');
    }

    // Validate bowler hasn't exceeded max overs
    let bowlerStats = innings.bowlerStats.get(dto.newBowler);
    if (bowlerStats && bowlerStats.overs >= match.config.maxOversPerBowler) {
      throw new BadRequestException('Bowler has completed maximum overs');
    }

    // Initialize bowler stats if new
    if (!bowlerStats) {
      bowlerStats = this.createBowlerStats(dto.newBowler);
      innings.bowlerStats.set(dto.newBowler, bowlerStats);
    }

    innings.currentBowler = dto.newBowler;
    match.updatedAt = new Date();

    return match;
  }

  // ============================================
  // Bring New Batsman
  // ============================================

  bringNewBatsman(matchId: string, newBatsmanId: string, isOnStrike: boolean): MatchState {
    const match = this.getMatch(matchId);
    const innings = this.getCurrentInnings(match);

    // Initialize batsman stats
    if (!innings.batsmanStats.has(newBatsmanId)) {
      innings.batsmanStats.set(newBatsmanId, this.createBatsmanStats(newBatsmanId));
    }

    // Set position
    if (isOnStrike) {
      innings.batsmanOnStrike = newBatsmanId;
    } else {
      innings.batsmanNonStrike = newBatsmanId;
    }

    // Start new partnership
    const otherBatsman = isOnStrike ? innings.batsmanNonStrike : innings.batsmanOnStrike;
    innings.partnerships.push({
      batsman1: newBatsmanId,
      batsman2: otherBatsman!,
      runs: 0,
      balls: 0,
      startScore: innings.totalRuns,
      isActive: true,
    });

    match.updatedAt = new Date();
    return match;
  }

  // ============================================
  // Undo Last Ball
  // ============================================

  undoLastBall(matchId: string): MatchState {
    const match = this.getMatch(matchId);
    const undoStack = this.undoStack.get(matchId);

    if (!undoStack || undoStack.length === 0) {
      throw new BadRequestException('No balls to undo');
    }

    const lastEvent = undoStack.pop()!;
    lastEvent.isDeleted = true;

    // Remove from match events
    const eventIndex = match.events.findIndex(e => e.id === lastEvent.id);
    if (eventIndex !== -1) {
      match.events.splice(eventIndex, 1);
    }

    // Recalculate innings state from events
    // This is a simplified approach - in production, you'd replay all events
    const innings = this.getCurrentInnings(match);

    // Note: Full implementation would replay all events to recalculate state
    // For now, we just mark the event as deleted

    match.updatedAt = new Date();
    return match;
  }

  // ============================================
  // Getters
  // ============================================

  getMatch(matchId: string): MatchState {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }
    return match;
  }

  getCurrentInnings(match: MatchState): InningsState {
    const innings = match.innings[match.currentInnings - 1];
    if (!innings) {
      throw new BadRequestException('No active innings');
    }
    return innings;
  }

  getAllMatches(): MatchState[] {
    return Array.from(this.matches.values());
  }

  getMatchEvents(matchId: string): BallBowledEvent[] {
    const match = this.getMatch(matchId);
    return match.events.filter(e => !e.isDeleted);
  }

  private serializeInnings(innings: InningsState): any {
    return {
      ...innings,
      batsmanStats: Object.fromEntries(innings.batsmanStats),
      bowlerStats: Object.fromEntries(innings.bowlerStats),
    };
  }
}

// Type for config DTO
interface MatchConfigDto {
  format: CricketFormat;
  oversPerInnings: number;
  playersPerSide: number;
  powerplayOvers: number[];
  maxOversPerBowler?: number;
  wideRedelivery: boolean;
  noBallRedelivery: boolean;
  freeHitOnNoBall: boolean;
  superOverOnTie: boolean;
}
