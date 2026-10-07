import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type WorkspaceAccess = {
  workspaceId: string;
  role: WorkspaceRole;
  isOwner: boolean;
};

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceAccess> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, ownerId: true },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.ownerId === userId) {
      return { workspaceId, role: WorkspaceRole.OWNER, isOwner: true };
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return {
      workspaceId,
      role: member.role,
      isOwner: false,
    };
  }

  requireCanMutate(access: WorkspaceAccess) {
    if (access.role === WorkspaceRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot modify workspace data');
    }
  }

  requireOwnerOrAdmin(access: WorkspaceAccess) {
    if (access.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only the workspace owner can do this');
    }
  }

  async getWorkspaceIdForProject(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project.workspaceId;
  }

  async getWorkspaceIdForBoard(boardId: string): Promise<string> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { project: { select: { workspaceId: true } } },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board.project.workspaceId;
  }

  async assertUserInWorkspace(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    if (workspace.ownerId === userId) {
      return;
    }
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('User is not a member of this workspace');
    }
  }

  async getWorkspaceIdForTask(taskId: string): Promise<string> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { board: { select: { project: { select: { workspaceId: true } } } } },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task.board.project.workspaceId;
  }
}
