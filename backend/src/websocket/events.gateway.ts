import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthService } from './ws-auth.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly wsAuth: WsAuthService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const user = await this.wsAuth.authenticate(socket);
      socket.data.user = user;
    } catch {
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('board.join')
  async joinBoard(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { boardId: string },
  ) {
    const user = socket.data.user as { id: string } | undefined;
    if (!user) return { error: 'Unauthorized' };

    const workspaceId = await this.access.getWorkspaceIdForBoard(data.boardId);
    await this.access.requireMembership(workspaceId, user.id);

    await socket.join(`board:${data.boardId}`);
    return { joined: data.boardId };
  }

  @SubscribeMessage('board.leave')
  async leaveBoard(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { boardId: string },
  ) {
    await socket.leave(`board:${data.boardId}`);
    return { left: data.boardId };
  }
}
