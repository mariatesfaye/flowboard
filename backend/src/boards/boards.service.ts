import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { UpdateBoardDto } from './dto/update-board.dto';

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
  labels: { include: { label: true } },
} as const;

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async getById(boardId: string, userId: string) {
    const workspaceId = await this.access.getWorkspaceIdForBoard(boardId);
    await this.access.requireMembership(workspaceId, userId);

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: {
                ...taskInclude,
                _count: { select: { comments: true } },
              },
            },
          },
        },
        project: { select: { id: true, name: true, workspaceId: true } },
      },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board;
  }

  async update(boardId: string, userId: string, dto: UpdateBoardDto) {
    const workspaceId = await this.access.getWorkspaceIdForBoard(boardId);
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireCanMutate(access);

    return this.prisma.board.update({
      where: { id: boardId },
      data: { name: dto.name.trim() },
    });
  }

  async listTasks(boardId: string, userId: string) {
    const board = await this.getById(boardId, userId);
    return board.columns.flatMap((c) => c.tasks);
  }
}
