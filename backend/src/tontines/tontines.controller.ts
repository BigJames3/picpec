import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TontinesService } from './tontines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserData } from '../auth/auth.types';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Role } from '@prisma/client';
import { TontineStatus } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('tontines')
@Controller('tontines')
export class TontinesController {
  constructor(private readonly tontinesService: TontinesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Créer une tontine' })
  @ApiResponse({ status: 201, description: 'Tontine créée' })
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateTontineDto) {
    return this.tontinesService.createTontine(user.id, dto);
  }

  @Post('join/:token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rejoindre une tontine via lien d\'invitation' })
  @ApiResponse({ status: 201, description: 'Membre ajouté' })
  joinByToken(
    @Param('token') token: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tontinesService.joinTontine(user.id, token);
  }

  @Get('invite/:token')
  @ApiOperation({ summary: 'Valider un lien d\'invitation (public)' })
  @ApiResponse({ status: 200 })
  validateInvitation(@Param('token') token: string) {
    return this.tontinesService.validateInvitationToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/active')
  @ApiOperation({ summary: 'Mes tontines actives' })
  @ApiResponse({ status: 200 })
  getActive(@CurrentUser() user: CurrentUserData) {
    return this.tontinesService.getTontinesForUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/pending')
  @ApiOperation({ summary: 'Mes tontines en attente (créateur)' })
  @ApiResponse({ status: 200 })
  getPending(@CurrentUser() user: CurrentUserData) {
    return this.tontinesService.getPendingTontinesForCreator(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/history')
  @ApiOperation({ summary: 'Historique des tontines terminées' })
  @ApiResponse({ status: 200 })
  getHistory(@CurrentUser() user: CurrentUserData) {
    return this.tontinesService.getHistoryForUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id/invitation-link')
  @ApiOperation({ summary: 'Obtenir le lien d\'invitation (créateur uniquement)' })
  @ApiResponse({ status: 200 })
  getInvitationLink(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tontinesService.getInvitationLink(user.id, id).then((link) => ({ link }));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id/pending-cotisation')
  @ApiOperation({ summary: 'Cotisation en attente pour la tontine' })
  @ApiResponse({ status: 200 })
  getPendingCotisation(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tontinesService.getPendingCotisation(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: "Détail d'une tontine" })
  @ApiResponse({ status: 200 })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.tontinesService.getTontineDetail(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/pay')
  @ApiOperation({ summary: 'Payer une cotisation (après paiement mobile money)' })
  @ApiResponse({ status: 200 })
  pay(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: { cotisationId: string; transactionId: string; provider: string },
  ) {
    return this.tontinesService.payCotisation(
      user.id,
      dto.cotisationId,
      dto.transactionId,
      dto.provider,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/pay-wallet')
  @ApiOperation({ summary: 'Payer cotisation via wallet' })
  @ApiResponse({ status: 200 })
  payCotisationWallet(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tontinesService.payCotisationWallet(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Annuler une tontine (créateur, avant démarrage)' })
  @ApiResponse({ status: 200 })
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.tontinesService.cancelTontine(user.id, id);
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée (legacy, peut être supprimée)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.tontinesService.findAll(
      Number(pagination.page) || 1,
      Number(pagination.limit) || 20,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier le statut (ADMIN)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: TontineStatus },
  ) {
    return this.tontinesService.updateStatus(id, dto.status);
  }
}
