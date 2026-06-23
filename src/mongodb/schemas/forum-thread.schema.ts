import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class Reply {
  @Prop({ required: true }) id: string;
  /** REF-06: UUID → users.id. */
  @Prop({ required: true }) authorId: string;
  @Prop({ required: true }) body: string;
  @Prop({ default: 0 }) likes: number;
  @Prop({ default: () => new Date() }) createdAt: Date;
}
const ReplySchema = SchemaFactory.createForClass(Reply);

@Schema({ _id: false })
export class Post {
  @Prop({ required: true }) id: string;
  /** REF-06: UUID → users.id. */
  @Prop({ required: true }) authorId: string;
  @Prop({ required: true }) body: string;
  @Prop({ default: 0 }) likes: number;
  @Prop({ default: () => new Date() }) createdAt: Date;
  @Prop({ type: [ReplySchema], default: [] }) replies: Reply[];
}
const PostSchema = SchemaFactory.createForClass(Post);

export type ForumThreadDocument = HydratedDocument<ForumThread>;

@Schema({ collection: 'forum_threads', timestamps: true })
export class ForumThread {
  /** REF-07: UUID → class_groups.id (tenant isolation). */
  @Prop({ required: true, index: true }) classGroupId: string;

  /** REF-06: UUID → users.id. */
  @Prop({ required: true }) authorId: string;

  @Prop({ required: true }) title: string;
  @Prop({ default: false }) pinned: boolean;
  @Prop({ default: false }) solved: boolean;
  @Prop({ type: [PostSchema], default: [] }) posts: Post[];
}

export const ForumThreadSchema = SchemaFactory.createForClass(ForumThread);

// List threads of a class group, most recently updated first.
ForumThreadSchema.index({ classGroupId: 1, updatedAt: -1 });
