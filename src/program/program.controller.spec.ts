import { Test, TestingModule } from '@nestjs/testing';
import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ProgramController', () => {
  let controller: ProgramController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramController],
      providers: [{ provide: ProgramService, useValue: mockService }],
    }).compile();

    controller = module.get<ProgramController>(ProgramController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with the departmentId filter', () => {
    const list = [{ id: '1', name: 'Licence' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll('d1')).toBe(list);
    expect(mockService.findAll).toHaveBeenCalledWith({ departmentId: 'd1' });
  });

  it('delegates create to the service', () => {
    const dto = { departmentId: 'd1', name: 'Licence Info', code: 'LIC' };
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
