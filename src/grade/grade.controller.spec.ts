import { Test, TestingModule } from '@nestjs/testing';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('GradeController', () => {
  let controller: GradeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GradeController],
      providers: [{ provide: GradeService, useValue: mockService }],
    }).compile();

    controller = module.get<GradeController>(GradeController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with filters', () => {
    const list = [{ id: '1' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll('e1', 'v1')).toBe(list);
    expect(mockService.findAll).toHaveBeenCalledWith({
      enrollmentId: 'e1',
      evaluationId: 'v1',
    });
  });

  it('delegates create to the service', () => {
    const dto = { enrollmentId: 'e1', evaluationId: 'v1', score: 15 };
    const created = { id: '1', ...dto };
    mockService.create.mockReturnValue(created);

    expect(controller.create(dto)).toBe(created);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update to the service', () => {
    const dto = { score: 17 };
    mockService.update.mockReturnValue({ id: '1', ...dto });

    controller.update('1', dto);
    expect(mockService.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', () => {
    controller.remove('1');
    expect(mockService.remove).toHaveBeenCalledWith('1');
  });
});
