import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

/**
 * Module 1 - User Account & Profile System
 * Handles user registration, authentication, and profile management.
 *
 * Phase 2 Scope (UI Only):
 * - Login screen (email, phone OTP, social login)
 * - Registration screen
 * - OTP verification screen
 * - Profile creation (8-step onboarding flow)
 */
@Module({
  controllers: [AuthController],
  providers: [],
})
export class AuthModule {}
