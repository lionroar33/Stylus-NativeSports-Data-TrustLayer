import { Module } from '@nestjs/common';
import { EcommerceController } from './ecommerce.controller';
import { EcommerceService } from './ecommerce.service';

/**
 * Module 7 - E-Commerce Corner (Sports Gear)
 * Sports equipment marketplace.
 *
 * Features:
 * - Product listing by sport with filters
 * - Shopping cart management
 * - Order creation and tracking
 * - Product reviews and ratings
 * - Brand filtering
 */
@Module({
  controllers: [EcommerceController],
  providers: [EcommerceService],
  exports: [EcommerceService],
})
export class EcommerceModule {}
