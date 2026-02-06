/**
 * Webacy Risk Guard
 * NestJS Guard that screens wallet addresses on incoming API requests
 *
 * Usage:
 * Apply to endpoints that accept wallet addresses:
 *
 * @UseGuards(WebacyRiskGuard)
 * @Post('burn')
 * async initiateBurn(@Body() dto: BurnDto) { ... }
 *
 * The guard looks for wallet addresses in:
 * - request.body.walletAddress
 * - request.params.walletAddress
 * - request.query.wallet
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WebacyService } from '../../modules/webacy/webacy.service';
import { RiskAssessment } from '../../modules/webacy/webacy.types';

// Extend Express Request to include risk assessment
declare module 'express' {
  interface Request {
    webacyRisk?: RiskAssessment;
  }
}

@Injectable()
export class WebacyRiskGuard implements CanActivate {
  private readonly logger = new Logger(WebacyRiskGuard.name);

  constructor(private readonly webacy: WebacyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract wallet address from various locations
    const walletAddress =
      request.body?.walletAddress ||
      request.body?.wallet ||
      request.params?.walletAddress ||
      request.params?.wallet ||
      request.query?.walletAddress ||
      request.query?.wallet;

    // No wallet to screen - allow request to proceed
    if (!walletAddress) {
      return true;
    }

    this.logger.log(`Screening wallet from request: ${walletAddress}`);

    try {
      const assessment = await this.webacy.assessWalletRisk(walletAddress);

      if (!assessment.isSafe) {
        this.logger.warn(
          `Blocked risky wallet: ${walletAddress} (score: ${assessment.riskScore})`,
        );
        throw new HttpException(
          {
            message: 'Wallet failed security screening',
            riskScore: assessment.riskScore,
            flags: assessment.flags,
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (assessment.isSanctioned) {
        this.logger.warn(`Blocked sanctioned wallet: ${walletAddress}`);
        throw new HttpException(
          {
            message: 'Wallet is on sanctions list',
            sanctioned: true,
          },
          HttpStatus.FORBIDDEN,
        );
      }

      // Attach risk data to request for downstream use
      request.webacyRisk = assessment;

      this.logger.log(
        `Wallet ${walletAddress} passed screening (risk: ${assessment.riskScore})`,
      );
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Wallet screening error: ${error.message}`);

      // Fail-closed for security
      throw new HttpException(
        'Security screening unavailable. Please try again.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
