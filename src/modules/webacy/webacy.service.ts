/**
 * Webacy Security Service
 * Centralized security screening using Webacy APIs
 *
 * Features:
 * - Wallet/Address risk screening
 * - Sanctions check
 * - Contract security analysis
 * - URL risk validation
 * - Token holder analysis
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import {
  RiskAssessment,
  ContractAnalysis,
  UrlRiskResult,
  DEFAULT_RISK_THRESHOLD,
  DEFAULT_CHAIN,
} from './webacy.types';

@Injectable()
export class WebacyService {
  private readonly logger = new Logger(WebacyService.name);
  private readonly apiBase = 'https://api.webacy.com';
  private readonly riskThreshold = DEFAULT_RISK_THRESHOLD;
  private readonly defaultChain = DEFAULT_CHAIN;

  /**
   * Get API key from environment at runtime
   * This ensures the key is never stored in code
   */
  private getApiKey(): string {
    const apiKey = process.env.WEBACY_API_KEY;
    if (!apiKey) {
      this.logger.error('WEBACY_API_KEY environment variable is not set');
      throw new HttpException(
        'Security service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return apiKey;
  }

  // ─── Wallet / Address Screening ───────────────────────

  /**
   * Assess wallet risk before allowing transactions
   * This is the primary screening method for burn operations
   */
  async assessWalletRisk(address: string): Promise<RiskAssessment> {
    this.logger.log(`Screening wallet: ${address}`);

    try {
      const response = await fetch(
        `${this.apiBase}/addresses/${address}/risk?chain=${this.defaultChain}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.getApiKey(),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Webacy API error: ${response.status}`);
      }

      const data = await response.json();

      const assessment: RiskAssessment = {
        address,
        riskScore: data.overallRisk ?? data.riskScore ?? 0,
        isSafe: (data.overallRisk ?? data.riskScore ?? 0) < this.riskThreshold,
        flags: data.issues?.map((i: any) => i.description) ?? [],
        chain: this.defaultChain,
        isSanctioned:
          data.issues?.some((i: any) => i.category === 'sanctions') ?? false,
        timestamp: new Date(),
      };

      this.logger.log(
        `Wallet ${address} risk assessment: score=${assessment.riskScore}, safe=${assessment.isSafe}`,
      );

      return assessment;
    } catch (error) {
      this.logger.error(`Wallet screening failed: ${error.message}`);
      // Fail-closed for financial operations
      throw new HttpException(
        'Security screening unavailable. Please try again.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Screen wallet specifically for burn operations
   * Returns true if safe, throws if risky
   */
  async screenWalletForBurn(walletAddress: string): Promise<boolean> {
    const assessment = await this.assessWalletRisk(walletAddress);

    if (!assessment.isSafe) {
      this.logger.warn(
        `HIGH RISK wallet blocked from burn: ${walletAddress} (score: ${assessment.riskScore})`,
      );
      throw new HttpException(
        'Wallet flagged as high risk. Burn transaction blocked.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (assessment.isSanctioned) {
      this.logger.warn(
        `SANCTIONED wallet blocked from burn: ${walletAddress}`,
      );
      throw new HttpException(
        'Wallet is on sanctions list. Transaction denied.',
        HttpStatus.FORBIDDEN,
      );
    }

    this.logger.log(
      `Wallet ${walletAddress} cleared for burn (risk: ${assessment.riskScore})`,
    );
    return true;
  }

  // ─── Sanctions Check ─────────────────────────────────

  /**
   * Check if an address is on sanctions lists (OFAC/UN/EU)
   */
  async isSanctioned(address: string): Promise<boolean> {
    try {
      const assessment = await this.assessWalletRisk(address);
      return assessment.isSanctioned;
    } catch (error) {
      this.logger.error(`Sanctions check failed: ${error.message}`);
      // Fail-closed for sanctions
      return true;
    }
  }

  // ─── Contract Scanning ───────────────────────────────

  /**
   * Analyze a smart contract for security risks
   * Use this to audit your own deployed Solana programs
   */
  async analyzeContract(contractAddress: string): Promise<ContractAnalysis> {
    this.logger.log(`Analyzing contract: ${contractAddress}`);

    try {
      const response = await fetch(
        `${this.apiBase}/contracts/${contractAddress}/risk?chain=${this.defaultChain}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.getApiKey(),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Webacy API error: ${response.status}`);
      }

      const data = await response.json();

      const analysis: ContractAnalysis = {
        contractAddress,
        riskScore: data.overallRisk ?? data.riskScore ?? 0,
        issues:
          data.issues?.map((i: any) => ({
            severity: i.severity ?? 'medium',
            category: i.category ?? 'unknown',
            description: i.description ?? '',
          })) ?? [],
        analyzedAt: new Date(),
      };

      if (analysis.riskScore >= 50) {
        this.logger.warn(
          `Contract ${contractAddress} has elevated risk: ${analysis.riskScore}`,
        );
      }

      return analysis;
    } catch (error) {
      this.logger.error(`Contract analysis failed: ${error.message}`);
      throw new HttpException(
        'Contract analysis unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ─── URL Risk Validation ─────────────────────────────

  /**
   * Check if a URL is safe before making HTTP requests to it
   * Use for validating external API endpoints (wearables, etc.)
   */
  async checkUrlRisk(url: string): Promise<UrlRiskResult> {
    this.logger.log(`Checking URL risk: ${url}`);

    try {
      const response = await fetch(`${this.apiBase}/url-risk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.getApiKey(),
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Webacy API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        url,
        isMalicious: data.isMalicious ?? false,
        riskScore: data.riskScore ?? 0,
        threats: data.threats ?? [],
      };
    } catch (error) {
      this.logger.error(`URL risk check failed: ${error.message}`);
      // Fail-open for non-financial URL checks
      return {
        url,
        isMalicious: false,
        riskScore: 0,
        threats: [],
      };
    }
  }

  /**
   * Validate if a URL is safe to connect to
   */
  async isUrlSafe(url: string): Promise<boolean> {
    const result = await this.checkUrlRisk(url);

    if (result.isMalicious || result.riskScore >= 60) {
      this.logger.warn(`Blocked unsafe URL: ${url}`);
      return false;
    }

    return true;
  }

  // ─── Transaction Risk ────────────────────────────────

  /**
   * Assess risk of a specific transaction
   */
  async assessTransactionRisk(txHash: string): Promise<RiskAssessment> {
    this.logger.log(`Assessing transaction risk: ${txHash}`);

    try {
      const response = await fetch(
        `${this.apiBase}/transactions/${txHash}/risk?chain=${this.defaultChain}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.getApiKey(),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Webacy API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        address: txHash,
        riskScore: data.overallRisk ?? data.riskScore ?? 0,
        isSafe: (data.overallRisk ?? data.riskScore ?? 0) < this.riskThreshold,
        flags: data.issues?.map((i: any) => i.description) ?? [],
        chain: this.defaultChain,
        isSanctioned: false,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Transaction risk assessment failed: ${error.message}`);
      throw new HttpException(
        'Transaction risk assessment unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ─── Token Holder Analysis ───────────────────────────

  /**
   * Analyze token holders for suspicious patterns
   * Detects bundling, sniping, and suspicious early-buyer patterns
   */
  async analyzeTokenHolders(tokenMintAddress: string): Promise<any> {
    this.logger.log(`Analyzing token holders: ${tokenMintAddress}`);

    try {
      const response = await fetch(
        `${this.apiBase}/tokens/${tokenMintAddress}/holders?chain=${this.defaultChain}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.getApiKey(),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Webacy API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Token holder analysis failed: ${error.message}`);
      throw new HttpException(
        'Token holder analysis unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
