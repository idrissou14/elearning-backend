import { Test, TestingModule } from '@nestjs/testing';
import { CoursInstanceController } from './cours-instance.controller';
import { CoursInstanceService } from './cours-instance.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CoursInstanceController', () => {
  let controller: CoursInstanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursInstanceController],
      providers: [{ provide: CoursInstanceService, useValue: mockService }],
    }).compile();

    controller = module.get<CoursInstanceController>(CoursInstanceController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with filters', () => {
    const list = [{ id: '1' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll('c1', 'g1', '2025-2026')).toBe(list);
    expect(mockService.findAll).toHaveBeenCalledWith({
      curriculumCourseId: 'c1',
      classGroupId: 'g1',
      academicYear: '2025-2026',
    });
  });

  it('delegates create to the service', () => {
    const dto = {
      curriculumCourseId: 'c1',
      classGroupId: 'g1',
      academicYear: '2025-2026',
    };
    const created = { id: '1', ...dto };
    mockService.create.mockReturnValue(created);

    expect(controller.create(dto)).toBe(created);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update to the service', () => {
    const dto = { contentRef: 'ref123' };
    mockService.update.mockReturnValue({ id: '1', ...dto });

    controller.update('1', dto);
    expect(mockService.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', () => {
    controller.remove('1');
    expect(mockService.remove).toHaveBeenCalledWith('1');
  });
});
