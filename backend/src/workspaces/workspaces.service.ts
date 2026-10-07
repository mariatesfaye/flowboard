import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { ActivityAction, ActivityEntityType } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { uniqueSlug } from '../common/utils/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceAccessService } from './workspace-access.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly activity: ActivityService,
  ) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });
    const owned = await this.prisma.workspace.findMany({
      where: { ownerId: userId },
    });

    const map = new Map<string, { workspace: typeof owned[0]; role: WorkspaceRole }>();
    for (const ws of owned) {
      map.set(ws.id, { workspace: ws, role: WorkspaceRole.OWNER });
    }
    for (const m of memberships) {
      if (!map.has(m.workspaceId)) {
        map.set(m.workspaceId, { workspace: m.workspace, role: m.role });
      }
    }

    return Array.from(map.values()).map(({ workspace, role }) => ({
      ...workspace,
      currentUserRole: role,
    }));
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const slug = await uniqueSlug(dto.name, async (s) => {
      const found = await this.prisma.workspace.findUnique({ where: { slug: s } });
      return !!found;
    });

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name.trim(),
        slug,
        ownerId: userId,
        members: {
          create: { userId, role: WorkspaceRole.OWNER },
        },
      },
    });

    await this.activity.record({
      workspaceId: workspace.id,
      actorId: userId,
      entityType: ActivityEntityType.WORKSPACE,
      entityId: workspace.id,
      action: ActivityAction.CREATED,
      metadata: { name: workspace.name },
    });

    return { ...workspace, currentUserRole: WorkspaceRole.OWNER };
  }

  async getById(workspaceId: string, userId: string) {
    const access = await this.access.requireMembership(workspaceId, userId);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        projects: {
          where: { status: 'ACTIVE' },
          orderBy: { updatedAt: 'desc' },
          include: {
            boards: { select: { id: true, name: true }, take: 1 },
          },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return { ...workspace, currentUserRole: access.role };
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireOwnerOrAdmin(access);

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: dto.name.trim() },
    });
  }

  async listMembers(workspaceId: string, userId: string) {
    await this.access.requireMembership(workspaceId, userId);
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async addMember(workspaceId: string, userId: string, dto: AddMemberDto) {
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireOwnerOrAdmin(access);

    if (dto.role === WorkspaceRole.OWNER) {
      throw new BadRequestException('Cannot assign OWNER role to a member');
    }

    const target = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!target) {
      throw new NotFoundException('No user found with that email');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (workspace?.ownerId === target.id) {
      throw new BadRequestException('User is already the workspace owner');
    }

    const member = await this.prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId: target.id },
      },
      create: {
        workspaceId,
        userId: target.id,
        role: dto.role,
      },
      update: { role: dto.role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await this.activity.record({
      workspaceId,
      actorId: userId,
      entityType: ActivityEntityType.MEMBER,
      entityId: member.id,
      action: ActivityAction.ADDED,
      metadata: { email: target.email, role: dto.role },
    });

    return member;
  }

  async updateMember(
    workspaceId: string,
    memberId: string,
    userId: string,
    dto: UpdateMemberDto,
  ) {
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireOwnerOrAdmin(access);

    if (dto.role === WorkspaceRole.OWNER) {
      throw new BadRequestException('Cannot assign OWNER role');
    }

    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async removeMember(workspaceId: string, memberId: string, userId: string) {
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireOwnerOrAdmin(access);

    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: true },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    if (member.userId === userId) {
      throw new BadRequestException('Cannot remove yourself');
    }

    await this.prisma.workspaceMember.delete({ where: { id: memberId } });

    await this.activity.record({
      workspaceId,
      actorId: userId,
      entityType: ActivityEntityType.MEMBER,
      entityId: memberId,
      action: ActivityAction.REMOVED,
      metadata: { email: member.user.email },
    });

    return { success: true };
  }

  async listActivity(workspaceId: string, userId: string) {
    await this.access.requireMembership(workspaceId, userId);
    return this.activity.listForWorkspace(workspaceId);
  }

  async listLabels(workspaceId: string, userId: string) {
    await this.access.requireMembership(workspaceId, userId);
    return this.prisma.label.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async createLabel(workspaceId: string, userId: string, dto: CreateLabelDto) {
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireCanMutate(access);

    return this.prisma.label.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        color: dto.color ?? '#6366f1',
      },
    });
  }
}
