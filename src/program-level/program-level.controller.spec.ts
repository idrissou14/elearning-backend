import { Test, TestingModule } from '@nestjs/testing';
import { ProgramLevelController } from './program-level.controller';
import { ProgramLevelService } from './program-level.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ProgramLevelController', () => {
  let controller: ProgramLevelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramLevelController],
      providers: [{ provide: ProgramLevelService, useValue: mockService }],
    }).compile();

    controller = module.get<ProgramLevelController>(ProgramLevelController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with the programId filter', () => {
    const list = [{ id: '1', levelName: 'L1' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll('p1')).toBe(list);
    expect(mockService.findAll).toHaveBeenCalledWith({ programId: 'p1' });
  });

  it('delegates create to the service', () => {
    const dto = { programId: 'p1', levelName: 'L1', levelOrder: 1 };
    const created = { id: '1', ...dto };
    mockService.create.mockReturnValue(created);

    expect(controller.create(dto)).toBe(created);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update to the service', () => {
    const dto = { levelOrder: 2 };
    mockService.update.mockReturnValue({ id: '1', ...dto });

    controller.update('1', dto);
    expect(mockService.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', () => {
    controller.remove('1');
    expect(mockService.remove).toHaveBeenCalledWith('1');
  });
});
