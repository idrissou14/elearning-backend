import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { HydratedDocument } from 'mongoose';

export type QuestionType = 'mcq' | 'free_text' | 'drag_drop' | 'code';
export type GradingMode = 'auto' | 'manual';

@Schema({ _id: false })
export class Choice {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) text: string;
  @Prop({ default: false }) correct: boolean;
}
const ChoiceSchema = SchemaFactory.createForClass(Choice);

@Schema({ _id: false })
export class Question {
  @Prop({ required: true }) id: string;

  @Prop({ required: true, enum: ['mcq', 'free_text', 'drag_drop', 'code'] })
  type: QuestionType;

  @Prop({ required: true }) points: number;
  @Prop() timerSeconds?: number;
  @Prop({ required: true }) prompt: string;
  @Prop({ type: [ChoiceSchema], default: [] }) choices: Choice[];
  @Prop() explanation?: string;

  @Prop({ enum: ['auto', 'manual'], default: 'auto' })
  grading: GradingMode;
}
const QuestionSchema = SchemaFactory.createForClass(Question);

export type QuizDocument = HydratedDocument<Quiz>;

@Schema({ collection: 'quizzes', timestamps: true })
export class Quiz {
  /**
   * RÈGLE 6: UUID String defined by the application (NOT an auto ObjectId),
   * because it is referenced from PostgreSQL (Evaluation.quizRef) and course_content lessons.
   */
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  /** REF-09 internal: UUID → course_content._id. */
  @Prop({ required: true, index: true }) courseId: string;

  @Prop({ required: true }) title: string;
  @Prop() timerSeconds?: number;
  @Prop({ default: 60 }) passingScore: number;
  @Prop({ default: 3 }) maxAttempts: number;
  @Prop({ type: [QuestionSchema], default: [] }) questions: Question[];
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
