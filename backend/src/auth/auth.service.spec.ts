import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto: RegisterDto = {
      fullName: 'Jean Kouassi',
      email: 'jean@picpec.com',
      password: 'Password123!',
    };

    it('doit lever ConflictException si email déjà utilisé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: dto.email });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('doit créer un utilisateur et retourner les tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        fullname: dto.fullName,
        role: Role.USER,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.register(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullname: dto.fullName,
            email: dto.email,
            role: Role.USER,
          }),
        }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: 'user-1',
        email: dto.email,
        fullName: dto.fullName,
        role: Role.USER,
      });
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      email: 'user@picpec.com',
      password: 'Password123!',
    };

    it('doit lever UnauthorizedException si utilisateur inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('doit lever UnauthorizedException si mot de passe invalide', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: dto.email,
        isActive: true,
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('doit retourner les tokens si identifiants valides', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        role: Role.USER,
        isActive: true,
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(dto.email);
    });
  });

  describe('logout', () => {
    it('doit révoquer le refresh token', async () => {
      mockPrisma.user.update.mockResolvedValue({});
      const result = await service.logout('user-1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
        },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('refreshToken', () => {
    it('doit retourner les tokens avec un refresh token valide', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-id-1',
        email: 'test@picpec.com',
        role: Role.USER,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-1',
        email: 'test@picpec.com',
        role: Role.USER,
        isActive: true,
        refreshTokenHash: 'hashed',
        refreshTokenExpiresAt: new Date(Date.now() + 3600000),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });
});
