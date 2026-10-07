import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  ProjectStatus,
} from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const DEFAULT_COLUMNS = ['Todo', 'In Progress', 'Done'];

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly activity: ActivityService,
  ) {}

  async list(workspaceId: string, userId: string) {
    await this.access.requireMembership(workspaceId, userId);
    return this.prisma.project.findMany({
      where: { workspaceId, status: ProjectStatus.ACTIVE },
      orderBy: { updatedAt: 'desc' },
      include: {
        boards: { select: { id: true, name: true } },
      },
    });
  }

  async create(userId: string, dto: CreateProjectDto) {
    const access = await this.access.requireMembership(dto.workspaceId, userId);
    this.access.requireCanMutate(access);

    const project = await this.prisma.project.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        boards: {
          create: {
            name: 'Main board',
            columns: {
              create: DEFAULT_COLUMNS.map((name, position) => ({
                name,
                position,
              })),
            },
          },
        },
      },
      include: {
        boards: { include: { columns: { orderBy: { position: 'asc' } } } },
      },
    });

    await this.activity.record({
      workspaceId: dto.workspaceId,
      actorId: userId,
      entityType: ActivityEntityType.PROJECT,
      entityId: project.id,
      action: ActivityAction.CREATED,
      metadata: { name: project.name },
    });

    return project;
  }

  async getById(projectId: string, userId: string) {
    const workspaceId = await this.access.getWorkspaceIdForProject(projectId);
    await this.access.requireMembership(workspaceId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        boards: {
          include: { columns: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    const workspaceId = await this.access.getWorkspaceIdForProject(projectId);
    const access = await this.access.requireMembership(workspaceId, userId);
    this.access.requireCanMutate(access);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        status: dto.status,
      },
    });

    await this.activity.record({
      workspaceId,
      actorId: userId,
      entityType: ActivityEntityType.PROJECT,
      entityId: project.id,
      action: dto.status === ProjectStatus.ARCHIVED ? ActivityAction.ARCHIVED : ActivityAction.UPDATED,
      metadata: { name: project.name },
    });

    return project;
  }

  async delete(projectId: string, userId: string) {
    return this.update(projectId, userId, { status: ProjectStatus.ARCHIVED });
  }
}
