import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isLocal } from '../common/config/environment';

@Injectable()
export class MockWalletService {
  constructor(private readonly prisma: PrismaService) {}

  async initWallet(userId: string, soldeInitial = 100000) {
    if (!isLocal()) return;
    return this.prisma.mockWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: soldeInitial },
    });
  }

  async debiter(userId: string, montant: number, description: string) {
    if (!isLocal()) return;
    const wallet = await this.getOrCreate(userId);
    if (wallet.balance < montant) {
      throw new Error(`Solde insuffisant (${wallet.balance} FCFA)`);
    }

    await this.prisma.mockWallet.update({
      where: { userId },
      data: {
        balance: { decrement: montant },
        transactions: {
          create: { type: 'COTISATION', amount: -montant, description },
        },
      },
    });
    console.log(
      `🧪 [WALLET] Débit ${montant} FCFA — ${userId} — Solde restant: ${wallet.balance - montant} FCFA`);
  }

  async crediter(userId: string, montant: number, description: string) {
    if (!isLocal()) return;
    await this.getOrCreate(userId);
    await this.prisma.mockWallet.update({
      where: { userId },
      data: {
        balance: { increment: montant },
        transactions: {
          create: { type: 'VIREMENT_RECU', amount: montant, description },
        },
      },
    });
    console.log(`🧪 [WALLET] Crédit ${montant} FCFA — ${userId} — ✅`);
  }

  async getSolde(userId: string): Promise<number> {
    const wallet = await this.getOrCreate(userId);
    return wallet.balance;
  }

  async getHistorique(userId: string) {
    const wallet = await this.getOrCreate(userId);
    return this.prisma.mockTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getOrCreate(userId: string) {
    return this.prisma.mockWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 100000 },
    });
  }
}
