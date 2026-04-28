import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AppRole } from '@korus/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':scheduleId')
  findBySchedule(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: { id: string; role: AppRole },
  ) {
    return this.messagesService.findBySchedule(scheduleId, user.id, user.role);
  }

  @Post()
  create(@Body() dto: CreateMessageDto, @CurrentUser() user: { id: string; role: AppRole }) {
    return this.messagesService.create(dto, user.id, user.role);
  }
}
