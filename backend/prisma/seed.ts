import {
  PrismaClient,
  TaskPriority,
  WorkspaceRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.task.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.board.deleteMany();
  await prisma.project.deleteMany();
  await prisma.label.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  const maria = await prisma.user.create({
    data: {
      name: 'Maria Chen',
      email: 'maria@flowboard.dev',
      passwordHash,
    },
  });

  const alex = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'alex@flowboard.dev',
      passwordHash,
    },
  });

  const sam = await prisma.user.create({
    data: {
      name: 'Sam Patel',
      email: 'sam@flowboard.dev',
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'FlowBoard',
      slug: 'flowboard-demo',
      ownerId: maria.id,
      members: {
        create: [
          { userId: maria.id, role: WorkspaceRole.OWNER },
          { userId: alex.id, role: WorkspaceRole.MEMBER },
          { userId: sam.id, role: WorkspaceRole.VIEWER },
        ],
      },
      labels: {
        create: [
          { name: 'Bug', color: '#ef4444' },
          { name: 'Feature', color: '#3b82f6' },
          { name: 'Design', color: '#a855f7' },
        ],
      },
    },
    include: { labels: true },
  });

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: 'FlowBoard MVP',
      description: 'Ship the collaborative Kanban experience.',
      boards: {
        create: {
          name: 'Main board',
          columns: {
            create: [
              { name: 'Todo', position: 0 },
              { name: 'In Progress', position: 1 },
              { name: 'Done', position: 2 },
            ],
          },
        },
      },
    },
    include: {
      boards: { include: { columns: { orderBy: { position: 'asc' } } } },
    },
  });

  const board = project.boards[0];
  const [todo, inProgress, done] = board.columns;

  const bug = workspace.labels.find((l) => l.name === 'Bug')!;
  const feature = workspace.labels.find((l) => l.name === 'Feature')!;

  const task1 = await prisma.task.create({
    data: {
      boardId: board.id,
      columnId: todo.id,
      title: 'Implement authentication',
      description: 'Registration, login, JWT cookies, and protected routes.',
      priority: TaskPriority.HIGH,
      position: 0,
      assigneeId: alex.id,
      labels: { create: [{ labelId: feature.id }] },
    },
  });

  await prisma.task.create({
    data: {
      boardId: board.id,
      columnId: todo.id,
      title: 'Design workspace dashboard',
      priority: TaskPriority.MEDIUM,
      position: 1,
      assigneeId: maria.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      boardId: board.id,
      columnId: inProgress.id,
      title: 'Kanban drag and drop',
      description: 'Optimistic moves with WebSocket sync.',
      priority: TaskPriority.URGENT,
      position: 0,
      assigneeId: alex.id,
      labels: { create: [{ labelId: feature.id }] },
    },
  });

  await prisma.task.create({
    data: {
      boardId: board.id,
      columnId: done.id,
      title: 'Project scaffolding',
      priority: TaskPriority.LOW,
      position: 0,
      assigneeId: maria.id,
    },
  });

  await prisma.comment.create({
    data: {
      taskId: task1.id,
      authorId: alex.id,
      content: 'JWT in httpOnly cookie is working on the API side.',
    },
  });

  await prisma.comment.create({
    data: {
      taskId: task3.id,
      authorId: maria.id,
      content: 'Remember to dedupe socket events for the actor.',
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        workspaceId: workspace.id,
        actorId: maria.id,
        entityType: 'PROJECT',
        entityId: project.id,
        action: 'CREATED',
        metadata: { name: project.name },
      },
      {
        workspaceId: workspace.id,
        actorId: alex.id,
        entityType: 'TASK',
        entityId: task1.id,
        action: 'CREATED',
        metadata: { title: task1.title, column: 'Todo' },
      },
    ],
  });

  console.log('Seed complete.');
  console.log('Demo login: maria@flowboard.dev / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
