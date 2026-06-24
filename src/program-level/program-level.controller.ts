import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProgramLevelDto } from './dto/create-program-level.dto';
import { UpdateProgramLevelDto } from './dto/update-program-level.dto';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProgramLevelService } from './program-level.service';

@ApiTags('program-levels')
@Roles(Role.ADMIN)
@Controller('program-level')
export class ProgramLevelController {
  constructor(private readonly programLevelService: ProgramLevelService) {}

  @Get()
  @ApiOkResponse({ description: 'List of program levels' })
  findAll(@Query('programId') programId?: string) {
    return this.programLevelService.findAll({ programId });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Program level found' })
  @ApiNotFoundResponse({ description: 'Program level not found' })
  findOne(@Param('id') id: string) {
    return this.programLevelService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Program level created' })
  @ApiNotFoundResponse({ description: 'Program not found' })
  create(@Body() dto: CreateProgramLevelDto) {
    return this.programLevelService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Program level updated' })
  @ApiNotFoundResponse({ description: 'Program level or program not found' })
  update(@Param('id') id: string, @Body() dto: UpdateProgramLevelDto) {
    return this.programLevelService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Program level deleted' })
  @ApiNotFoundResponse({ description: 'Program level not found' })
  remove(@Param('id') id: string) {
    return this.programLevelService.remove(id);
  }
}
