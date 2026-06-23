import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

const mockAuditService = { record: jest.fn() };

function createContext(
  request: Record<string, unknown>,
  type = 'http',
): ExecutionContext {
  return {
    getType: () => type,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function createHandler(value: unknown): CallHandler {
  return { handle: () => of(value) } as CallHandler;
}

function baseRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    route: { path: '/user' },
    path: '/user',
    body: {},
    params: {},
    ip: '127.0.0.1',
    user: { id: 'u1', email: 'a@b.com' },
    get: (h: string) => (h === 'user-agent' ? 'jest-agent' : undefined),
    ...overrides,
  };
}

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    interceptor = new AuditInterceptor(mockAuditService as unknown as AuditService);
    jest.clearAllMocks();
    mockAuditService.record.mockResolvedValue({ id: 'log1' });
  });

  it('does not record GET requests', async () => {
    const ctx = createContext(baseRequest({ method: 'GET' }));
    await firstValueFrom(interceptor.intercept(ctx, createHandler({ id: 'x' })));

    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it('does not record non-http contexts', async () => {
    const ctx = createContext(baseRequest(), 'rpc');
    await firstValueFrom(interceptor.intercept(ctx, createHandler({ id: 'x' })));

    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it('records a mutating request with actor, resource and metadata', async () => {
    const ctx = createContext(
      baseRequest({ method: 'POST', body: { name: 'John' } }),
    );
    await firstValueFrom(interceptor.intercept(ctx, createHandler({ id: 'c1' })));

    expect(mockAuditService.record).toHaveBeenCalledWith({
      actorId: 'u1',
      actorEmail: 'a@b.com',
      action: 'POST /user',
      resourceType: 'user',
      resourceId: 'c1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest-agent',
      payload: { name: 'John' },
    });
  });

  it('redacts sensitive fields in the payload', async () => {
    const ctx = createContext(
      baseRequest({ body: { email: 'a@b.com', password: 'secret' } }),
    );
    await firstValueFrom(interceptor.intercept(ctx, createHandler(null)));

    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { email: 'a@b.com', password: '[REDACTED]' },
      }),
    );
  });

  it('falls back to params.id for the resource id and null actor when anonymous', async () => {
    const ctx = createContext(
      baseRequest({
        method: 'DELETE',
        route: { path: '/user/:id' },
        params: { id: 'u9' },
        user: undefined,
      }),
    );
    await firstValueFrom(interceptor.intercept(ctx, createHandler(undefined)));

    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        actorEmail: null,
        action: 'DELETE /user/:id',
        resourceType: 'user',
        resourceId: 'u9',
      }),
    );
  });

  it('omits the payload for an empty body', async () => {
    const ctx = createContext(baseRequest({ body: {} }));
    await firstValueFrom(interceptor.intercept(ctx, createHandler({ id: 'c1' })));

    const arg = mockAuditService.record.mock.calls[0][0];
    expect(arg.payload).toBeUndefined();
  });

  it('does not throw if recording fails', async () => {
    mockAuditService.record.mockRejectedValue(new Error('db down'));
    const ctx = createContext(baseRequest());

    await expect(
      firstValueFrom(interceptor.intercept(ctx, createHandler({ id: 'c1' }))),
    ).resolves.toEqual({ id: 'c1' });
  });
});
