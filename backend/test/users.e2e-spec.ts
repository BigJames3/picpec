import { INestApplication } from '@nestjs/common';
import { getApp, login, api, closeApp, request } from './test-utils';

describe('Users E2E', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await getApp();
    userToken = await login('user1@picpec.com', 'Picpec@123');
    adminToken = await login('admin@picpec.com', 'Picpec@123');
  });

  it('POST /auth/register - crée un utilisateur', async () => {
    const email = `test-${Date.now()}@picpec.com`;
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: 'Test User',
        email,
        password: 'Test@123',
      })
      .expect(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(email);
  });

  it('POST /auth/login - login utilisateur', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user1@picpec.com', password: 'Picpec@123' })
      .expect(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('POST /auth/login - échoue avec mauvais mot de passe', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user1@picpec.com', password: 'WrongPassword' })
      .expect(401);
  });

  it('GET /users/me - profil utilisateur (JWT)', async () => {
    const res = await api(app, userToken).get('/api/users/me').expect(200);
    expect(res.body).toHaveProperty('email', 'user1@picpec.com');
    expect(res.body).toHaveProperty('fullname');
  });

  it('GET /users/me - 401 sans token', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(401);
  });

  it('GET /users - liste admin (RBAC)', async () => {
    const res = await api(app, adminToken).get('/api/users').expect(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /users - 403 pour USER', async () => {
    await api(app, userToken).get('/api/users').expect(403);
  });

  afterAll(async () => {
    await closeApp();
  });
});
