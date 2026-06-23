import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProgressStatus = 'locked' | 'in_progress' | 'completed';

@Schema({ _id: false })
export class AttemptAnswer {
  @Prop({ required: true }) questionId: string;
  @Prop({ type: Object }) selected?: unknown;
  @Prop() text?: string;
  @Prop() correct?: boolean;
  @Prop() pointsEarned?: number;
  @Prop() grading?: string;
}
const AttemptAnswerSchema = SchemaFactory.createForClass(AttemptAnswer);

@Schema({ _id: false })
export class Attempt {
  @Prop({ required: true }) attemptNumber: number;
  @Prop() score?: number;
  @Prop() startedAt?: Date;
  @Prop() submittedAt?: Date;
  @Prop({ type: [AttemptAnswerSchema], default: [] }) answers: AttemptAnswer[];
}
const AttemptSchema = SchemaFactory.createForClass(Attempt);

@Schema({ _id: false })
export class LessonProgress {
  @Prop({ required: true }) lessonId: string;
  @Prop() type?: string;
  @Prop({ enum: ['locked', 'in_progress', 'completed'], default: 'locked' })
  status: ProgressStatus;
  @Prop({ default: 0 }) lastPositionSeconds: number;
  @Prop({ default: 0 }) timeSpentSeconds: number;
  @Prop() completedAt?: Date;
  @Prop({ type: [AttemptSchema], default: [] }) attempts: Attempt[];
}
const LessonProgressSchema = SchemaFactory.createForClass(LessonProgress);

@Schema({ _id: false })
export class ModuleProgress {
  @Prop({ required: true }) moduleId: string;
  @Prop({ enum: ['locked', 'in_progress', 'completed'], default: 'locked' })
  status: ProgressStatus;
  @Prop() completedAt?: Date;
  @Prop({ type: [LessonProgressSchema], default: [] }) lessons: LessonProgress[];
}
const ModuleProgressSchema = SchemaFactory.createForClass(ModuleProgress);

export type LearnerProgressDocument = HydratedDocument<LearnerProgress>;

@Schema({ collection: 'learner_progress', timestamps: true })
export class LearnerProgress {
  /** REF-03: UUID → users.id. */
  @Prop({ required: true }) userId: string;

  /** REF-04: UUID → course_content._id (= CourseInstance.contentRef). */
  @Prop({ required: true }) courseId: string;

  /** REF-05: UUID → class_groups.id. */
  @Prop({ required: true }) classGroupId: string;

  @Prop({ type: [ModuleProgressSchema], default: [] }) modules: ModuleProgress[];
  @Prop() lastActivity?: Date;
}

export const LearnerProgressSchema = SchemaFactory.createForClass(LearnerProgress);

// One progress document per user × course.
LearnerProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
