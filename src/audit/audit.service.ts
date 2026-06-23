import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  payload?: Prisma.InputJsonValue;
}

export interface AuditFilters {
  actorId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

const MAX_RESULTS = 200;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: AuditFilters = {}) {
    const createdAt =
      filters.from || filters.to
        ? {
            ...(filters.from && { gte: new Date(filters.from) }),
            ...(filters.to && { lte: new Date(filters.to) }),
          }
        : undefined;

    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.actorId && { actorId: filters.actorId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(createdAt && { createdAt }),
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_RESULTS,
    });
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException(`Audit log ${id} not found`);
    return log;
  }

  record(input: RecordAuditInput) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        ...(input.payload !== undefined && { payload: input.payload }),
      },
    });
  }
}
