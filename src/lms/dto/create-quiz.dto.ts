import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const QUESTION_TYPES = ['mcq', 'free_text', 'drag_drop', 'code'];
const GRADING_MODES = ['auto', 'manual'];

class ChoiceDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsString() @MinLength(1) text: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() correct?: boolean;
}

class QuestionDto {
  @ApiProperty() @IsString() id: string;

  @ApiProperty({ enum: QUESTION_TYPES })
  @IsIn(QUESTION_TYPES)
  type: string;

  @ApiProperty() @IsInt() @Min(0) points: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() timerSeconds?: number;
  @ApiProperty() @IsString() @MinLength(1) prompt: string;

  @ApiPropertyOptional({ type: [ChoiceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices?: ChoiceDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;

  @ApiPropertyOptional({ enum: GRADING_MODES, default: 'auto' })
  @IsOptional()
  @IsIn(GRADING_MODES)
  grading?: string;
}

export class CreateQuizDto {
  @ApiProperty({ example: 'Quiz chapitre 1' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({ description: 'Global timer in seconds (null = no limit)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  timerSeconds?: number;

  @ApiPropertyOptional({ default: 60, description: 'Passing score (%)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  passingScore?: number;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({ type: [QuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];
}

export { QuestionDto, ChoiceDto };
