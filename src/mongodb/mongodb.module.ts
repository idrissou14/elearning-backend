import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ActivityLog,
  ActivityLogSchema,
} from './schemas/activity-log.schema';
import {
  CourseContent,
  CourseContentSchema,
} from './schemas/course-content.schema';
import {
  ForumThread,
  ForumThreadSchema,
} from './schemas/forum-thread.schema';
import {
  LearnerProgress,
  LearnerProgressSchema,
} from './schemas/learner-progress.schema';
import { Quiz, QuizSchema } from './schemas/quiz.schema';

const FEATURES = MongooseModule.forFeature([
  { name: CourseContent.name, schema: CourseContentSchema },
  { name: Quiz.name, schema: QuizSchema },
  { name: LearnerProgress.name, schema: LearnerProgressSchema },
  { name: ForumThread.name, schema: ForumThreadSchema },
  { name: ActivityLog.name, schema: ActivityLogSchema },
]);

@Module({
  imports: [FEATURES],
  // Re-export so any module importing MongodbModule can inject the models.
  exports: [FEATURES],
})
export class MongodbModule {}
