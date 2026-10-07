import { Injectable } from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    workspaceId: string;
    actorId: string;
    entityType: ActivityEntityType;
    entityId: string;
    action: ActivityAction;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.activity.create({
      data: {
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        metadata: params.metadata ?? undefined,
      },
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async listForWorkspace(workspaceId: string, limit = 50) {
    return this.prisma.activity.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
