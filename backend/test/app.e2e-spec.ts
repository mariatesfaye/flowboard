import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('FlowBoard smoke (e2e)', () => {
  let app: INestApplication;
  const email = `smoke-${Date.now()}@flowboard.dev`;
  let authCookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers and logs in', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Smoke User',
        email,
        password: 'password123',
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);

    const cookie = login.headers['set-cookie']?.[0];
    expect(cookie).toBeDefined();
    authCookie = cookie as string;
  });

  it('creates workspace and project with default board', async () => {
    const ws = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', authCookie)
      .send({ name: 'Smoke Workspace' })
      .expect(201);

    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Cookie', authCookie)
      .send({ workspaceId: ws.body.id, name: 'Smoke Project' })
      .expect(201);

    expect(project.body.boards?.[0]?.columns?.length).toBeGreaterThanOrEqual(3);
  });
});
