import { Test, TestingModule } from '@nestjs/testing';
import { ClassStatus } from '../../generated/prisma/enums';
import { ClassGroupController } from './class-group.controller';
import { ClassGroupService } from './class-group.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ClassGroupController', () => {
  let controller: ClassGroupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassGroupController],
      providers: [{ provide: ClassGroupService, useValue: mockService }],
    }).compile();

    controller = module.get<ClassGroupController>(ClassGroupController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with filters', () => {
    const list = [{ id: '1', name: 'Groupe A' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll('pl1', '2025-2026', ClassStatus.ACTIVE)).toBe(list);
    expect(mockService.findAll).toHaveBeenCalledWith({
      programLevelId: 'pl1',
      academicYear: '2025-2026',
      status: ClassStatus.ACTIVE,
    });
  });

  it('delegates create to the service', () => {
    const dto = {
      programLevelId: 'pl1',
      name: 'Groupe A',
      academicYear: '2025-2026',
    };
    const created = { id: '1', ...dto };
    mockService.create.mockReturnValue(created);

    expect(controller.create(dto)).toBe(created);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update to the service', () => {
    const dto = { status: ClassStatus.ARCHIVED };
    mockService.update.mockReturnValue({ id: '1', ...dto });

    controller.update('1', dto);
    expect(mockService.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', () => {
    controller.remove('1');
    expect(mockService.remove).toHaveBeenCalledWith('1');
  });
});
