import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateProgramDto {
  @ApiProperty({ example: '3f1a8c2e-1d4b-4a6e-9c0f-7b2d5e8a1c3d' })
  @IsUUID()
  departmentId: string;

  @ApiProperty({ example: 'Licence Informatique' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'LIC-INFO' })
  @IsOptional()
  @IsString()
  code?: string;
}
