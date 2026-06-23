import { PartialType } from '@nestjs/swagger';
import { CreateProgramLevelDto } from './create-program-level.dto';

export class UpdateProgramLevelDto extends PartialType(CreateProgramLevelDto) {}
