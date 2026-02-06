/**
 * Forums Module - DTOs
 * Phase 5: Data Transfer Objects for forums
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsNumber,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';

export enum ForumCategory {
  GENERAL = 'general',
  CRICKET = 'cricket',
  FOOTBALL = 'football',
  TENNIS = 'tennis',
  BADMINTON = 'badminton',
  BASKETBALL = 'basketball',
  OTHER = 'other',
}

export class CreateForumDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsOptional()
  @IsUUID()
  tournamentId?: string;

  @IsEnum(ForumCategory)
  category: ForumCategory;
}

export class CreatePostDto {
  @IsUUID()
  forumId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentPostId?: string;
}

export class UpdatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class ReportPostDto {
  @IsUUID()
  postId: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}

export class ForumResponseDto {
  id: string;
  title: string;
  description?: string;
  category: ForumCategory;
  sportId?: string;
  tournamentId?: string;
  creatorId: string;
  postCount: number;
  lastActivity: Date;
  createdAt: Date;
}

export class PostResponseDto {
  id: string;
  forumId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentPostId?: string;
  likesCount: number;
  repliesCount: number;
  isLikedByUser: boolean;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}
