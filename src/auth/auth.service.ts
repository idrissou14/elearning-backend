import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.userService.create(dto);
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(userId: string, sessionId: string, rawToken: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    const tokenMatch = await bcrypt.compare(rawToken, session.refreshTokenHash);
    if (!tokenMatch) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    const user = await this.userService.findOne(userId);
    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, sessionId },
        { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '7d' },
      ),
    ]);

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    await this.prisma.session.create({
      data: { id: sessionId, userId, refreshTokenHash: hashedRefresh, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
