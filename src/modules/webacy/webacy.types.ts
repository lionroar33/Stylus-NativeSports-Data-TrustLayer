/**
 * Webacy Security Types
 * Type definitions for Webacy API integration
 */

export interface RiskAssessment {
  address: string;
  riskScore: number;
  isSafe: boolean;
  flags: string[];
  chain: string;
  isSanctioned: boolean;
  timestamp: Date;
}

export interface ContractAnalysis {
  contractAddress: string;
  riskScore: number;
  issues: ContractIssue[];
  analyzedAt: Date;
}

export interface ContractIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
}

export interface UrlRiskResult {
  url: string;
  isMalicious: boolean;
  riskScore: number;
  threats: string[];
}

export interface WebacyConfig {
  apiKey: string;
  defaultChain: string;
  riskThreshold: number;
  failClosed: boolean;
}

export const DEFAULT_RISK_THRESHOLD = 70;
export const DEFAULT_CHAIN = 'sol';
