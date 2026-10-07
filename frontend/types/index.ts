export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type WorkspaceRole = 'OWNER' | 'MEMBER' | 'VIEWER';

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  currentUserRole?: WorkspaceRole;
};

export type WorkspaceDetail = Workspace & {
  projects: ProjectSummary[];
  members: WorkspaceMember[];
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
};

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  boards?: { id: string; name: string }[];
};

export type ProjectSummary = Project & {
  boards: { id: string; name: string }[];
};

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type Label = {
  id: string;
  name: string;
  color: string;
};

export type Task = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  position: number;
  assigneeId: string | null;
  dueDate: string | null;
  assignee?: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'> | null;
  labels?: { label: Label }[];
  column?: { id: string; name: string };
  _count?: { comments: number };
};

export type TaskDetail = Task & {
  comments: Comment[];
};

export type BoardColumn = {
  id: string;
  boardId: string;
  name: string;
  position: number;
  tasks: Task[];
};

export type Board = {
  id: string;
  projectId: string;
  name: string;
  columns: BoardColumn[];
  project: { id: string; name: string; workspaceId: string };
};

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
};

export type Activity = {
  id: string;
  workspaceId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: Pick<User, 'id' | 'name' | 'email'>;
};
