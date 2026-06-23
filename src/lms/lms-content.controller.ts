import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCourseContentDto } from './dto/create-course-content.dto';
import { LmsContentService } from './lms-content.service';

@ApiTags('course-content')
@Controller('cours-instance/:id/content')
export class LmsContentController {
  constructor(private readonly lmsContentService: LmsContentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create/publish the LMS content of a course instance (SAGA-01)' })
  @ApiCreatedResponse({ description: 'Course content created and linked' })
  @ApiNotFoundResponse({ description: 'Course instance not found' })
  create(@Param('id') courseInstanceId: string, @Body() dto: CreateCourseContentDto) {
    return this.lmsContentService.createContent(courseInstanceId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read merged course content + learner progress' })
  @ApiOkResponse({ description: 'Metadata + content + progress' })
  @ApiForbiddenResponse({ description: 'User not enrolled in this class group' })
  @ApiNotFoundResponse({ description: 'Course instance or content not found' })
  getContent(
    @Param('id') courseInstanceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.lmsContentService.getContentForUser(courseInstanceId, userId);
  }
}
