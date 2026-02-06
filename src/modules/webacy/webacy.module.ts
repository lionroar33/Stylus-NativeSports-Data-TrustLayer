import { Module, Global } from '@nestjs/common';
import { WebacyService } from './webacy.service';

/**
 * Webacy Security Module
 * Global module providing centralized security screening services
 *
 * Features:
 * - Wallet/address threat risk screening
 * - Sanctions check (OFAC/UN/EU)
 * - Smart contract security analysis
 * - URL risk validation
 * - Token holder analysis
 *
 * Integration Points:
 * - Blockchain Module: Screen wallets before token burns (P0)
 * - API Middleware: Block risky wallets at API boundary (P1)
 * - Events Module: Audit deployed contracts (P2)
 * - Wearables Module: Validate external API URLs (P3)
 *
 * Configuration:
 * Set WEBACY_API_KEY environment variable at runtime
 * DO NOT store API key in code - it will be read from environment
 */
@Global()
@Module({
  providers: [WebacyService],
  exports: [WebacyService],
})
export class WebacyModule {}
