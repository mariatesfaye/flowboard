import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [WorkspacesModule, ActivityModule, WebsocketModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
