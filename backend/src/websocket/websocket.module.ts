import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { EventsGateway } from './events.gateway';
import { RealtimeService } from './realtime.service';
import { WsAuthService } from './ws-auth.service';

@Module({
  imports: [AuthModule, WorkspacesModule, JwtModule],
  providers: [EventsGateway, RealtimeService, WsAuthService],
  exports: [RealtimeService],
})
export class WebsocketModule {}
