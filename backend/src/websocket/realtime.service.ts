import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: EventsGateway) {}

  emitToBoard(boardId: string, event: string, payload: unknown) {
    this.gateway.server.to(`board:${boardId}`).emit(event, payload);
  }
}
