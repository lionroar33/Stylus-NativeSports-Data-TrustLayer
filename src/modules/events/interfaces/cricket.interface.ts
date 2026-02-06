/**
 * Cricket Scoring Engine - Interfaces
 * Phase 3: Complete type definitions for cricket scoring
 */

// ============================================
// Enums
// ============================================

export enum CricketFormat {
  BOX_CRICKET = 'box_cricket',
  T10 = 't10',
  T20 = 't20',
  ODI = 'odi',
  TEST = 'test',
  CUSTOM = 'custom',
}

export enum WicketType {
  BOWLED = 'bowled',
  CAUGHT = 'caught',
  LBW = 'lbw',
  RUN_OUT = 'run_out',
  STUMPED = 'stumped',
  HIT_WICKET = 'hit_wicket',
  RETIRED_HURT = 'retired_hurt',
  RETIRED_OUT = 'retired_out',
  TIMED_OUT = 'timed_out',
  OBSTRUCTING = 'obstructing_the_field',
}

export enum ExtraType {
  NONE = 'none',
  WIDE = 'wide',
  NO_BALL = 'no_ball',
  BYE = 'bye',
  LEG_BYE = 'leg_bye',
  PENALTY = 'penalty',
}

export enum MatchStatus {
  PENDING = 'pending',
  TOSS = 'toss',
  ACTIVE = 'active',
  INNINGS_BREAK = 'innings_break',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum InningsStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DECLARED = 'declared',
}

export enum MatchResult {
  TEAM_A_WON = 'team_a_won',
  TEAM_B_WON = 'team_b_won',
  TIE = 'tie',
  DRAW = 'draw',
  NO_RESULT = 'no_result',
}

// ============================================
// Core Interfaces
// ============================================

export interface Player {
  id: string;
  name: string;
  jerseyNumber?: number;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  battingOrder: string[]; // Player IDs in batting order
}

export interface MatchConfig {
  format: CricketFormat;
  oversPerInnings: number;
  playersPerSide: number;
  powerplayOvers: number[];
  maxOversPerBowler: number;
  wideRedelivery: boolean;
  noBallRedelivery: boolean;
  freeHitOnNoBall: boolean;
  superOverOnTie: boolean;
}

// ============================================
// Ball Event Interfaces
// ============================================

export interface BallPeriod {
  innings: 1 | 2;
  over: number; // 0-indexed
  ball: number; // 1-6 for legal deliveries
  legalBallsInOver: number;
}

export interface BallActors {
  batsmanOnStrike: string; // Player ID
  batsmanNonStrike: string; // Player ID
  bowler: string; // Player ID
  fielder?: string; // Player ID (for catches/runouts)
}

export interface BallContext {
  totalScore: number;
  wicketsFallen: number;
  currentRunRate: number;
  requiredRunRate?: number; // 2nd innings only
  target?: number; // 2nd innings only
  partnershipRuns: number;
  partnershipBalls: number;
  isPowerplay: boolean;
  isFreeHit: boolean;
}

export interface BallExtras {
  type: ExtraType;
  runs: number;
}

export interface BallWicket {
  isWicket: boolean;
  type?: WicketType;
  dismissedPlayer?: string; // Player ID
  fielder?: string; // Player ID
}

export interface BallPayload {
  runsScored: number;
  isBoundary: boolean;
  isSix: boolean;
  isDotBall: boolean;
  extras: BallExtras;
  wicket: BallWicket;
  shotType?: string;
  isFreeHit: boolean;
  commentaryTag?: string;
}

export interface BallMeta {
  source: 'mobile' | 'web' | 'api';
  offlineSeq?: number;
  latencyMs?: number;
  enteredBy: string; // User ID
}

export interface BallBowledEvent {
  id: string;
  matchId: string;
  sport: 'cricket';
  type: 'BallBowled';
  timestamp: Date;
  period: BallPeriod;
  actors: BallActors;
  context: BallContext;
  payload: BallPayload;
  meta: BallMeta;
  isDeleted: boolean;
  createdAt: Date;
}

// ============================================
// Match State Interfaces
// ============================================

export interface BatsmanStats {
  playerId: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalType?: WicketType;
  dismissedBy?: string;
  fielder?: string;
}

export interface BowlerStats {
  playerId: string;
  overs: number;
  balls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economyRate: number;
  wides: number;
  noBalls: number;
  dotBalls: number;
}

export interface Partnership {
  batsman1: string;
  batsman2: string;
  runs: number;
  balls: number;
  startScore: number;
  endScore?: number;
  isActive: boolean;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: number;
  balls: number;
  dismissedPlayer: string;
  dismissalType: WicketType;
}

export interface InningsState {
  inningsNumber: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  status: InningsStatus;
  totalRuns: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalties: number;
    total: number;
  };
  runRate: number;
  batsmanOnStrike?: string;
  batsmanNonStrike?: string;
  currentBowler?: string;
  batsmanStats: Map<string, BatsmanStats>;
  bowlerStats: Map<string, BowlerStats>;
  partnerships: Partnership[];
  fallOfWickets: FallOfWicket[];
  overHistory: BallBowledEvent[][];
  target?: number;
  requiredRunRate?: number;
  requiredRuns?: number;
  remainingBalls?: number;
}

export interface MatchState {
  matchId: string;
  config: MatchConfig;
  status: MatchStatus;
  teamA: Team;
  teamB: Team;
  tossWinner?: string;
  tossDecision?: 'bat' | 'bowl';
  currentInnings: 1 | 2;
  innings: [InningsState?, InningsState?];
  result?: MatchResult;
  winningTeam?: string;
  winMargin?: string;
  manOfTheMatch?: string;
  events: BallBowledEvent[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Token Reward Tiers
// ============================================

export enum TokenTier {
  NIFTY_FIFTY = 'nifty_fifty',
  GAYLE_STORM = 'gayle_storm',
  FIVE_WICKET_HAUL = 'five_wicket_haul',
  HAT_TRICK = 'hat_trick',
  MAIDEN_MASTER = 'maiden_master',
  RUN_MACHINE = 'run_machine',
  GOLDEN_ARM = 'golden_arm',
  ALL_ROUNDER = 'all_rounder',
}

export interface TokenReward {
  tier: TokenTier;
  playerId: string;
  matchId: string;
  burnMultiplier: number;
  triggeredAt: Date;
  description: string;
}

// ============================================
// Commentary Triggers
// ============================================

export enum CommentaryTrigger {
  BOUNDARY = 'boundary',
  SIX = 'six',
  WICKET = 'wicket',
  MAIDEN_OVER = 'maiden_over',
  FIFTY = 'fifty',
  HUNDRED = 'hundred',
  FIVE_WICKET_HAUL = 'five_wicket_haul',
  HAT_TRICK = 'hat_trick',
  POWERPLAY_END = 'powerplay_end',
  INNINGS_END = 'innings_end',
  MATCH_WON = 'match_won',
  DOT_BALL_PRESSURE = 'dot_ball_pressure',
}

export interface CommentaryEvent {
  trigger: CommentaryTrigger;
  matchId: string;
  timestamp: Date;
  message: string;
  persona: 'play_by_play' | 'energetic' | 'coaching';
  priority: 'low' | 'medium' | 'high' | 'critical';
}
