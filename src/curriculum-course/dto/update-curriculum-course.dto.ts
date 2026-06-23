import { PartialType } from '@nestjs/swagger';
import { CreateCurriculumCourseDto } from './create-curriculum-course.dto';

export class UpdateCurriculumCourseDto extends PartialType(CreateCurriculumCourseDto) {}
