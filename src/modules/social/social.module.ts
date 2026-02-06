import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';

/**
 * Module 6 - Follow System & Social Feed
 * Social features and activity feed.
 *
 * Features:
 * - Follow/unfollow players
 * - Home feed of followers' activities
 * - AI-controlled sports-only photo wall
 * - Feed aggregation via Redis pub/sub
 */
@Module({
  controllers: [SocialController],
  providers: [],
})
export class SocialModule {}
