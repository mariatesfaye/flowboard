import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../auth/types';
import { UpdateBoardDto } from './dto/update-board.dto';
import { BoardsService } from './boards.service';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.boards.getById(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boards.update(id, user.id, dto);
  }

  @Get(':id/tasks')
  tasks(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.boards.listTasks(id, user.id);
  }
}
