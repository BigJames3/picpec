import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('WalletService', () => {
  let walletService: WalletService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotifications = {
    notifyWalletCredit: jest.fn().mockResolvedValue(undefined),
    notifyWalletDebit: jest.fn().mockResolvedValue(undefined),
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@picpec.com',
    walletBalance: 100000,
    isActive: true,
  };

  const mockReceiver = {
    id: 'user-2',
    email: 'receiver@picpec.com',
    walletBalance: 50000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    walletService = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  describe('deposit()', () => {
    it('devrait créditer le wallet et créer une transaction', async () => {
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.user.findUnique.mockResolvedValue({
        walletBalance: 105000,
      });

      const result = await walletService.deposit('user-1', 5000);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('balance');
      expect(result.balance).toBe(105000);
    });

    it('devrait générer une référence unique avec préfixe DEP', async () => {
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.user.findUnique.mockResolvedValue({
        walletBalance: 101000,
      });

      await walletService.deposit('user-1', 1000);

      const txCall = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(txCall)).toBe(true);
      expect(txCall).toHaveLength(2);
    });
  });

  describe('withdraw()', () => {
    it('devrait débiter le wallet et créer une transaction', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ walletBalance: 100000 })
        .mockResolvedValueOnce({ walletBalance: 95000 });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await walletService.withdraw('user-1', 5000);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('balance');
      expect(result.balance).toBe(95000);
    });

    it('devrait lever BadRequestException si solde insuffisant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        walletBalance: 100,
      });

      await expect(
        walletService.withdraw('user-1', 5000),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si user non trouvé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        walletService.withdraw('ghost', 5000),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transfer()', () => {
    it('devrait transférer atomiquement entre 2 utilisateurs', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockReceiver)
        .mockResolvedValueOnce({ ...mockUser, walletBalance: 100000 });
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx-3',
        reference: 'TRF-xxx',
      });
      mockPrisma.$transaction.mockImplementation((arg) =>
        Array.isArray(arg)
          ? Promise.all(arg)
          : Promise.resolve([]),
      );

      const result = await walletService.transfer('user-1', {
        receiverId: 'user-2',
        amount: 10000,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.id).toBe('tx-3');
    });

    it('devrait lever NotFoundException si destinataire inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        walletService.transfer('user-1', {
          receiverId: '00000000-0000-0000-0000-000000000000',
          amount: 1000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever BadRequestException si transfert vers soi-même', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(
        walletService.transfer('user-1', {
          receiverId: 'user-1',
          amount: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si solde sender insuffisant', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockReceiver)
        .mockResolvedValueOnce({ ...mockUser, walletBalance: 100 });

      await expect(
        walletService.transfer('user-1', {
          receiverId: 'user-2',
          amount: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si limite journalière dépassée', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockReceiver)
        .mockResolvedValueOnce(mockUser);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 1990000 },
      });

      await expect(
        walletService.transfer('user-1', {
          receiverId: 'user-2',
          amount: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneTransaction()', () => {
    it('devrait retourner la transaction si owner (sender)', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        amount: 5000,
      });

      const result = await walletService.findOneTransaction('tx-1', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('tx-1');
    });

    it('devrait retourner la transaction si owner (receiver)', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        senderId: 'user-2',
        receiverId: 'user-1',
        amount: 5000,
      });

      const result = await walletService.findOneTransaction('tx-1', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('tx-1');
    });

    it('devrait lever NotFoundException si transaction inexistante', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(
        walletService.findOneTransaction('ghost-tx', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever ForbiddenException si pas propriétaire', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        senderId: 'user-3',
        receiverId: 'user-4',
      });

      await expect(
        walletService.findOneTransaction('tx-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
