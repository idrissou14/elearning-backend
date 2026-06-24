import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit-logs')
@Roles(Role.ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (read-only, max 200, newest first)' })
  @ApiOkResponse({ description: 'List of audit logs' })
  findAll(
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditService.findAll({ actorId, action, resourceType, from, to });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Audit log found' })
  @ApiNotFoundResponse({ description: 'Audit log not found' })
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
