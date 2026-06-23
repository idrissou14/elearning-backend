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
import { ClassStatus } from '../../generated/prisma/enums';
import { ClassGroupService } from './class-group.service';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';

@ApiTags('class-groups')
@Controller('class-group')
export class ClassGroupController {
  constructor(private readonly classGroupService: ClassGroupService) {}

  @Get()
  @ApiOkResponse({ description: 'List of class groups' })
  findAll(
    @Query('programLevelId') programLevelId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('status') status?: ClassStatus,
  ) {
    return this.classGroupService.findAll({ programLevelId, academicYear, status });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Class group found' })
  @ApiNotFoundResponse({ description: 'Class group not found' })
  findOne(@Param('id') id: string) {
    return this.classGroupService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Class group created' })
  @ApiNotFoundResponse({ description: 'Program level not found' })
  create(@Body() dto: CreateClassGroupDto) {
    return this.classGroupService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Class group updated' })
  @ApiNotFoundResponse({ description: 'Class group or program level not found' })
  update(@Param('id') id: string, @Body() dto: UpdateClassGroupDto) {
    return this.classGroupService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Class group deleted' })
  @ApiNotFoundResponse({ description: 'Class group not found' })
  remove(@Param('id') id: string) {
    return this.classGroupService.remove(id);
  }
}
