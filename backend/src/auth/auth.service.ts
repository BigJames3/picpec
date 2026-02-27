import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './auth.types';
import { ReferralService } from '../referrals/referral.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly referralService: ReferralService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        fullname: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: Role.USER,
      },
    });

    if (dto.ref) {
      this.referralService.applyReferralOnSignup(user.id, dto.ref).catch(() => {});
    }

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        fullname: true,
        passwordHash: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        walletBalance: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash: _, ...userSafe } = user;
    return this.issueTokens(userSafe);
  }

  async refreshToken(token: string) {
    if (!token || !token.trim()) {
      throw new UnauthorizedException('Refresh token manquant');
    }
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (
      !user ||
      !user.isActive ||
      !user.refreshTokenHash ||
      !user.refreshTokenExpiresAt
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isExpired = user.refreshTokenExpiresAt.getTime() < Date.now();
    const validToken = await bcrypt.compare(token, user.refreshTokenHash);
    if (isExpired || !validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
    return { success: true };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    fullname: string;
    role: Role;
    avatarUrl?: string | null;
    walletBalance?: unknown;
    phone?: string | null;
    createdAt?: Date;
  }) {
    const accessTtl = this.config.get<number>('JWT_ACCESS_TTL', 900);
    const refreshTtl = this.config.get<number>('JWT_REFRESH_TTL', 604800);
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTtl,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshTtl,
    });

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: refreshHash,
        refreshTokenExpiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshExpiresIn: refreshTtl,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullname,
        role: user.role,
      },
    };
  }
}
