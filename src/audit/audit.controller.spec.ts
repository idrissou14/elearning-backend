import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
};

describe('AuditController', () => {
  let controller: AuditController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: mockService }],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with filters', () => {
    const list = [{ id: '1' }];
    mockService.findAll.mockReturnValue(list);

    expect(
      controller.findAll('a1', 'POST /user', 'user', '2026-01-01', '2026-12-31'),
    ).toBe(list);
    expect(mockService.findAll).toHaveBeenCalledWith({
      actorId: 'a1',
      action: 'POST /user',
      resourceType: 'user',
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  it('delegates findOne to the service', () => {
    const log = { id: '1' };
    mockService.findOne.mockReturnValue(log);

    expect(controller.findOne('1')).toBe(log);
    expect(mockService.findOne).toHaveBeenCalledWith('1');
  });
});
