import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AppRole } from '@louvy/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSongDto, ReorderSongsDto } from './dto/create-song.dto';
import { SongsService } from './songs.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Roles(AppRole.ADMIN)
  @Post()
  create(@Body() dto: CreateSongDto) {
    return this.songsService.create(dto);
  }

  @Roles(AppRole.ADMIN)
  @Patch('schedule/:scheduleId/reorder')
  reorder(@Param('scheduleId') scheduleId: string, @Body() dto: ReorderSongsDto) {
    return this.songsService.reorder(scheduleId, dto);
  }

  @Roles(AppRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.songsService.remove(id);
  }
}

