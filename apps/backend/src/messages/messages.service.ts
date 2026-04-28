import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppRole, MessageType } from '@korus/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findBySchedule(scheduleId: string, userId: string, role: AppRole) {
    await this.assertScheduleAccess(scheduleId, userId, role);

    return this.prisma.message.findMany({
      where: { scheduleId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateMessageDto, userId: string, role: AppRole) {
    await this.assertScheduleAccess(dto.scheduleId, userId, role);

    const message = await this.prisma.message.create({
      data: {
        scheduleId: dto.scheduleId,
        content: dto.type === MessageType.TEXT ? dto.content : null,
        type: dto.type,
        audioUrl: dto.type === MessageType.AUDIO ? dto.audioUrl : null,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    await this.notificationsService.notifyNewMessage(dto.scheduleId, userId);
    this.realtimeGateway.broadcastMessage(dto.scheduleId, message);
    return message;
  }

  private async assertScheduleAccess(scheduleId: string, userId: string, role: AppRole) {
    if (role === AppRole.ADMIN) {
      const schedule = await this.prisma.schedule.findUnique({
        where: { id: scheduleId },
        select: { id: true },
      });

      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      return;
    }

    const membership = await this.prisma.scheduleMember.findFirst({
      where: {
        scheduleId,
        userId,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this schedule chat');
    }
  }
}
