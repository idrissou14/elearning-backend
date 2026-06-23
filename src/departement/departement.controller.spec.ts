import { Test, TestingModule } from '@nestjs/testing';
import { DepartementController } from './departement.controller';
import { DepartementService } from './departement.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DepartementController', () => {
  let controller: DepartementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartementController],
      providers: [{ provide: DepartementService, useValue: mockService }],
    }).compile();

    controller = module.get<DepartementController>(DepartementController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll to the service', () => {
    const list = [{ id: '1', name: 'GI' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll()).toBe(list);
    expect(mockService.findAll).toHaveBeenCalled();
  });

  it('delegates create to the service', () => {
    const dto = { name: 'Génie Informatique', code: 'GI' };
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
