import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../auth/types';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post('boards/:boardId/tasks')
  create(
    @Param('boardId') boardId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(boardId, user.id, dto);
  }

  @Get('tasks/:id')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.tasks.getById(id, user.id);
  }

  @Patch('tasks/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(id, user.id, dto);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.tasks.delete(id, user.id);
  }
}
