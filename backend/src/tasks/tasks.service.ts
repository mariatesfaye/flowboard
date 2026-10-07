import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  Prisma,
} from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../websocket/realtime.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
  labels: { include: { label: true } },
  column: { select: { id: true, name: true } },
  board: { select: { id: true, projectId: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly activity: ActivityService,
    private readonly realtime: RealtimeService,
  ) {}

  async getById(taskId: string, userId: string) {
    const workspaceId = await this.access.getWorkspaceIdForTask(taskId);
    await this.access.requireMembership(workspaceId, userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        ...taskInclude,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async create(boardId: string, userId: string, dto: CreateTaskDto) {
    const workspaceId = await this.access.getWorkspaceIdForBoard(boardId);
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireCanMutate(access);

    const column = await this.prisma.boardColumn.findFirst({
      where: { id: dto.columnId, boardId },
    });
    if (!column) {
      throw new BadRequestException('Column does not belong to this board');
    }

    const maxPos = await this.prisma.task.aggregate({
      where: { columnId: dto.columnId },
      _max: { position: true },
    });
    const position = dto.position ?? (maxPos._max.position ?? -1) + 1;

    if (dto.assigneeId) {
      await this.access.assertUserInWorkspace(workspaceId, dto.assigneeId);
    }
    if (dto.labelIds?.length) {
      await this.assertLabelsInWorkspace(workspaceId, dto.labelIds);
    }

    const task = await this.prisma.task.create({
      data: {
        boardId,
        columnId: dto.columnId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        priority: dto.priority,
        position,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        labels: dto.labelIds?.length
          ? {
              create: dto.labelIds.map((labelId) => ({ labelId })),
            }
          : undefined,
      },
      include: taskInclude,
    });

    await this.activity.record({
      workspaceId,
      actorId: userId,
      entityType: ActivityEntityType.TASK,
      entityId: task.id,
      action: ActivityAction.CREATED,
      metadata: { title: task.title, column: column.name },
    });

    this.realtime.emitToBoard(boardId, 'task.created', { task });

    return task;
  }

  async update(taskId: string, userId: string, dto: UpdateTaskDto) {
    const existing = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { column: true, board: true },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const workspaceId = await this.access.getWorkspaceIdForBoard(existing.boardId);
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireCanMutate(access);

    const moved =
      dto.columnId !== undefined && dto.columnId !== existing.columnId;
    const reordered = dto.position !== undefined;

    if (moved || reordered) {
      await this.reorderTask(existing, dto.columnId ?? existing.columnId, dto.position);
    }

    if (dto.assigneeId) {
      await this.access.assertUserInWorkspace(workspaceId, dto.assigneeId);
    }
    if (dto.labelIds) {
      await this.assertLabelsInWorkspace(workspaceId, dto.labelIds);
      await this.prisma.taskLabel.deleteMany({ where: { taskId } });
      if (dto.labelIds.length) {
        await this.prisma.taskLabel.createMany({
          data: dto.labelIds.map((labelId) => ({ taskId, labelId })),
        });
      }
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        priority: dto.priority,
        assigneeId: dto.assigneeId === null ? null : dto.assigneeId,
        dueDate:
          dto.dueDate === null
            ? null
            : dto.dueDate
              ? new Date(dto.dueDate)
              : undefined,
      },
      include: taskInclude,
    });

    const reorderedOnly = !moved && reordered;

    if (moved || reorderedOnly) {
      const toColumn = await this.prisma.boardColumn.findUnique({
        where: { id: task.columnId },
      });
      await this.activity.record({
        workspaceId,
        actorId: userId,
        entityType: ActivityEntityType.TASK,
        entityId: task.id,
        action: ActivityAction.MOVED,
        metadata: {
          title: task.title,
          fromColumn: existing.column.name,
          toColumn: toColumn?.name,
        },
      });
      this.realtime.emitToBoard(existing.boardId, 'task.moved', { task });
      return task;
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
      await this.activity.record({
        workspaceId,
        actorId: userId,
        entityType: ActivityEntityType.TASK,
        entityId: task.id,
        action: ActivityAction.ASSIGNED,
        metadata: { title: task.title, assigneeId: dto.assigneeId },
      });
      this.realtime.emitToBoard(existing.boardId, 'task.updated', { task });
    } else {
      await this.activity.record({
        workspaceId,
        actorId: userId,
        entityType: ActivityEntityType.TASK,
        entityId: task.id,
        action: ActivityAction.UPDATED,
        metadata: { title: task.title },
      });
      this.realtime.emitToBoard(existing.boardId, 'task.updated', { task });
    }

    return task;
  }

  private async reorderTask(
    existing: { id: string; boardId: string; columnId: string; position: number },
    targetColumnId: string,
    targetPosition?: number,
  ) {
    const targetColumn = await this.prisma.boardColumn.findFirst({
      where: { id: targetColumnId, boardId: existing.boardId },
    });
    if (!targetColumn) {
      throw new BadRequestException('Invalid column');
    }

    await this.prisma.$transaction(async (tx) => {
      const sameColumn = targetColumnId === existing.columnId;

      if (sameColumn && targetPosition !== undefined) {
        await this.shiftWithinColumn(
          tx,
          targetColumnId,
          existing.id,
          existing.position,
          targetPosition,
        );
        await tx.task.update({
          where: { id: existing.id },
          data: { position: targetPosition },
        });
        return;
      }

      if (!sameColumn) {
        await tx.task.updateMany({
          where: {
            columnId: existing.columnId,
            position: { gt: existing.position },
          },
          data: { position: { decrement: 1 } },
        });

        const maxInTarget = await tx.task.aggregate({
          where: { columnId: targetColumnId },
          _max: { position: true },
        });
        const newPos =
          targetPosition ??
          (maxInTarget._max.position ?? -1) + 1;

        await tx.task.updateMany({
          where: {
            columnId: targetColumnId,
            position: { gte: newPos },
          },
          data: { position: { increment: 1 } },
        });

        await tx.task.update({
          where: { id: existing.id },
          data: { columnId: targetColumnId, position: newPos },
        });
      }
    });
  }

  private async shiftWithinColumn(
    tx: Prisma.TransactionClient,
    columnId: string,
    taskId: string,
    from: number,
    to: number,
  ) {
    if (from === to) return;

    if (from < to) {
      await tx.task.updateMany({
        where: {
          columnId,
          id: { not: taskId },
          position: { gt: from, lte: to },
        },
        data: { position: { decrement: 1 } },
      });
    } else {
      await tx.task.updateMany({
        where: {
          columnId,
          id: { not: taskId },
          position: { gte: to, lt: from },
        },
        data: { position: { increment: 1 } },
      });
    }
  }

  async delete(taskId: string, userId: string) {
    const existing = await this.prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const workspaceId = await this.access.getWorkspaceIdForBoard(existing.boardId);
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireCanMutate(access);

    await this.prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: taskId } });
      await tx.task.updateMany({
        where: {
          columnId: existing.columnId,
          position: { gt: existing.position },
        },
        data: { position: { decrement: 1 } },
      });
    });

    await this.activity.record({
      workspaceId,
      actorId: userId,
      entityType: ActivityEntityType.TASK,
      entityId: taskId,
      action: ActivityAction.DELETED,
      metadata: { title: existing.title },
    });

    this.realtime.emitToBoard(existing.boardId, 'task.deleted', { taskId });

    return { success: true };
  }

  private async assertLabelsInWorkspace(workspaceId: string, labelIds: string[]) {
    const count = await this.prisma.label.count({
      where: { workspaceId, id: { in: labelIds } },
    });
    if (count !== labelIds.length) {
      throw new BadRequestException('One or more labels are invalid for this workspace');
    }
  }
}
