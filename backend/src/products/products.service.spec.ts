import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';

describe('ProductsService', () => {
  let productsService: ProductsService;

  const mockPrisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    productPurchase: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
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
    notifyMarketplacePurchase: jest.fn().mockResolvedValue(undefined),
  };

  const mockProduct = {
    id: 'product-1',
    sellerId: 'seller-1',
    name: 'Boubou traditionnel',
    description: 'Beau boubou fait main',
    price: 25000,
    stock: 10,
    status: ProductStatus.ACTIVE,
    images: [],
    seller: { id: 'seller-1', fullname: 'Seller' },
  };

  const mockBuyer = {
    id: 'buyer-1',
    walletBalance: 100000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    productsService = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it('devrait retourner une liste paginée', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await productsService.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(1);
    });

    it('devrait filtrer par recherche texte', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      await productsService.findAll({
        page: 1,
        limit: 10,
        search: 'boubou',
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('devrait filtrer par priceMin et priceMax', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      await productsService.findAll({
        page: 1,
        limit: 10,
        priceMin: 10000,
        priceMax: 50000,
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: expect.any(Object),
          }),
        }),
      );
    });

    it('devrait filtrer par categoryId', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      await productsService.findAll({
        page: 1,
        limit: 10,
        categoryId: 'cat-1',
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-1',
          }),
        }),
      );
    });

    it('devrait retourner uniquement status ACTIVE par défaut', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await productsService.findAll({ page: 1, limit: 10 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ProductStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('purchase()', () => {
    it('devrait exécuter les 5 opérations atomiques', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        seller: { id: 'seller-1', fullname: 'Seller' },
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockBuyer);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.product.update.mockResolvedValue(mockProduct);
      mockPrisma.productPurchase.create.mockResolvedValue({
        id: 'purchase-1',
      });
      mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-1' });
      mockPrisma.$transaction.mockImplementation((arg) =>
        Array.isArray(arg) ? Promise.all(arg) : Promise.resolve([]),
      );

      const result = await productsService.purchase(
        'product-1',
        'buyer-1',
        { quantity: 1 },
      );

      const txOperations = mockPrisma.$transaction.mock.calls[0][0];
      expect(txOperations).toHaveLength(5);
      expect(mockNotifications.notifyMarketplacePurchase).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('devrait lever BadRequestException si stock insuffisant', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        stock: 0,
        seller: { id: 'seller-1', fullname: 'Seller' },
      });

      await expect(
        productsService.purchase('product-1', 'buyer-1', { quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si solde insuffisant', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        seller: { id: 'seller-1', fullname: 'Seller' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'buyer-1',
        walletBalance: 100,
      });

      await expect(
        productsService.purchase('product-1', 'buyer-1', { quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si achat de son propre produit', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        sellerId: 'buyer-1',
        seller: { id: 'buyer-1', fullname: 'Buyer' },
      });

      await expect(
        productsService.purchase('product-1', 'buyer-1', { quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever NotFoundException si produit inexistant', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        productsService.purchase('ghost-id', 'buyer-1', { quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever BadRequestException si produit non ACTIVE', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.INACTIVE,
        seller: { id: 'seller-1', fullname: 'Seller' },
      });

      await expect(
        productsService.purchase('product-1', 'buyer-1', { quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait mettre status OUT_OF_STOCK si stock devient 0', async () => {
      const productStock1 = {
        ...mockProduct,
        stock: 1,
        seller: { id: 'seller-1', fullname: 'Seller' },
      };
      mockPrisma.product.findUnique
        .mockResolvedValueOnce(productStock1)
        .mockResolvedValueOnce(mockProduct);
      mockPrisma.user.findUnique.mockResolvedValue(mockBuyer);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.product.update.mockResolvedValue(mockProduct);
      mockPrisma.productPurchase.create.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation((arg) =>
        Array.isArray(arg) ? Promise.all(arg) : Promise.resolve([]),
      );

      await productsService.purchase('product-1', 'buyer-1', { quantity: 1 });

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ProductStatus.OUT_OF_STOCK,
          }),
        }),
      );
    });
  });

  describe('update()', () => {
    it('devrait modifier le produit si owner', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({
        ...mockProduct,
        name: 'Nouveau nom',
      });

      const result = await productsService.update(
        'product-1',
        { name: 'Nouveau nom' },
        'seller-1',
      );
      expect(result.name).toBe('Nouveau nom');
    });

    it('devrait lever ForbiddenException si non owner', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        productsService.update('product-1', { name: 'x' }, 'intruder'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever NotFoundException si produit inexistant', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        productsService.update('ghost', {}, 'seller-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('devrait supprimer le produit si owner', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      const result = await productsService.remove(
        'product-1',
        'seller-1',
        'USER',
      );
      expect(result).toHaveProperty('message');
    });

    it('devrait supprimer si ADMIN même non owner', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      const result = await productsService.remove(
        'product-1',
        'admin-id',
        'ADMIN',
      );
      expect(result).toHaveProperty('message');
    });

    it('devrait lever ForbiddenException si non owner et non ADMIN', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        productsService.remove('product-1', 'intruder', 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMyPurchases()', () => {
    it('devrait retourner achats et ventes', async () => {
      mockPrisma.productPurchase.findMany.mockResolvedValue([]);
      mockPrisma.productPurchase.count.mockResolvedValue(0);

      const result = await productsService.getMyPurchases(
        'user-1',
        1,
        10,
      );

      expect(result).toHaveProperty('purchases');
      expect(result).toHaveProperty('sales');
      expect(result.purchases).toHaveProperty('data');
      expect(result.sales).toHaveProperty('data');
    });
  });
});
