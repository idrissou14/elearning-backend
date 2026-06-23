import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationType } from '../../generated/prisma/enums';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('EvaluationController', () => {
  let controller: EvaluationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluationController],
      providers: [{ provide: EvaluationService, useValue: mockService }],
    }).compile();

    controller = module.get<EvaluationController>(EvaluationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with filters', () => {
    const list = [{ id: '1', name: 'CC1' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll('ci1', EvaluationType.EXAM)).toBe(list);
    expect(mockService.findAll).toHaveBeenCalledWith({
      courseInstanceId: 'ci1',
      type: EvaluationType.EXAM,
    });
  });

  it('delegates create to the service', () => {
    const dto = {
      courseInstanceId: 'ci1',
      type: EvaluationType.CC,
      name: 'Contrôle continu 1',
      weight: 0.3,
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
