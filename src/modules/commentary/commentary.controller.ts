import { Controller, Get, Post, Body, Param, Render } from '@nestjs/common';
import { CommentaryService, CommentaryPersona } from './services/commentary.service';
import { MatchGateway } from './gateways/match.gateway';

/**
 * Commentary Controller - UI & API Routes
 * Module 10: Real-Time Commentary Engine
 */
@Controller('commentary')
export class CommentaryController {
  constructor(
    private readonly commentaryService: CommentaryService,
    private readonly matchGateway: MatchGateway,
  ) {}

  // ============================================
  // UI Routes
  // ============================================

  @Get()
  @Render('commentary/index')
  index() {
    return {
      title: 'Commentary',
      layout: 'layouts/main',
      isCommentary: true,
      pageTitle: 'Commentary Settings',
      user: { name: 'John Doe', initials: 'JD' },
      personas: this.commentaryService.getAvailablePersonas(),
      currentPersona: this.commentaryService.getDefaultPersona(),
      triggers: this.commentaryService.getAvailableTriggers(),
    };
  }

  // ============================================
  // API Routes
  // ============================================

  /**
   * Get available commentary personas
   * GET /commentary/api/personas
   */
  @Get('api/personas')
  getPersonas() {
    return {
      success: true,
      data: {
        available: this.commentaryService.getAvailablePersonas(),
        current: this.commentaryService.getDefaultPersona(),
      },
    };
  }

  /**
   * Set default commentary persona
   * POST /commentary/api/personas
   */
  @Post('api/personas')
  setPersona(@Body() dto: { persona: CommentaryPersona }) {
    this.commentaryService.setDefaultPersona(dto.persona);
    return {
      success: true,
      data: {
        persona: dto.persona,
      },
    };
  }

  /**
   * Get available triggers
   * GET /commentary/api/triggers
   */
  @Get('api/triggers')
  getTriggers() {
    return {
      success: true,
      data: this.commentaryService.getAvailableTriggers(),
    };
  }

  /**
   * Get active WebSocket connections stats
   * GET /commentary/api/connections
   */
  @Get('api/connections')
  getConnectionStats() {
    return {
      success: true,
      data: {
        totalClients: this.matchGateway.getConnectedClientCount(),
        activeMatches: this.matchGateway.getActiveMatches(),
      },
    };
  }

  /**
   * Clear cooldowns for a match
   * POST /commentary/api/matches/:id/cooldowns/clear
   */
  @Post('api/matches/:id/cooldowns/clear')
  clearCooldowns(@Param('id') matchId: string) {
    this.commentaryService.clearCooldowns(matchId);
    return {
      success: true,
      message: `Cooldowns cleared for match ${matchId}`,
    };
  }
}
