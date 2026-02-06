import { Module } from '@nestjs/common';
import { ForumsController } from './forums.controller';
import { ForumsService } from './forums.service';

/**
 * Module 5 - Community Discussion Space
 * Discussion boards per sport and tournament.
 *
 * Features:
 * - Discussion boards per sport/tournament
 * - Like, Reply, Report functionalities
 * - Push notifications for replies/mentions
 * - Moderation tools with content flagging
 */
@Module({
  controllers: [ForumsController],
  providers: [ForumsService],
  exports: [ForumsService],
})
export class ForumsModule {}
