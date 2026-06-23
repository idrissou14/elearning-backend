import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDepartementDto {
  @ApiProperty({ example: 'Génie Informatique' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'GI' })
  @IsOptional()
  @IsString()
  code?: string;
}
