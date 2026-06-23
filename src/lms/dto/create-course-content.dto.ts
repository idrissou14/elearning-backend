import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const LESSON_TYPES = ['video', 'markdown', 'pdf', 'quiz', 'assignment', 'scorm'];
const UNLOCK_MODES = ['sequential', 'date', 'free'];

class LessonVideoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() hlsManifestPath?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() signedUrlTtl?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() thumbnail?: string;
}

class LessonFileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() s3Path?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sizeBytes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
}

class DripDto {
  @ApiPropertyOptional({ enum: UNLOCK_MODES, default: 'free' })
  @IsOptional()
  @IsIn(UNLOCK_MODES)
  unlockMode?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Date) unlockDate?: Date;
  @ApiPropertyOptional() @IsOptional() @IsString() requiredPreviousModule?: string;
}

class LessonDto {
  @ApiProperty() @IsString() id: string;

  @ApiProperty({ enum: LESSON_TYPES })
  @IsIn(LESSON_TYPES)
  type: string;

  @ApiProperty() @IsString() @MinLength(1) title: string;
  @ApiProperty() @IsInt() @Min(0) order: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() durationSeconds?: number;

  @ApiPropertyOptional({ type: LessonVideoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LessonVideoDto)
  video?: LessonVideoDto;

  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quizRef?: string;

  @ApiPropertyOptional({ type: LessonFileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LessonFileDto)
  file?: LessonFileDto;
}

class ModuleDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsString() @MinLength(1) title: string;
  @ApiProperty() @IsInt() @Min(0) order: number;

  @ApiPropertyOptional({ type: DripDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DripDto)
  drip?: DripDto;

  @ApiPropertyOptional({ type: [LessonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonDto)
  lessons?: LessonDto[];
}

export class CreateCourseContentDto {
  @ApiProperty({ example: 'Introduction à l’algorithmique' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ type: [ModuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleDto)
  modules?: ModuleDto[];
}

// Re-exported for typing helpers if needed elsewhere.
export { ModuleDto, LessonDto };
