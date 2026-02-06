import { Controller, Get, Render } from '@nestjs/common';

/**
 * Auth Controller - UI Routes
 * Phase 2: Authentication & User Onboarding Screens
 */
@Controller()
export class AuthController {
  /**
   * Landing / Welcome Page
   */
  @Get()
  @Render('auth/welcome')
  welcome() {
    return {
      title: 'Welcome',
      layout: 'layouts/auth',
    };
  }

  /**
   * Login Page - Email/Phone/Social options
   */
  @Get('login')
  @Render('auth/login')
  login() {
    return {
      title: 'Login',
      layout: 'layouts/auth',
    };
  }

  /**
   * Registration Page
   */
  @Get('register')
  @Render('auth/register')
  register() {
    return {
      title: 'Create Account',
      layout: 'layouts/auth',
    };
  }

  /**
   * OTP Verification Page
   */
  @Get('verify-otp')
  @Render('auth/verify-otp')
  verifyOtp() {
    return {
      title: 'Verify OTP',
      layout: 'layouts/auth',
    };
  }

  /**
   * Onboarding Flow - 8 Steps
   */
  @Get('onboarding')
  @Render('onboarding/index')
  onboarding() {
    return {
      title: 'Complete Your Profile',
      layout: 'layouts/main',
    };
  }

  /**
   * Dashboard - Post-login landing page
   */
  @Get('dashboard')
  @Render('dashboard/index')
  dashboard() {
    return {
      title: 'Dashboard',
      layout: 'layouts/main',
      isDashboard: true,
      pageTitle: 'Dashboard',
      user: {
        name: 'John Doe',
        initials: 'JD',
        profileImage: null,
      },
    };
  }
}
