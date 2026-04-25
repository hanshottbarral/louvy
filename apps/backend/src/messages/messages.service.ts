import { Injectable } from '@nestjs/common';
import { MessageType } from '@louvy/shared';
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

  async findBySchedule(scheduleId: string) {
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

  async create(dto: CreateMessageDto, userId: string) {
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
}

