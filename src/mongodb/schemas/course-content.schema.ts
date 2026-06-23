import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { HydratedDocument } from 'mongoose';

export type LessonType = 'video' | 'markdown' | 'pdf' | 'quiz' | 'assignment' | 'scorm';
export type DripUnlockMode = 'sequential' | 'date' | 'free';

@Schema({ _id: false })
export class LessonVideo {
  @Prop() hlsManifestPath?: string;
  @Prop() signedUrlTtl?: number;
  @Prop() thumbnail?: string;
}
const LessonVideoSchema = SchemaFactory.createForClass(LessonVideo);

@Schema({ _id: false })
export class LessonFile {
  @Prop() s3Path?: string;
  @Prop() sizeBytes?: number;
  @Prop() mimeType?: string;
}
const LessonFileSchema = SchemaFactory.createForClass(LessonFile);

@Schema({ _id: false })
export class Lesson {
  @Prop({ required: true }) id: string;

  @Prop({
    required: true,
    enum: ['video', 'markdown', 'pdf', 'quiz', 'assignment', 'scorm'],
  })
  type: LessonType;

  @Prop({ required: true }) title: string;
  @Prop({ required: true }) order: number;
  @Prop() durationSeconds?: number;
  @Prop({ type: LessonVideoSchema }) video?: LessonVideo;
  @Prop() content?: string;

  /** REF-09: UUID → quizzes._id (when type = quiz). */
  @Prop() quizRef?: string;

  @Prop({ type: LessonFileSchema }) file?: LessonFile;
}
const LessonSchema = SchemaFactory.createForClass(Lesson);

@Schema({ _id: false })
export class Drip {
  @Prop({ enum: ['sequential', 'date', 'free'], default: 'free' })
  unlockMode: DripUnlockMode;

  @Prop() unlockDate?: Date;
  @Prop() requiredPreviousModule?: string;
}
const DripSchema = SchemaFactory.createForClass(Drip);

@Schema({ _id: false })
export class CourseModule {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) order: number;
  @Prop({ type: DripSchema }) drip?: Drip;
  @Prop({ type: [LessonSchema], default: [] }) lessons: Lesson[];
}
const CourseModuleSchema = SchemaFactory.createForClass(CourseModule);

export type CourseContentDocument = HydratedDocument<CourseContent>;

@Schema({ collection: 'course_content', timestamps: true })
export class CourseContent {
  /**
   * RÈGLE 6: UUID String defined by the application (NOT an auto ObjectId),
   * because it is referenced from PostgreSQL (CourseInstance.contentRef).
   */
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ required: true }) title: string;
  @Prop() description?: string;
  @Prop({ default: 1 }) version: number;
  @Prop({ type: [CourseModuleSchema], default: [] }) modules: CourseModule[];
}

export const CourseContentSchema = SchemaFactory.createForClass(CourseContent);
