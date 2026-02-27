import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserData } from '../auth/auth.types';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PurchaseProductDto } from './dto/purchase-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { Role } from '@prisma/client';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Créer un produit' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 201, description: 'Produit créé' })
  create(
    @UploadedFile() imageFile: Express.Multer.File | undefined,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.create(user.id, dto, imageFile);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Liste des catégories' })
  @ApiResponse({ status: 200, description: 'Liste des catégories' })
  getCategories() {
    return this.productsService.getCategories();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Lister les produits avec filtres (public, approuvés uniquement)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des produits' })
  findAll(
    @Query() dto: GetProductsDto,
    @CurrentUser() user: CurrentUserData | null,
  ) {
    return this.productsService.findAll(dto, false, user?.id ?? null);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @Get('admin')
  @ApiOperation({ summary: 'Lister tous les produits (admin)' })
  @ApiResponse({ status: 200, description: 'Liste paginée de tous les produits' })
  findAllAdmin(@Query() dto: GetProductsDto) {
    return this.productsService.findAll(dto, true, null);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('purchases/:purchaseId/status')
  @ApiOperation({ summary: 'Mettre à jour le statut de livraison (vendeur)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  updateDeliveryStatus(
    @Param('purchaseId') purchaseId: string,
    @Body() dto: UpdateDeliveryStatusDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.updateDeliveryStatus(user.id, purchaseId, {
      status: dto.status,
      note: dto.note,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('purchases/my')
  @ApiOperation({ summary: 'Mes achats et ventes' })
  @ApiResponse({ status: 200, description: 'Liste des achats et ventes' })
  getMyPurchases(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getMyPurchases(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un produit' })
  @ApiResponse({ status: 200, description: 'Produit trouvé' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approuver un produit (admin)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.approveProduct(id, user.id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rejeter un produit (admin)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.rejectProduct(id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un produit (owner uniquement)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un produit (owner ou ADMIN)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.remove(id, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/purchase')
  @ApiOperation({ summary: 'Acheter un produit' })
  @ApiResponse({ status: 200, description: 'Achat effectué' })
  @ApiResponse({ status: 400, description: 'Stock insuffisant ou solde insuffisant' })
  purchase(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: PurchaseProductDto,
  ) {
    return this.productsService.purchase(id, user.id, dto);
  }
}
