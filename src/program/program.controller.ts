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
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProgramService } from './program.service';

@ApiTags('programs')
@Roles(Role.ADMIN)
@Controller('program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Get()
  @ApiOkResponse({ description: 'List of programs' })
  findAll(@Query('departmentId') departmentId?: string) {
    return this.programService.findAll({ departmentId });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Program found' })
  @ApiNotFoundResponse({ description: 'Program not found' })
  findOne(@Param('id') id: string) {
    return this.programService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Program created' })
  @ApiNotFoundResponse({ description: 'Department not found' })
  create(@Body() dto: CreateProgramDto) {
    return this.programService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Program updated' })
  @ApiNotFoundResponse({ description: 'Program or department not found' })
  update(@Param('id') id: string, @Body() dto: UpdateProgramDto) {
    return this.programService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Program deleted' })
  @ApiNotFoundResponse({ description: 'Program not found' })
  remove(@Param('id') id: string) {
    return this.programService.remove(id);
  }
}
