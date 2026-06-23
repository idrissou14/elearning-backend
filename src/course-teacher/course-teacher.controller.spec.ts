import { Test, TestingModule } from '@nestjs/testing';
import { CourseTeacherController } from './course-teacher.controller';

describe('CourseTeacherController', () => {
  let controller: CourseTeacherController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseTeacherController],
    }).compile();

    controller = module.get<CourseTeacherController>(CourseTeacherController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
