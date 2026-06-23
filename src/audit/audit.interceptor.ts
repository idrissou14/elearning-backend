import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { Prisma } from '../../generated/prisma/client';
import { AuditService } from './audit.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SENSITIVE_KEYS = ['password', 'passwordHash', 'refreshToken', 'token'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    if (!MUTATING_METHODS.has(request.method)) return next.handle();

    return next.handle().pipe(
      tap((response) => {
        // Fire-and-forget: a logging failure must never break the request.
        void this.record(request, response).catch((err) =>
          this.logger.error(`Failed to write audit log: ${err.message}`),
        );
      }),
    );
  }

  private record(request: Request, response: unknown) {
    const user = request.user as { id?: string; email?: string } | undefined;
    const resourceType = this.resourceTypeFrom(request);
    const resourceId = this.resourceIdFrom(request, response);

    return this.auditService.record({
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      action: `${request.method} ${request.route?.path ?? request.path}`,
      resourceType,
      resourceId,
      ipAddress: request.ip ?? null,
      userAgent: request.get('user-agent') ?? null,
      payload: this.sanitize(request.body),
    });
  }

  private resourceTypeFrom(request: Request): string | null {
    const path = request.route?.path ?? request.path;
    const segments = path.split('?')[0].split('/').filter(Boolean);
    return segments[0] ?? null;
  }

  private resourceIdFrom(request: Request, response: unknown): string | null {
    const fromResponse =
      response && typeof response === 'object' && 'id' in response
        ? (response as { id?: unknown }).id
        : undefined;
    const id = fromResponse ?? request.params?.id;
    return typeof id === 'string' ? id : null;
  }

  private sanitize(body: unknown): Prisma.InputJsonValue | undefined {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
    const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    if (Object.keys(clone).length === 0) return undefined;
    for (const key of SENSITIVE_KEYS) {
      if (key in clone) clone[key] = '[REDACTED]';
    }
    return clone as Prisma.InputJsonValue;
  }
}
