import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../generated/prisma/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string; role?: Role } }>();
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true, deletedAt: true },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new ForbiddenException('INSUFFICIENT_ROLE');
    }

    if (!required.includes(user.role)) {
      throw new ForbiddenException('INSUFFICIENT_ROLE');
    }
    return true;
  }
}
