import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [WorkspacesModule, ActivityModule, WebsocketModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
