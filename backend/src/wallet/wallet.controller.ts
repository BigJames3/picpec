import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserData } from '../auth/auth.types';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransferDto } from './dto/transfer.dto';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import {
  DepositMobileMoneyDto,
  WithdrawMobileMoneyDto,
} from './dto/deposit-mobile-money.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';

@ApiTags('wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Solde du portefeuille' })
  @ApiResponse({ status: 200, description: 'Solde retourné' })
  getBalance(@CurrentUser() user: CurrentUserData) {
    return this.walletService.getBalance(user.id);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Dépôt sur le portefeuille' })
  @ApiResponse({ status: 200, description: 'Dépôt effectué' })
  deposit(@CurrentUser() user: CurrentUserData, @Body() dto: DepositDto) {
    return this.walletService.deposit(user.id, dto.amount);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Retrait du portefeuille' })
  @ApiResponse({ status: 200, description: 'Retrait effectué' })
  withdraw(@CurrentUser() user: CurrentUserData, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(user.id, dto.amount);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfert P2P vers un autre utilisateur' })
  @ApiResponse({ status: 200, description: 'Transfert effectué' })
  @ApiResponse({ status: 404, description: 'Destinataire introuvable' })
  @ApiResponse({ status: 400, description: 'Solde insuffisant ou limite dépassée' })
  transfer(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: TransferDto,
  ) {
    return this.walletService.transfer(user.id, dto);
  }

  @Post('deposit/mobile-money')
  @ApiOperation({ summary: 'Dépôt via Mobile Money' })
  @ApiResponse({ status: 200, description: 'Paiement initié' })
  depositMobileMoney(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: DepositMobileMoneyDto,
  ) {
    return this.walletService.initiateDepositMobileMoney(user.id, dto);
  }

  @Post('withdraw/mobile-money')
  @ApiOperation({ summary: 'Retrait vers Mobile Money' })
  @ApiResponse({ status: 200, description: 'Retrait initié' })
  withdrawMobileMoney(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: WithdrawMobileMoneyDto,
  ) {
    return this.walletService.initiateWithdrawMobileMoney(user.id, dto);
  }

  @Post('verify-pin')
  @ApiOperation({ summary: 'Vérifier le PIN et obtenir un token d\'action' })
  @ApiResponse({ status: 200, description: 'Token d\'action généré' })
  verifyPin(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: VerifyPinDto,
  ) {
    return this.walletService.verifyPin(user.id, dto.pin);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Détail d\'une transaction' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  getTransaction(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.walletService.findOneTransaction(id, user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Historique des transactions' })
  @ApiResponse({ status: 200, description: 'Liste paginée avec filtres' })
  getTransactions(
    @CurrentUser() user: CurrentUserData,
    @Query() dto: GetTransactionsDto,
  ) {
    return this.walletService.getTransactions(user.id, dto);
  }
}
