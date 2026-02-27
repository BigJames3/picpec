import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PurchaseProductDto } from './dto/purchase-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../posts/cloudinary.service';
import { Decimal } from '@prisma/client/runtime/library';
import { paginate } from '../common/dto/pagination.dto';

const PLATFORM_COMMISSION_RATE = 0.03; // 3%

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    userId: string,
    dto: CreateProductDto,
    imageFile?: Express.Multer.File,
  ) {
    const seller = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { country: true, city: true, whatsapp: true },
    });

    let imageUrl = dto.imageUrl ?? null;
    if (imageFile && this.cloudinaryService.isConfigured()) {
      const uploaded = await this.cloudinaryService.uploadImage(imageFile);
      imageUrl = uploaded.secure_url;
    }

    return this.prisma.product.create({
      data: {
        sellerId: userId,
        name: dto.name,
        description: dto.description,
        price: new Decimal(dto.price),
        stock: dto.stock,
        categoryId: dto.categoryId || null,
        imageUrl,
        country: seller?.country ?? null,
        city: seller?.city ?? null,
        whatsapp: seller?.whatsapp ?? null,
        isApproved: false,
      },
    });
  }

  async findAll(
    dto: GetProductsDto,
    isAdmin = false,
    userId: string | null = null,
  ) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, categoryId, priceMin, priceMax, country, city } = dto;

    let userCountry: string | null = null;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { country: true },
      });
      userCountry = user?.country ?? null;
    }

    const where: Prisma.ProductWhereInput = {
      ...(!isAdmin && ({ isApproved: true } as Prisma.ProductWhereInput)),
      ...(dto.status && { status: dto.status }),
      ...(!dto.status && !isAdmin && {
        status: { not: ProductStatus.OUT_OF_STOCK },
      }),
      ...(country
        ? { country }
        : userCountry
          ? {
              OR: [
                { country: userCountry },
                { country: null },
              ],
            }
          : {}),
      ...(city
        ? { city: { contains: city, mode: 'insensitive' } }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(priceMin !== undefined || priceMax !== undefined) && {
        price: {
          ...(priceMin !== undefined && { gte: new Decimal(priceMin) }),
          ...(priceMax !== undefined && { lte: new Decimal(priceMax) }),
        },
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { country: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          seller: {
            select: {
              id: true,
              fullname: true,
              country: true,
              city: true,
              whatsapp: true,
            },
          },
          category: {
            select: { id: true, name: true, emoji: true, slug: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const result = paginate(data, total, page, limit);
    return {
      ...result,
      meta: { ...result.meta, hasMore: result.meta.hasNextPage },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            fullname: true,
            country: true,
            city: true,
            whatsapp: true,
            phone: true,
          },
        },
        category: {
          select: { id: true, name: true, emoji: true, slug: true },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async purchase(productId: string, userId: string, dto: PurchaseProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: { select: { id: true, fullname: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId === userId) {
      throw new BadRequestException('Cannot buy your own product');
    }
    if (product.stock < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available for purchase');
    }
    if (!(product as { isApproved?: boolean }).isApproved) {
      throw new BadRequestException('Product is not approved for purchase');
    }

    const totalAmount = Number(product.price) * dto.quantity;
    const commissionAmount = totalAmount * PLATFORM_COMMISSION_RATE;
    const sellerAmount = totalAmount - commissionAmount;

    const buyer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    if (!buyer || Number(buyer.walletBalance) < totalAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    const decimalTotal = new Decimal(totalAmount);
    const decimalCommission = new Decimal(commissionAmount);
    const decimalSellerAmount = new Decimal(sellerAmount);
    const reference = `PUR-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: decimalTotal } },
      }),
      this.prisma.user.update({
        where: { id: product.sellerId },
        data: { walletBalance: { increment: decimalSellerAmount } },
      }),
      this.prisma.product.update({
        where: { id: productId },
        data: {
          stock: { decrement: dto.quantity },
          status:
            product.stock - dto.quantity <= 0
              ? ProductStatus.OUT_OF_STOCK
              : ProductStatus.ACTIVE,
        },
      }),
      this.prisma.productPurchase.create({
        data: {
          productId,
          buyerId: userId,
          quantity: dto.quantity,
          totalAmount: decimalTotal,
          status: TransactionStatus.COMPLETED,
          shippingAddress: dto.shippingAddress ?? null,
        },
      }),
      this.prisma.transaction.create({
        data: {
          senderId: userId,
          receiverId: product.sellerId,
          amount: decimalTotal,
          type: TransactionType.PRODUCT_PURCHASE,
          status: TransactionStatus.COMPLETED,
          commission: decimalCommission,
          reference,
          metadata: { productId, quantity: dto.quantity },
        },
      }),
    ]);

    this.notifications
      .notifyMarketplacePurchase(
        userId,
        product.sellerId,
        product.name,
        totalAmount,
      )
      .catch(() => {});

    return this.findOne(productId);
  }

  async update(
    productId: string,
    dto: UpdateProductDto,
    userId: string,
    role?: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    const isAdmin = role && ['ADMIN', 'SUPER_ADMIN'].includes(role);
    const isSeller = product.sellerId === userId;
    if (!isSeller && !(isAdmin && dto.status !== undefined)) {
      throw new ForbiddenException(
        "Vous n'êtes pas le vendeur de ce produit",
      );
    }
    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = new Decimal(dto.price);
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.product.update({
      where: { id: productId },
      data,
    });
  }

  async remove(productId: string, userId: string, role: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    const isAdminOrAbove = ['ADMIN', 'SUPER_ADMIN'].includes(role);
    if (product.sellerId !== userId && !isAdminOrAbove) {
      throw new ForbiddenException('Action non autorisée');
    }

    await this.prisma.product.delete({ where: { id: productId } });
    return { message: 'Produit supprimé' };
  }

  async approveProduct(productId: string, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        isApproved: true,
        status: ProductStatus.ACTIVE,
        approvedAt: new Date(),
        approvedBy: adminId,
      } as Prisma.ProductUpdateInput,
    });
  }

  async rejectProduct(productId: string, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        isApproved: false,
        status: ProductStatus.INACTIVE,
        approvedAt: new Date(),
        approvedBy: adminId,
      } as Prisma.ProductUpdateInput,
    });
  }

  async getMyPurchases(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [purchasesData, purchasesTotal, salesData, salesTotal] =
      await Promise.all([
        this.prisma.productPurchase.findMany({
          where: { buyerId: userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                price: true,
                seller: {
                  select: {
                    id: true,
                    fullname: true,
                    whatsapp: true,
                    country: true,
                    city: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.productPurchase.count({ where: { buyerId: userId } }),
        this.prisma.productPurchase.findMany({
          where: { product: { sellerId: userId } },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                price: true,
              },
            },
            buyer: {
              select: {
                id: true,
                fullname: true,
                country: true,
                city: true,
              },
            },
          },
        }),
        this.prisma.productPurchase.count({
          where: { product: { sellerId: userId } },
        }),
      ]);

    const pPurchases = paginate(purchasesData, purchasesTotal, page, limit);
    const pSales = paginate(salesData, salesTotal, page, limit);
    return {
      purchases: {
        ...pPurchases,
        meta: { ...pPurchases.meta, hasMore: pPurchases.meta.hasNextPage },
      },
      sales: {
        ...pSales,
        meta: { ...pSales.meta, hasMore: pSales.meta.hasNextPage },
      },
    };
  }

  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updateDeliveryStatus(
    sellerId: string,
    purchaseId: string,
    dto: { status: string; note?: string },
  ) {
    const purchase = await this.prisma.productPurchase.findUnique({
      where: { id: purchaseId },
      include: { product: true },
    });

    if (!purchase) throw new NotFoundException('Commande introuvable');
    if (purchase.product.sellerId !== sellerId) {
      throw new ForbiddenException('Non autorisé');
    }

    const dateFields: Record<string, object> = {
      CONFIRMED: { confirmedAt: new Date() },
      SHIPPED: { shippedAt: new Date() },
      DELIVERED: { deliveredAt: new Date() },
    };

    return this.prisma.productPurchase.update({
      where: { id: purchaseId },
      data: {
        deliveryStatus: dto.status as any,
        sellerNote: dto.note,
        ...dateFields[dto.status],
      },
      include: {
        product: { select: { id: true, name: true } },
        buyer: { select: { id: true, fullname: true } },
      },
    });
  }
}
