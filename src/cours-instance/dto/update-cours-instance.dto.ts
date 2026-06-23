import { PartialType } from '@nestjs/swagger';
import { CreateCoursInstanceDto } from './create-cours-instance.dto';

export class UpdateCoursInstanceDto extends PartialType(CreateCoursInstanceDto) {}
