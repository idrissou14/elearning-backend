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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CertificateService } from './certificate.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

@ApiTags('certificates')
@Controller('certificate')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get()
  @ApiOkResponse({ description: 'List of certificates' })
  findAll(@Query('enrollmentId') enrollmentId?: string) {
    return this.certificateService.findAll({ enrollmentId });
  }

  @Get('verify/:token')
  @ApiOperation({ summary: 'Publicly verify a certificate by its token' })
  @ApiOkResponse({ description: 'Certificate is valid' })
  @ApiNotFoundResponse({ description: 'Invalid certificate token' })
  verify(@Param('token') token: string) {
    return this.certificateService.verify(token);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Certificate found' })
  @ApiNotFoundResponse({ description: 'Certificate not found' })
  findOne(@Param('id') id: string) {
    return this.certificateService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Certificate issued' })
  @ApiNotFoundResponse({ description: 'Enrollment not found' })
  create(@Body() dto: CreateCertificateDto) {
    return this.certificateService.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Certificate updated' })
  @ApiNotFoundResponse({ description: 'Certificate not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCertificateDto) {
    return this.certificateService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Certificate deleted' })
  @ApiNotFoundResponse({ description: 'Certificate not found' })
  remove(@Param('id') id: string) {
    return this.certificateService.remove(id);
  }
}
