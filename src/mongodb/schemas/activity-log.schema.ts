import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

@Schema({ collection: 'activity_logs', timestamps: false })
export class ActivityLog {
  /** REF-08: UUID → users.id. */
  @Prop({ required: true, index: true }) userId: string;

  /** UUID → course_content._id. */
  @Prop() courseId?: string;

  @Prop({ required: true }) event: string;

  @Prop({ type: Object }) payload?: Record<string, unknown>;

  @Prop() sessionId?: string;
  @Prop() device?: string;

  @Prop({ default: () => new Date() }) timestamp: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// TTL index — documents expire automatically after 90 days.
ActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
// User activity, most recent first.
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
