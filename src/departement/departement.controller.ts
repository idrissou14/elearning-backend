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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { DepartementService } from './departement.service';
import { CreateDepartementDto } from './dto/create-departement.dto';
import { UpdateDepartementDto } from './dto/update-departement.dto';

@ApiTags('departements')
@Roles(Role.ADMIN)
@Controller('departement')
export class DepartementController {
  constructor(private readonly departementService: DepartementService) {}

  @Get()
  @ApiOkResponse({ description: 'List of departments' })
  findAll() {
    return this.departementService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Department found' })
  @ApiNotFoundResponse({ description: 'Department not found' })
  findOne(@Param('id') id: string) {
    return this.departementService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Department created' })
  create(@Body() dto: CreateDepartementDto) {
    return this.departementService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Department updated' })
  @ApiNotFoundResponse({ description: 'Department not found' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartementDto) {
    return this.departementService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Department deleted' })
  @ApiNotFoundResponse({ description: 'Department not found' })
  remove(@Param('id') id: string) {
    return this.departementService.remove(id);
  }
}
