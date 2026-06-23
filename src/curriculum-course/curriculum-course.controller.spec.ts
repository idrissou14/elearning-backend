import { Test, TestingModule } from '@nestjs/testing';
import { Semester } from '../../generated/prisma/enums';
import { CurriculumCourseController } from './curriculum-course.controller';
import { CurriculumCourseService } from './curriculum-course.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CurriculumCourseController', () => {
  let controller: CurriculumCourseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurriculumCourseController],
      providers: [{ provide: CurriculumCourseService, useValue: mockService }],
    }).compile();

    controller = module.get<CurriculumCourseController>(CurriculumCourseController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with filters', () => {
    const list = [{ id: '1', name: 'Algo' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll('pl1', Semester.S1)).toBe(list);
    expect(mockService.findAll).toHaveBeenCalledWith({
      programLevelId: 'pl1',
      semester: Semester.S1,
    });
  });

  it('delegates create to the service', () => {
    const dto = {
      programLevelId: 'pl1',
      name: 'Algorithmique',
      semester: Semester.S1,
      credits: 6,
    };
    const created = { id: '1', ...dto };
    mockService.create.mockReturnValue(created);

    expect(controller.create(dto)).toBe(created);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update to the service', () => {
    const dto = { name: 'New name' };
    mockService.update.mockReturnValue({ id: '1', ...dto });

    controller.update('1', dto);
    expect(mockService.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', () => {
    controller.remove('1');
    expect(mockService.remove).toHaveBeenCalledWith('1');
  });
});
