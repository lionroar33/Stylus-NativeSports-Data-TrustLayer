import { Controller, Get, Render } from '@nestjs/common';

/**
 * Social Controller - UI Routes
 * Module 6: Follow System & Social Feed
 */
@Controller()
export class SocialController {
  /**
   * Social Feed Page
   */
  @Get('feed')
  @Render('social/feed')
  feed() {
    return {
      title: 'Feed',
      layout: 'layouts/main',
      isFeed: true,
      pageTitle: 'Social Feed',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }

  /**
   * Discover Players Page
   */
  @Get('discover')
  @Render('social/discover')
  discover() {
    return {
      title: 'Discover Players',
      layout: 'layouts/main',
      isDiscover: true,
      pageTitle: 'Discover Players',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }

  /**
   * User Profile Page
   */
  @Get('profile')
  @Render('social/profile')
  profile() {
    return {
      title: 'My Profile',
      layout: 'layouts/main',
      isProfile: true,
      pageTitle: 'My Profile',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }
}
