import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwt = { sign: jest.fn().mockReturnValue('token') };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
    get: jest.fn().mockReturnValue('7d'),
  };

  const service = new AuthService(
    prisma as never,
    jwt as never,
    config as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('registers a new user with hashed password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: '1',
      name: 'Maria',
      email: 'maria@test.dev',
      avatarUrl: null,
      createdAt: new Date(),
    });

    const result = await service.register({
      name: 'Maria',
      email: 'maria@test.dev',
      password: 'password123',
    });

    expect(result.token).toBe('token');
    const createData = prisma.user.create.mock.calls[0][0].data;
    expect(createData.passwordHash).toBeDefined();
    expect(await bcrypt.compare('password123', createData.passwordHash)).toBe(
      true,
    );
  });

  it('rejects invalid login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      passwordHash: await bcrypt.hash('password123', 12),
    });

    await expect(
      service.login({ email: 'maria@test.dev', password: 'wrongpass1' }),
    ).rejects.toThrow('Invalid email or password');
  });
});
