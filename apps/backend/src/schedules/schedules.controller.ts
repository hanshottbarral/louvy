import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AppRole } from '@korus/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto, UpdateScheduleMemberStatusDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Roles(AppRole.ADMIN)
  @Post()
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: { id: string }) {
    return this.schedulesService.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string; role: AppRole }) {
    return this.schedulesService.findAll(user.id, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string; role: AppRole }) {
    return this.schedulesService.findOne(id, user.id, user.role);
  }

  @Roles(AppRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedulesService.update(id, dto);
  }

  @Patch(':id/confirm')
  updateMemberStatus(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleMemberStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.schedulesService.updateMemberStatus(id, dto, user.id);
  }

  @Roles(AppRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }
}
