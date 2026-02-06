import { Controller, Get, Render } from '@nestjs/common';

/**
 * Matches Controller - UI Routes
 * Module 3: Match & Tournament Management
 */
@Controller()
export class MatchesController {
  /**
   * Matches List Page
   */
  @Get('matches')
  @Render('matches/index')
  index() {
    return {
      title: 'Matches',
      layout: 'layouts/main',
      isMatches: true,
      pageTitle: 'My Matches',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }

  /**
   * Tournaments List Page
   */
  @Get('tournaments')
  @Render('matches/tournaments')
  tournaments() {
    return {
      title: 'Tournaments',
      layout: 'layouts/main',
      isTournaments: true,
      pageTitle: 'Tournaments',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }

  /**
   * Create Match Page
   */
  @Get('matches/create')
  @Render('matches/create')
  create() {
    return {
      title: 'Create Match',
      layout: 'layouts/main',
      isMatches: true,
      pageTitle: 'Create Match',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }
}
