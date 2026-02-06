import { Controller, Get, Render } from '@nestjs/common';

/**
 * Sports Controller - UI Routes
 * Module 2: Sport Selection & Skill Integration
 */
@Controller('sports')
export class SportsController {
  /**
   * My Sports Page - List of user's selected sports
   */
  @Get()
  @Render('sports/index')
  index() {
    return {
      title: 'My Sports',
      layout: 'layouts/main',
      isSports: true,
      pageTitle: 'My Sports',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }

  /**
   * Sport Catalog - Browse all available sports
   */
  @Get('catalog')
  @Render('sports/catalog')
  catalog() {
    return {
      title: 'Sport Catalog',
      layout: 'layouts/main',
      isSports: true,
      pageTitle: 'Sport Catalog',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }
}
