/**
 * Cricket Scoring Engine - DTOs
 * Phase 3: Data Transfer Objects for ball events
 */

import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExtraType, WicketType, CricketFormat } from '../interfaces/cricket.interface';

// ============================================
// Ball Bowled Event DTOs
// ============================================

export class BallExtrasDto {
  @IsEnum(ExtraType)
  type: ExtraType;

  @IsNumber()
  @Min(0)
  @Max(7)
  runs: number;
}

export class BallWicketDto {
  @IsBoolean()
  isWicket: boolean;

  @IsOptional()
  @IsEnum(WicketType)
  type?: WicketType;

  @IsOptional()
  @IsUUID()
  dismissedPlayer?: string;

  @IsOptional()
  @IsUUID()
  fielder?: string;
}

export class CreateBallEventDto {
  @IsUUID()
  matchId: string;

  @IsNumber()
  @Min(1)
  @Max(2)
  innings: 1 | 2;

  @IsUUID()
  batsmanOnStrike: string;

  @IsUUID()
  batsmanNonStrike: string;

  @IsUUID()
  bowler: string;

  @IsNumber()
  @Min(0)
  @Max(6)
  runsScored: number;

  @IsBoolean()
  isBoundary: boolean;

  @IsBoolean()
  isSix: boolean;

  @ValidateNested()
  @Type(() => BallExtrasDto)
  extras: BallExtrasDto;

  @ValidateNested()
  @Type(() => BallWicketDto)
  wicket: BallWicketDto;

  @IsOptional()
  @IsString()
  shotType?: string;

  @IsOptional()
  @IsUUID()
  newBatsman?: string; // When wicket falls

  @IsString()
  source: 'mobile' | 'web' | 'api';

  @IsOptional()
  @IsNumber()
  offlineSeq?: number;
}

// ============================================
// Match Configuration DTOs
// ============================================

export class PlayerDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  jerseyNumber?: number;
}

export class TeamDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlayerDto)
  players: PlayerDto[];

  @IsArray()
  @IsUUID('4', { each: true })
  battingOrder: string[];
}

export class MatchConfigDto {
  @IsEnum(CricketFormat)
  format: CricketFormat;

  @IsNumber()
  @Min(1)
  @Max(90)
  oversPerInnings: number;

  @IsNumber()
  @Min(2)
  @Max(11)
  playersPerSide: number;

  @IsArray()
  @IsNumber({}, { each: true })
  powerplayOvers: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxOversPerBowler?: number;

  @IsBoolean()
  wideRedelivery: boolean;

  @IsBoolean()
  noBallRedelivery: boolean;

  @IsBoolean()
  freeHitOnNoBall: boolean;

  @IsBoolean()
  superOverOnTie: boolean;
}

export class CreateMatchDto {
  @ValidateNested()
  @Type(() => MatchConfigDto)
  config: MatchConfigDto;

  @ValidateNested()
  @Type(() => TeamDto)
  teamA: TeamDto;

  @ValidateNested()
  @Type(() => TeamDto)
  teamB: TeamDto;
}

export class TossResultDto {
  @IsUUID()
  matchId: string;

  @IsUUID()
  tossWinner: string; // Team ID

  @IsString()
  decision: 'bat' | 'bowl';
}

export class StartInningsDto {
  @IsUUID()
  matchId: string;

  @IsUUID()
  openingBatsman1: string;

  @IsUUID()
  openingBatsman2: string;

  @IsUUID()
  openingBowler: string;
}

export class ChangeBowlerDto {
  @IsUUID()
  matchId: string;

  @IsUUID()
  newBowler: string;
}

export class UndoBallDto {
  @IsUUID()
  matchId: string;

  @IsUUID()
  eventId: string;
}

// ============================================
// Response DTOs
// ============================================

export class BallEventResponseDto {
  eventId: string;
  matchId: string;
  over: number;
  ball: number;
  runs: number;
  extras: BallExtrasDto;
  isWicket: boolean;
  totalScore: number;
  wickets: number;
  runRate: number;
  commentary?: string;
  tokenRewards?: string[];
}

export class MatchStateResponseDto {
  matchId: string;
  status: string;
  currentInnings: number;
  battingTeam: string;
  bowlingTeam: string;
  score: number;
  wickets: number;
  overs: string;
  runRate: number;
  target?: number;
  requiredRunRate?: number;
  batsmanOnStrike: {
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
  };
  batsmanNonStrike: {
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
  };
  currentBowler: {
    name: string;
    overs: string;
    maidens: number;
    runs: number;
    wickets: number;
    economy: number;
  };
  partnership: {
    runs: number;
    balls: number;
  };
  lastSixBalls: string[];
  recentOvers: {
    over: number;
    runs: number;
    balls: string[];
  }[];
}

export class ScoreboardDto {
  matchId: string;
  teamA: {
    name: string;
    innings1?: InningsSummaryDto;
    innings2?: InningsSummaryDto;
  };
  teamB: {
    name: string;
    innings1?: InningsSummaryDto;
    innings2?: InningsSummaryDto;
  };
  result?: string;
}

export class InningsSummaryDto {
  runs: number;
  wickets: number;
  overs: string;
  runRate: number;
  batting: BatsmanSummaryDto[];
  bowling: BowlerSummaryDto[];
  fallOfWickets: string[];
  extras: {
    total: number;
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
}

export class BatsmanSummaryDto {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissal: string;
}

export class BowlerSummaryDto {
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}
