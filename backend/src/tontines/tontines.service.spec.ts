import { Test, TestingModule } from '@nestjs/testing';
import { TontinesService } from './tontines.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TontineStatus, TontineFrequency } from '@prisma/client';

describe('TontinesService', () => {
  let tontinesService: TontinesService;

  const mockPrisma = {
    tontine: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    tontineMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotifications = {
    notifyWalletDebit: jest.fn().mockResolvedValue(undefined),
    notifyTontineTurnWon: jest.fn().mockResolvedValue(undefined),
    notifyTontinePaymentDue: jest.fn().mockResolvedValue(undefined),
  };

  const mockTontine = {
    id: 'tontine-1',
    title: 'Tontine Test',
    creatorId: 'user-1',
    creator: { id: 'user-1', fullname: 'User 1', avatarUrl: null },
    contributionAmount: 10000,
    frequency: TontineFrequency.MONTHLY,
    membersLimit: 3,
    status: TontineStatus.PENDING,
    currentTurn: 1,
    currentCycle: 1,
    nextPaymentDate: null,
    alertSentAt: null,
    members: [],
  };

  const mockActiveTontine = {
    ...mockTontine,
    status: TontineStatus.ACTIVE,
    nextPaymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    members: [
      {
        id: 'm-1',
        userId: 'user-1',
        turnOrder: 1,
        isPaid: false,
        tontineId: 'tontine-1',
      },
      {
        id: 'm-2',
        userId: 'user-2',
        turnOrder: 2,
        isPaid: false,
        tontineId: 'tontine-1',
      },
      {
        id: 'm-3',
        userId: 'user-3',
        turnOrder: 3,
        isPaid: false,
        tontineId: 'tontine-1',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TontinesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    tontinesService = module.get<TontinesService>(TontinesService);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('devrait créer une tontine avec le bon creatorId', async () => {
      mockPrisma.tontine.create.mockResolvedValue({
        ...mockTontine,
        creatorId: 'user-1',
      });
      mockPrisma.tontineMember.create.mockResolvedValue({
        id: 'm-1',
        userId: 'user-1',
        turnOrder: 1,
      });

      const result = await tontinesService.create('user-1', {
        title: 'Tontine Test',
        contributionAmount: 10000,
        frequency: TontineFrequency.MONTHLY,
        membersLimit: 3,
      });

      expect(mockPrisma.tontine.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.tontine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            creatorId: 'user-1',
            title: 'Tontine Test',
            status: TontineStatus.PENDING,
          }),
        }),
      );
      expect(result).toHaveProperty('owner');
    });

    it('devrait créer le créateur comme premier membre (turnOrder=1)', async () => {
      mockPrisma.tontine.create.mockResolvedValue(mockTontine);
      mockPrisma.tontineMember.create.mockResolvedValue({
        id: 'm-1',
        userId: 'user-1',
        turnOrder: 1,
      });

      await tontinesService.create('user-1', {
        title: 'Tontine Test',
        contributionAmount: 10000,
        frequency: TontineFrequency.MONTHLY,
        membersLimit: 3,
      });

      expect(mockPrisma.tontineMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            turnOrder: 1,
            userId: 'user-1',
          }),
        }),
      );
    });
  });

  describe('join()', () => {
    it('devrait ajouter un membre avec le bon turnOrder', async () => {
      const tontineWith1Member = {
        ...mockTontine,
        members: [{ userId: 'user-1', turnOrder: 1 }],
      };
      mockPrisma.tontine.findUnique.mockResolvedValue(tontineWith1Member);
      mockPrisma.tontineMember.create.mockResolvedValue({
        id: 'm-2',
        userId: 'user-2',
        turnOrder: 2,
      });

      await tontinesService.join('tontine-1', 'user-2');

      expect(mockPrisma.tontineMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ turnOrder: 2 }),
        }),
      );
    });

    it('devrait passer en ACTIVE si membersLimit atteint', async () => {
      const tontineWith2Members = {
        ...mockTontine,
        membersLimit: 3,
        members: [
          { userId: 'user-1', turnOrder: 1 },
          { userId: 'user-2', turnOrder: 2 },
        ],
      };
      mockPrisma.tontine.findUnique.mockResolvedValue(tontineWith2Members);
      mockPrisma.tontineMember.create.mockResolvedValue({ id: 'm-3' });
      mockPrisma.tontine.update.mockResolvedValue({
        ...tontineWith2Members,
        status: TontineStatus.ACTIVE,
      });

      await tontinesService.join('tontine-1', 'user-3');

      expect(mockPrisma.tontine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: TontineStatus.ACTIVE }),
        }),
      );
    });

    it('devrait lever BadRequestException si tontine non PENDING', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue({
        ...mockTontine,
        status: TontineStatus.ACTIVE,
      });

      await expect(
        tontinesService.join('tontine-1', 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si déjà membre', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue({
        ...mockTontine,
        members: [{ userId: 'user-1', turnOrder: 1 }],
      });

      await expect(
        tontinesService.join('tontine-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si tontine pleine', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue({
        ...mockTontine,
        membersLimit: 2,
        members: [
          { userId: 'user-1', turnOrder: 1 },
          { userId: 'user-2', turnOrder: 2 },
        ],
      });

      await expect(
        tontinesService.join('tontine-1', 'user-3'),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever NotFoundException si tontine inexistante', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue(null);

      await expect(
        tontinesService.join('ghost-id', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('pay()', () => {
    it('devrait débiter le wallet et marquer isPaid=true', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue(mockActiveTontine);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        walletBalance: 50000,
      });
      const membersAfterPay = mockActiveTontine.members.map((m) =>
        m.userId === 'user-1' ? { ...m, isPaid: true } : m,
      );
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          const tx = {
            user: { update: jest.fn().mockResolvedValue({}) },
            tontineMember: {
              update: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue(membersAfterPay),
              updateMany: jest.fn().mockResolvedValue({}),
            },
            transaction: { create: jest.fn().mockResolvedValue({}) },
            tontine: { update: jest.fn().mockResolvedValue({}) },
          };
          return cb(tx);
        }
        return [];
      });
      mockPrisma.tontineMember.findUnique.mockResolvedValue({
        ...mockActiveTontine.members[0],
        isPaid: true,
        tontine: mockActiveTontine,
      });

      const result = await tontinesService.pay('tontine-1', 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockNotifications.notifyWalletDebit).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('devrait lever BadRequestException si tontine non ACTIVE', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue({
        ...mockTontine,
        status: TontineStatus.PENDING,
      });

      await expect(
        tontinesService.pay('tontine-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever ForbiddenException si non membre', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue({
        ...mockActiveTontine,
        members: [],
      });

      await expect(
        tontinesService.pay('tontine-1', 'outsider'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever BadRequestException si déjà payé ce cycle', async () => {
      const alreadyPaidTontine = {
        ...mockActiveTontine,
        members: mockActiveTontine.members.map((m) =>
          m.userId === 'user-1' ? { ...m, isPaid: true } : m,
        ),
      };
      mockPrisma.tontine.findUnique.mockResolvedValue(alreadyPaidTontine);

      await expect(
        tontinesService.pay('tontine-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si solde insuffisant', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue(mockActiveTontine);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        walletBalance: 100,
      });

      await expect(
        tontinesService.pay('tontine-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMyTontines()', () => {
    it('devrait retourner tontines créées et rejointes', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        [mockTontine],
        [{ ...mockTontine, id: 'tontine-2' }],
      ]);

      const result = await tontinesService.findMyTontines('user-1');

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('joined');
      expect(Array.isArray(result.created)).toBe(true);
      expect(Array.isArray(result.joined)).toBe(true);
    });
  });

  describe('findOne()', () => {
    it('devrait retourner la tontine avec ses membres', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue({
        ...mockActiveTontine,
        creator: { id: 'user-1', fullname: 'User 1', avatarUrl: null },
      });

      const result = await tontinesService.findOne('tontine-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('tontine-1');
    });

    it('devrait lever NotFoundException si tontine inexistante', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue(null);

      await expect(
        tontinesService.findOne('ghost-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus()', () => {
    it('devrait mettre à jour le statut', async () => {
      mockPrisma.tontine.findUnique.mockResolvedValue(mockTontine);
      mockPrisma.tontine.update.mockResolvedValue({
        ...mockTontine,
        status: TontineStatus.ACTIVE,
      });

      const result = await tontinesService.updateStatus(
        'tontine-1',
        TontineStatus.ACTIVE,
      );

      expect(result.status).toBe(TontineStatus.ACTIVE);
    });
  });
});
