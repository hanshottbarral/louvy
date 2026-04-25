import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppRole, AuthTokens } from '@louvy/shared';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private static readonly tokenExpiresIn = (
    value: string,
  ): NonNullable<Parameters<JwtService['signAsync']>[1]>['expiresIn'] =>
    value as NonNullable<Parameters<JwtService['signAsync']>[1]>['expiresIn'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role as Role,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, this.toAppRole(user.role), user.name);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  private get accessTokenExpiresIn() {
    return AuthService.tokenExpiresIn(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m');
  }

  private get refreshTokenExpiresIn() {
    return AuthService.tokenExpiresIn(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d');
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, this.toAppRole(user.role), user.name);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: AppRole,
    name: string,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, role, name };
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'access-secret';
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'refresh-secret';
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: this.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: this.refreshTokenExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  private sanitizeUser(user: { id: string; name: string; email: string; role: Role | AppRole }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role === 'ADMIN' ? AppRole.ADMIN : AppRole.MUSICIAN,
    };
  }

  private toAppRole(role: Role): AppRole {
    return role === Role.ADMIN ? AppRole.ADMIN : AppRole.MUSICIAN;
  }
}
