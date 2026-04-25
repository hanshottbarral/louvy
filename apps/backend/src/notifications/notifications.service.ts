import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async notifyMembersScheduled(
    scheduleId: string,
    members: Array<{ userId: string; user?: { name: string } }>,
  ) {
    await Promise.all(
      members.map((member) =>
        this.createAndEmit(member.userId, {
          title: 'Nova escala',
          body: `Voce foi adicionado a uma nova escala (${scheduleId}).`,
          type: NotificationType.SCHEDULE_ASSIGNED,
        }),
      ),
    );
  }

  async notifyStatusChanged(scheduleId: string, memberName: string, status: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { createdBy: true },
    });
    if (!schedule) {
      return;
    }

    await this.createAndEmit(schedule.createdById, {
      title: 'Status atualizado',
      body: `${memberName} atualizou a presenca para ${status}.`,
      type: NotificationType.STATUS_CHANGED,
    });
  }

  async notifyNewMessage(scheduleId: string, senderId: string) {
    const recipients = await this.prisma.scheduleMember.findMany({
      where: {
        scheduleId,
        userId: { not: senderId },
      },
      select: { userId: true },
    });

    await Promise.all(
      recipients.map((recipient) =>
        this.createAndEmit(recipient.userId, {
          title: 'Nova mensagem',
          body: `Nova mensagem no chat da escala ${scheduleId}.`,
          type: NotificationType.NEW_MESSAGE,
        }),
      ),
    );
  }

  findForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  private async createAndEmit(
    userId: string,
    payload: { title: string; body: string; type: NotificationType },
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.type,
      },
    });
    this.realtimeGateway.broadcastNotification(userId, notification);
    return notification;
  }
}

