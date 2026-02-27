import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserData } from '../auth/auth.types';
import { PaymentService, ProviderName } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TontinesService } from '../tontines/tontines.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TontineStatus, MemberStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
    private readonly tontinesService: TontinesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('initiate')
  @ApiOperation({ summary: 'Initier un paiement mobile money pour une cotisation' })
  async initiate(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: InitiatePaymentDto,
  ) {
    const tontine = await this.prisma.tontine.findUnique({
      where: { id: dto.tontineId },
      include: { members: { where: { status: MemberStatus.ACTIVE }, orderBy: { tourOrder: 'asc' } } },
    });
    if (!tontine) throw new NotFoundException('Tontine introuvable');
    if (tontine.status !== TontineStatus.ACTIVE) {
      throw new BadRequestException("La tontine n'est pas active");
    }

    const member = tontine.members.find((m: { userId: string }) => m.userId === user.id);
    if (!member) throw new ForbiddenException("Vous n'êtes pas membre");

    const cotisation = await this.tontinesService.getPendingCotisation(user.id, dto.tontineId);
    if (!cotisation) {
      throw new BadRequestException('Aucune cotisation en attente pour ce cycle');
    }

    const amount = cotisation.montant + cotisation.penalite;
    const reference = `TON-${dto.tontineId}-${user.id}-${cotisation.cycleId}-${Date.now()}`;

    await this.prisma.pendingPayment.create({
      data: {
        reference,
        tontineId: dto.tontineId,
        userId: user.id,
        cotisationId: cotisation.id,
        cycleId: cotisation.cycleId,
        amount: new Decimal(amount),
        provider: dto.provider,
      },
    });

    const result = await this.paymentService.initiateCotisationPayment(
      dto.provider as ProviderName,
      {
        amount: Number(amount),
        phone: dto.phone,
        currency: 'XOF',
        reference,
        description: `Cotisation tontine ${tontine.titre}`,
        userId: user.id,
        tontineId: dto.tontineId,
        cycleId: cotisation.cycleId,
      },
    );

    return {
      transactionId: result.transactionId,
      status: result.status,
      checkoutUrl: result.checkoutUrl,
      message: result.message,
    };
  }
}
