import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateSongDto, ReorderSongsDto } from './dto/create-song.dto';

@Injectable()
export class SongsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreateSongDto) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: dto.scheduleId },
      include: { songs: true },
    });
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const song = await this.prisma.song.create({
      data: {
        scheduleId: dto.scheduleId,
        name: dto.name,
        key: dto.key,
        bpm: dto.bpm,
        youtubeUrl: dto.youtubeUrl,
        position: schedule.songs.length,
      },
    });

    this.realtimeGateway.broadcastScheduleUpdate(dto.scheduleId, 'song-created', song);
    return song;
  }

  async reorder(scheduleId: string, dto: ReorderSongsDto) {
    await Promise.all(
      dto.songIds.map((songId, index) =>
        this.prisma.song.update({
          where: { id: songId },
          data: { position: index },
        }),
      ),
    );

    const songs = await this.prisma.song.findMany({
      where: { scheduleId },
      orderBy: { position: 'asc' },
    });
    this.realtimeGateway.broadcastScheduleUpdate(scheduleId, 'songs-reordered', songs);
    return songs;
  }

  async remove(id: string) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) {
      throw new NotFoundException('Song not found');
    }

    await this.prisma.song.delete({ where: { id } });
    this.realtimeGateway.broadcastScheduleUpdate(song.scheduleId, 'song-deleted', { id });
    return { success: true };
  }
}

