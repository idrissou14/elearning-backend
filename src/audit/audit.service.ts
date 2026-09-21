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

export interface SanitizedAuditLog {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
}

const MAX_RESULTS = 200;

function sanitizePayload(
  payload: Prisma.JsonValue | null,
): Prisma.JsonValue | null {
  if (payload === null || payload === undefined) return null;
  if (typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) return payload.map(sanitizePayload);
  const sanitized: Record<string, Prisma.JsonValue> = {};
  for (const [key, value] of Object.entries(
    payload as Record<string, unknown>,
  )) {
    if (value !== null && typeof value === 'object' && 'constructor' in value) {
      const constructorName = (value as { constructor?: { name?: string } })
        .constructor?.name;
      if (
        constructorName === 'JsonNull' ||
        constructorName === 'DbNull' ||
        constructorName === 'AnyNull'
      ) {
        continue;
      }
    }
    sanitized[key] = sanitizePayload(value as Prisma.JsonValue);
  }
  return sanitized;
}

function sanitizeLog(log: {
  payload?: Prisma.JsonValue | null;
  [key: string]: unknown;
}): SanitizedAuditLog {
  return {
    ...log,
    payload: sanitizePayload(log.payload ?? null),
  } as SanitizedAuditLog;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: AuditFilters = {}): Promise<SanitizedAuditLog[]> {
    const createdAt =
      filters.from || filters.to
        ? {
            ...(filters.from && { gte: new Date(filters.from) }),
            ...(filters.to && { lte: new Date(filters.to) }),
          }
        : undefined;

    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...(filters.actorId && { actorId: filters.actorId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(createdAt && { createdAt }),
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_RESULTS,
    });

    return logs.map(sanitizeLog);
  }

  async findOne(id: string): Promise<SanitizedAuditLog> {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException(`Audit log ${id} not found`);
    return sanitizeLog(log);
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
