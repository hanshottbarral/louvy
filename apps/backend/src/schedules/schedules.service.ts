import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppRole, MemberStatus } from '@louvy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto, UpdateScheduleMemberStatusDto } from './dto/update-schedule.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateScheduleDto, userId: string) {
    const schedule = await this.prisma.schedule.create({
      data: {
        title: dto.title,
        date: new Date(dto.date),
        time: dto.time,
        eventType: dto.eventType,
        notes: dto.notes,
        createdById: userId,
        members: {
          create: dto.members.map((member) => ({
            userId: member.userId,
            role: member.role,
            status: member.status,
          })),
        },
      },
      include: this.scheduleInclude,
    });

    await this.notificationsService.notifyMembersScheduled(schedule.id, schedule.members);
    this.realtimeGateway.broadcastScheduleUpdate(schedule.id, 'created', schedule);
    return schedule;
  }

  async findAll(userId: string, role: AppRole) {
    const where =
      role === AppRole.ADMIN
        ? {}
        : {
            members: {
              some: {
                userId,
              },
            },
          };

    return this.prisma.schedule.findMany({
      where,
      include: this.scheduleInclude,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
  }

  async findOne(id: string, userId: string, role: AppRole) {
    await this.assertScheduleAccess(id, userId, role);

    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: this.scheduleInclude,
    });
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async update(id: string, dto: UpdateScheduleDto) {
    await this.assertScheduleExists(id);

    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: {
        title: dto.title,
        date: dto.date ? new Date(dto.date) : undefined,
        time: dto.time,
        eventType: dto.eventType,
        notes: dto.notes,
        members: dto.members
          ? {
              deleteMany: {},
              create: dto.members.map((member) => ({
                userId: member.userId,
                role: member.role,
                status: member.status,
              })),
            }
          : undefined,
      },
      include: this.scheduleInclude,
    });

    this.realtimeGateway.broadcastScheduleUpdate(id, 'updated', schedule);
    return schedule;
  }

  async updateMemberStatus(scheduleId: string, dto: UpdateScheduleMemberStatusDto, currentUserId: string) {
    const member = await this.prisma.scheduleMember.findUnique({
      where: { id: dto.memberId },
      include: { schedule: true },
    });
    if (!member || member.scheduleId !== scheduleId) {
      throw new NotFoundException('Schedule member not found');
    }
    if (member.userId !== currentUserId) {
      throw new ForbiddenException('You can only update your own status');
    }

    const updatedMember = await this.prisma.scheduleMember.update({
      where: { id: dto.memberId },
      data: { status: dto.status ?? MemberStatus.PENDING },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.notificationsService.notifyStatusChanged(member.scheduleId, updatedMember.user.name, updatedMember.status);
    this.realtimeGateway.broadcastScheduleUpdate(member.scheduleId, 'member-status', updatedMember);
    return updatedMember;
  }

  async remove(id: string) {
    await this.assertScheduleExists(id);
    await this.prisma.schedule.delete({ where: { id } });
    this.realtimeGateway.broadcastScheduleUpdate(id, 'deleted', { id });
    return { success: true };
  }

  private async assertScheduleExists(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }
  }

  private async assertScheduleAccess(id: string, userId: string, role: AppRole) {
    if (role === AppRole.ADMIN) {
      await this.assertScheduleExists(id);
      return;
    }

    const membership = await this.prisma.scheduleMember.findFirst({
      where: {
        scheduleId: id,
        userId,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this schedule');
    }
  }

  private readonly scheduleInclude = {
    createdBy: {
      select: { id: true, name: true, email: true, role: true },
    },
    members: {
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' as const },
    },
    songs: {
      orderBy: { position: 'asc' as const },
    },
  };
}
