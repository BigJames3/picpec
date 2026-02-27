import { INestApplication } from '@nestjs/common';
import { getApp, login, api, closeApp } from './test-utils';

describe('Notifications E2E', () => {
  let app: INestApplication;
  let userToken: string;

  beforeAll(async () => {
    app = await getApp();
    userToken = await login('user1@picpec.com', 'Picpec@123');
  });

  it('GET /notifications - liste paginée', async () => {
    const res = await api(app, userToken)
      .get('/api/notifications')
      .query({ page: 1, limit: 10 })
      .expect(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /notifications/unread - compte non lus', async () => {
    const res = await api(app, userToken).get('/api/notifications/unread').expect(200);
    expect(res.body).toHaveProperty('count');
    expect(typeof res.body.count).toBe('number');
  });

  afterAll(async () => {
    await closeApp();
  });
});
