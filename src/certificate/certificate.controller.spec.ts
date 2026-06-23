import { Test, TestingModule } from '@nestjs/testing';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  verify: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CertificateController', () => {
  let controller: CertificateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificateController],
      providers: [{ provide: CertificateService, useValue: mockService }],
    }).compile();

    controller = module.get<CertificateController>(CertificateController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll with the enrollmentId filter', () => {
    const list = [{ id: '1' }];
    mockService.findAll.mockReturnValue(list);

    expect(controller.findAll('e1')).toBe(list);
    expect(mockService.findAll).toHaveBeenCalledWith({ enrollmentId: 'e1' });
  });

  it('delegates verify to the service', () => {
    const cert = { id: '1', verifyToken: 'tok' };
    mockService.verify.mockReturnValue(cert);

    expect(controller.verify('tok')).toBe(cert);
    expect(mockService.verify).toHaveBeenCalledWith('tok');
  });

  it('delegates create to the service', () => {
    const dto = { enrollmentId: 'e1', s3Path: 'path.pdf' };
    const created = { id: '1', ...dto };
    mockService.create.mockReturnValue(created);

    expect(controller.create(dto)).toBe(created);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update to the service', () => {
    const dto = { s3Path: 'new.pdf' };
    mockService.update.mockReturnValue({ id: '1', ...dto });

    controller.update('1', dto);
    expect(mockService.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', () => {
    controller.remove('1');
    expect(mockService.remove).toHaveBeenCalledWith('1');
  });
});
