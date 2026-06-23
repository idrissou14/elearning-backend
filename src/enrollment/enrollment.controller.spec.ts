import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentStatus } from '../../generated/prisma/enums';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('EnrollmentController', () => {
  let controller: EnrollmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentController],
      providers: [{ provide: EnrollmentService, useValue: mockService }],
    }).compile();

    controller = module.get<EnrollmentController>(EnrollmentController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with filters', () => {
    const list = [{ id: '1' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll('u1', 'g1', '2025-2026', EnrollmentStatus.ACTIVE)).toBe(
      list,
    );
    expect(mockService.findAll).toHaveBeenCalledWith({
      userId: 'u1',
      classGroupId: 'g1',
      academicYear: '2025-2026',
      status: EnrollmentStatus.ACTIVE,
    });
  });

  it('delegates create to the service', () => {
    const dto = { userId: 'u1', classGroupId: 'g1', academicYear: '2025-2026' };
    const created = { id: '1', ...dto };
    mockService.create.mockReturnValue(created);

    expect(controller.create(dto)).toBe(created);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update to the service', () => {
    const dto = { status: EnrollmentStatus.WITHDRAWN };
    mockService.update.mockReturnValue({ id: '1', ...dto });

    controller.update('1', dto);
    expect(mockService.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', () => {
    controller.remove('1');
    expect(mockService.remove).toHaveBeenCalledWith('1');
  });
});
