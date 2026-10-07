import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityAction, ActivityEntityType } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../websocket/realtime.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const authorSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly activity: ActivityService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(taskId: string, userId: string) {
    await this.access.getWorkspaceIdForTask(taskId).then((ws) =>
      this.access.requireMembership(ws, userId),
    );

    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: authorSelect } },
    });
  }

  async create(taskId: string, userId: string, dto: CreateCommentDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, boardId: true, title: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const workspaceId = await this.access.getWorkspaceIdForTask(taskId);
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireCanMutate(access);

    const comment = await this.prisma.comment.create({
      data: {
        taskId,
        authorId: userId,
        content: dto.content.trim(),
      },
      include: { author: { select: authorSelect } },
    });

    await this.activity.record({
      workspaceId,
      actorId: userId,
      entityType: ActivityEntityType.COMMENT,
      entityId: comment.id,
      action: ActivityAction.ADDED,
      metadata: { taskTitle: task.title },
    });

    this.realtime.emitToBoard(task.boardId, 'comment.created', {
      taskId,
      comment,
    });

    return comment;
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { task: { select: { boardId: true } } },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const workspaceId = await this.access.getWorkspaceIdForTask(comment.taskId);
    await this.access.requireMembership(workspaceId, userId);

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content.trim() },
      include: { author: { select: authorSelect } },
    });

    this.realtime.emitToBoard(comment.task.boardId, 'comment.updated', {
      taskId: comment.taskId,
      comment: updated,
    });

    return updated;
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { task: { select: { boardId: true } } },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const workspaceId = await this.access.getWorkspaceIdForTask(comment.taskId);
    await this.access.requireMembership(workspaceId, userId);

    await this.prisma.comment.delete({ where: { id: commentId } });

    this.realtime.emitToBoard(comment.task.boardId, 'comment.deleted', {
      taskId: comment.taskId,
      commentId,
    });

    return { success: true };
  }
}
