import { Controller, Get, Post, Delete, Body, Param, Query, Render } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ConnectWalletDto, CreateTokenTransactionDto } from './dto/token.dto';

/**
 * Blockchain Controller - UI & API Routes
 * Module 9: Blockchain & Tokenomics
 */
@Controller('tokens')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  // ============================================
  // UI Routes
  // ============================================

  @Get()
  @Render('blockchain/index')
  index() {
    const stats = this.blockchainService.getTokenStats();
    const leaderboard = this.blockchainService.getLeaderboard(10);
    return {
      title: 'Token Rewards',
      layout: 'layouts/main',
      isTokens: true,
      pageTitle: 'Token Rewards',
      user: { name: 'John Doe', initials: 'JD' },
      stats,
      leaderboard,
    };
  }

  @Get('history')
  @Render('blockchain/history')
  history() {
    return {
      title: 'Transaction History',
      layout: 'layouts/main',
      isTokens: true,
      pageTitle: 'Transaction History',
      user: { name: 'John Doe', initials: 'JD' },
    };
  }

  // ============================================
  // API Routes - Wallet
  // ============================================

  @Post('api/wallet/connect')
  async connectWallet(@Body() dto: ConnectWalletDto) {
    const wallet = await this.blockchainService.connectWallet(dto);
    return { success: true, data: wallet };
  }

  @Delete('api/wallet/:userId')
  disconnectWallet(@Param('userId') userId: string) {
    this.blockchainService.disconnectWallet(userId);
    return { success: true, message: 'Wallet disconnected' };
  }

  @Get('api/wallet/:userId')
  getWallet(@Param('userId') userId: string) {
    const wallet = this.blockchainService.getWallet(userId);
    return { success: true, data: wallet };
  }

  @Get('api/wallet/:userId/balance')
  getWalletBalance(@Param('userId') userId: string) {
    const balance = this.blockchainService.getWalletBalance(userId);
    return { success: true, data: balance };
  }

  // ============================================
  // API Routes - Transactions
  // ============================================

  @Post('api/transactions')
  async createTransaction(@Body() dto: CreateTokenTransactionDto) {
    const transaction = await this.blockchainService.createTokenTransaction(dto);
    return { success: true, data: transaction };
  }

  @Get('api/transactions/:id')
  getTransaction(@Param('id') transactionId: string) {
    const transaction = this.blockchainService.getTransaction(transactionId);
    return { success: true, data: transaction };
  }

  @Get('api/users/:userId/transactions')
  getUserTransactions(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    const result = this.blockchainService.getUserTransactions(userId, +page, +limit);
    return {
      success: true,
      data: result.transactions,
      pagination: {
        page: +page,
        limit: +limit,
        total: result.total,
      },
    };
  }

  @Get('api/matches/:matchId/transactions')
  getMatchTransactions(@Param('matchId') matchId: string) {
    const transactions = this.blockchainService.getMatchTransactions(matchId);
    return { success: true, data: transactions };
  }

  // ============================================
  // API Routes - Statistics
  // ============================================

  @Get('api/stats')
  getTokenStats() {
    const stats = this.blockchainService.getTokenStats();
    return { success: true, data: stats };
  }

  @Get('api/stats/burn-by-tier')
  getBurnStatsByTier() {
    const stats = this.blockchainService.getBurnStatsByTier();
    return { success: true, data: stats };
  }

  @Get('api/leaderboard')
  getLeaderboard(@Query('limit') limit = 10) {
    const leaderboard = this.blockchainService.getLeaderboard(+limit);
    return { success: true, data: leaderboard };
  }

  // ============================================
  // API Routes - Verification
  // ============================================

  @Post('api/verify/:txHash')
  async verifyDataPoint(@Param('txHash') txHash: string) {
    const isValid = await this.blockchainService.verifyDataPoint(txHash);
    return { success: true, data: { txHash, isValid } };
  }
}
