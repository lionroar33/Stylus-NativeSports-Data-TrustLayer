/**
 * DTOs for Burn Requests
 */

import { IsString, IsNumber, IsEthereumAddress, Min, Max } from 'class-validator';

export class BurnRequestDto {
  @IsString()
  matchId: string;

  @IsEthereumAddress()
  playerAddress: string;

  @IsNumber()
  @Min(0)
  @Max(7)
  tier: number; // Reward tier (0-7)

  @IsNumber()
  @Min(0)
  @Max(100)
  performanceScore: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  effortScore: number;
}

export class MintAthleteProfileDto {
  @IsEthereumAddress()
  athleteAddress: string;

  @IsString()
  athleteName: string;
}

export class UpdateAthleteStatsDto {
  @IsNumber()
  tokenId: number;

  @IsString()
  matchId: string;

  @IsNumber()
  @Min(0)
  runs: number;

  @IsNumber()
  @Min(0)
  wickets: number;
}
