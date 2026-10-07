import { ForbiddenException } from '@nestjs/common';
import { WorkspaceAccessService } from './workspace-access.service';

describe('WorkspaceAccessService', () => {
  const prisma = {
    workspace: { findUnique: jest.fn() },
    workspaceMember: { findUnique: jest.fn() },
  };

  const service = new WorkspaceAccessService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('allows workspace owner without membership row', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ ownerId: 'owner-1' });

    await expect(
      service.assertUserInWorkspace('ws-1', 'owner-1'),
    ).resolves.toBeUndefined();
  });

  it('rejects users outside the workspace', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ ownerId: 'owner-1' });
    prisma.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(
      service.assertUserInWorkspace('ws-1', 'stranger'),
    ).rejects.toThrow(ForbiddenException);
  });
});
