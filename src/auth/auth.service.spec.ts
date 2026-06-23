jest.mock('../prisma/prisma.service');

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

const mockPrisma = {
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockUserService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findOne: jest.fn(),
};

const mockJwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
const mockConfig = { getOrThrow: jest.fn().mockReturnValue('test-secret') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwt.signAsync.mockResolvedValue('signed-token');
    mockConfig.getOrThrow.mockReturnValue('test-secret');
  });

  describe('login', () => {
    it('throws when user not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'password123' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws when password is wrong', async () => {
      mockUserService.findByEmail.mockResolvedValue({
        id: '1', passwordHash: await bcrypt.hash('correct', 10),
      });
      await expect(service.login({ email: 'x@x.com', password: 'wrongpass1' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockUserService.findByEmail.mockResolvedValue({
        id: '1', email: 'a@b.com', role: 'STUDENT', passwordHash: hash,
      });
      mockPrisma.session.create.mockResolvedValue({});
      const result = await service.login({ email: 'a@b.com', password: 'password123' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refresh', () => {
    it('throws when session not found', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);
      await expect(service.refresh('uid', 'sid', 'token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when session is expired', async () => {
      mockPrisma.session.findFirst.mockResolvedValue({
        id: 'sid',
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('uid', 'sid', 'token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when token hash does not match', async () => {
      mockPrisma.session.findFirst.mockResolvedValue({
        id: 'sid',
        refreshTokenHash: await bcrypt.hash('other-token', 10),
        expiresAt: new Date(Date.now() + 60000),
      });
      await expect(service.refresh('uid', 'sid', 'wrong-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the session', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });
      await service.logout('session-id');
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'session-id', revokedAt: null }),
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
