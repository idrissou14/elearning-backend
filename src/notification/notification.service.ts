import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType =
  | 'GRADE_PUBLISHED'
  | 'GRADE_UPDATED'
  | 'ENROLLMENT_CONFIRMED'
  | 'CERTIFICATE_ISSUED'
  | 'COURSE_CONTENT_PUBLISHED';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: NotificationPayload) {
    return this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data ?? {},
        read: false,
      },
    });
  }

  async createBulk(payloads: NotificationPayload[]) {
    return this.prisma.notification.createMany({
      data: payloads.map((p) => ({
        userId: p.userId,
        type: p.type,
        title: p.title,
        message: p.message,
        data: p.data ?? {},
        read: false,
      })),
    });
  }

  async markAsRead(userId: string, notificationIds: string[]) {
    return this.prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId },
      data: { read: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async getUserNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(options?.unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
    });
  }

  // Convenience method for grade published notifications
  async notifyGradePublished(
    studentUserId: string,
    courseName: string,
    evaluationName: string,
    score: number,
    maxScore: number,
    gradeId: string,
  ) {
    const scoreOn20 = maxScore > 0 ? Math.round((score / maxScore) * 20 * 100) / 100 : 0;
    return this.create({
      userId: studentUserId,
      type: 'GRADE_PUBLISHED',
      title: `Nouvelle note : ${courseName}`,
      message: `Vous avez obtenu ${scoreOn20}/20 à l'évaluation « ${evaluationName} »`,
      data: { gradeId, courseName, evaluationName, score, maxScore, scoreOn20 },
    });
  }
}