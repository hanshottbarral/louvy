import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId as string | undefined;
    if (userId) {
      client.join(`user:${userId}`);
    }
  }

  handleDisconnect(_: Socket) {}

  @SubscribeMessage('schedule:join')
  handleJoinSchedule(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { scheduleId: string },
  ) {
    client.join(`schedule:${payload.scheduleId}`);
    return { joined: payload.scheduleId };
  }

  @SubscribeMessage('schedule:leave')
  handleLeaveSchedule(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { scheduleId: string },
  ) {
    client.leave(`schedule:${payload.scheduleId}`);
    return { left: payload.scheduleId };
  }

  @SubscribeMessage('user:typing')
  handleTyping(@MessageBody() payload: { scheduleId: string; userId: string; userName: string }) {
    this.server.to(`schedule:${payload.scheduleId}`).emit('user:typing', payload);
  }

  @SubscribeMessage('message:send')
  handleMessageSend(
    @MessageBody()
    payload: {
      scheduleId: string;
      id: string;
      content?: string;
      audioUrl?: string;
      type: string;
      createdAt: string;
      user: { id: string; name: string };
    },
  ) {
    this.server.to(`schedule:${payload.scheduleId}`).emit('message:receive', payload);
    return { delivered: true };
  }

  broadcastMessage(scheduleId: string, message: unknown) {
    this.server.to(`schedule:${scheduleId}`).emit('message:receive', message);
  }

  broadcastScheduleUpdate(scheduleId: string, action: string, payload: unknown) {
    this.server.to(`schedule:${scheduleId}`).emit('schedule:update', { action, payload });
  }

  broadcastNotification(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('notification:new', payload);
  }
}
