import { Controller, Get, Render } from '@nestjs/common';

/**
 * Wearables Controller - UI Routes
 * Module 11: Wearable & Calorie Integration
 */
@Controller('wearables')
export class WearablesController {
  /**
   * Wearables Dashboard
   */
  @Get()
  @Render('wearables/index')
  index() {
    return {
      title: 'Wearables',
      layout: 'layouts/main',
      isWearables: true,
      pageTitle: 'Wearable Devices',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }
}
