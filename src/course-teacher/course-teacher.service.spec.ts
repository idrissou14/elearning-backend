import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../generated/prisma/enums';
import { CoursInstanceService } from '../cours-instance/cours-instance.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { CourseTeacherService } from './course-teacher.service';

const mockPrisma = {
  courseTeacher: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockCoursInstanceService = { findOne: jest.fn() };
const mockUserService = { findOne: jest.fn() };

describe('CourseTeacherService', () => {
  let service: CourseTeacherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseTeacherService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CoursInstanceService, useValue: mockCoursInstanceService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<CourseTeacherService>(CourseTeacherService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns the assignment when found', async () => {
      const assignment = { id: '1', courseInstanceId: 'ci1', teacherId: 't1' };
      mockPrisma.courseTeacher.findUnique.mockResolvedValue(assignment);

      await expect(service.findOne('1')).resolves.toEqual(assignment);
    });

    it('throws NotFoundException when missing', async () => {
      mockPrisma.courseTeacher.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { courseInstanceId: 'ci1', teacherId: 't1' };

    it('assigns a teacher when course instance exists, user is a teacher and not assigned yet', async () => {
      mockCoursInstanceService.findOne.mockResolvedValue({ id: 'ci1' });
      mockUserService.findOne.mockResolvedValue({ id: 't1', role: Role.TEACHER });
      mockPrisma.courseTeacher.findFirst.mockResolvedValue(null);
      mockPrisma.courseTeacher.create.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).resolves.toEqual({ id: '1', ...dto });
      expect(mockCoursInstanceService.findOne).toHaveBeenCalledWith('ci1');
      expect(mockUserService.findOne).toHaveBeenCalledWith('t1');
      expect(mockPrisma.courseTeacher.create).toHaveBeenCalledWith({ data: dto });
    });

    it('propagates NotFoundException when the course instance is missing', async () => {
      mockCoursInstanceService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockUserService.findOne).not.toHaveBeenCalled();
      expect(mockPrisma.courseTeacher.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the user is not a teacher', async () => {
      mockCoursInstanceService.findOne.mockResolvedValue({ id: 'ci1' });
      mockUserService.findOne.mockResolvedValue({ id: 't1', role: Role.STUDENT });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.courseTeacher.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the teacher is already assigned', async () => {
      mockCoursInstanceService.findOne.mockResolvedValue({ id: 'ci1' });
      mockUserService.findOne.mockResolvedValue({ id: 't1', role: Role.TEACHER });
      mockPrisma.courseTeacher.findFirst.mockResolvedValue({ id: '99' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.courseTeacher.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the role of an existing assignment', async () => {
      mockPrisma.courseTeacher.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.courseTeacher.update.mockResolvedValue({ id: '1', role: 'ASSISTANT' });

      await service.update('1', { role: undefined });
      expect(mockPrisma.courseTeacher.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { role: undefined },
      });
    });

    it('throws NotFoundException when the assignment does not exist', async () => {
      mockPrisma.courseTeacher.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
      expect(mockPrisma.courseTeacher.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing assignment', async () => {
      mockPrisma.courseTeacher.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.courseTeacher.delete.mockResolvedValue({ id: '1' });

      await service.remove('1');
      expect(mockPrisma.courseTeacher.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a missing assignment', async () => {
      mockPrisma.courseTeacher.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.courseTeacher.delete).not.toHaveBeenCalled();
    });
  });
});
