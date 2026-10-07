import { formatActivity } from './format-activity';
import type { Activity } from '@/types';

const base: Activity = {
  id: '1',
  workspaceId: 'w',
  actorId: 'a',
  entityType: 'TASK',
  entityId: 't',
  action: 'MOVED',
  metadata: {
    title: 'Implement authentication',
    fromColumn: 'Todo',
    toColumn: 'In Progress',
  },
  createdAt: new Date().toISOString(),
  actor: { id: 'a', name: 'Maria', email: 'm@test.dev' },
};

describe('formatActivity', () => {
  it('formats task moved events', () => {
    expect(formatActivity(base)).toBe(
      'Maria moved "Implement authentication" from Todo to In Progress.',
    );
  });
});
