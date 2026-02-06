/**
 * DTOs for Match Finalization
 */

import { IsString, IsNumber, IsArray, ValidateNested, IsEthereumAddress, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PlayerPerformanceDto {
  @IsEthereumAddress()
  playerAddress: string;

  @IsNumber()
  @Min(0)
  runsScored: number;

  @IsNumber()
  @Min(0)
  wicketsTaken: number;

  @IsNumber()
  @Min(0)
  ballsFaced: number;

  @IsNumber()
  @Min(0)
  ballsBowled: number;

  @IsNumber()
  @Min(0)
  @Max(7)
  tier: number; // 0-7 (reward tier)

  @IsNumber()
  @Min(0)
  @Max(100)
  effortScore: number; // 0-100 from wearable data
}

export class FinalizeMatchDto {
  @IsString()
  matchId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlayerPerformanceDto)
  performances: PlayerPerformanceDto[];
}

export class RegisterMatchDto {
  @IsString()
  matchId: string;

  @IsString()
  organizerAddress: string;
}
