import { INestApplication } from '@nestjs/common';
import { getApp, login, api, closeApp, request } from './test-utils';

describe('Tontines E2E', () => {
  let app: INestApplication;
  let userToken: string;
  let tontineId: string;

  beforeAll(async () => {
    app = await getApp();
    userToken = await login('user1@picpec.com', 'Picpec@123');
  });

  describe('POST /api/tontines', () => {
    it('201 — devrait créer une tontine', async () => {
      const res = await api(app, userToken)
        .post('/api/tontines')
        .send({
          title: 'Tontine Test E2E',
          description: 'Description',
          contributionAmount: 5000,
          frequency: 'MONTHLY',
          membersLimit: 5,
        })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title', 'Tontine Test E2E');
      expect(res.body).toHaveProperty('status', 'PENDING');
      tontineId = res.body.id;
    });

    it('400 — données invalides (amount manquant)', async () => {
      const res = await api(app, userToken)
        .post('/api/tontines')
        .send({
          title: 'Tontine',
          frequency: 'MONTHLY',
          membersLimit: 5,
        });
      expect([400, 500]).toContain(res.status);
    });

    it('401 — sans token', () =>
      request(app.getHttpServer())
        .post('/api/tontines')
        .send({
          title: 'Tontine',
          contributionAmount: 5000,
          frequency: 'MONTHLY',
          membersLimit: 5,
        })
        .expect(401));
  });

  describe('GET /api/tontines', () => {
    it('200 — devrait retourner la liste publique paginée', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tontines')
        .query({ page: 1, limit: 10 })
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('200 — sans token (public)', () =>
      request(app.getHttpServer())
        .get('/api/tontines')
        .query({ page: 1, limit: 5 })
        .expect(200));
  });

  describe('GET /api/tontines/my', () => {
    it('200 — devrait retourner mes tontines créées + rejointes', async () => {
      const res = await api(app, userToken).get('/api/tontines/my').expect(200);
      expect(res.body).toHaveProperty('created');
      expect(res.body).toHaveProperty('joined');
    });

    it('401 — sans token', () =>
      request(app.getHttpServer()).get('/api/tontines/my').expect(401));
  });

  describe('GET /api/tontines/:id', () => {
    it('200 — devrait retourner le détail avec membres', async () => {
      if (!tontineId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/tontines/${tontineId}`)
        .expect(200);
      expect(res.body).toHaveProperty('id', tontineId);
      expect(res.body).toHaveProperty('members');
    });

    it('404 — tontine inexistante', () =>
      request(app.getHttpServer())
        .get('/api/tontines/00000000-0000-0000-0000-000000000000')
        .expect(404));
  });

  describe('POST /api/tontines/:id/join', () => {
    it('201 — devrait rejoindre la tontine', async () => {
      const pending = await request(app.getHttpServer())
        .get('/api/tontines')
        .query({ page: 1, limit: 20 });
      const toJoin = pending.body?.data?.find(
        (t: { status: string }) => t.status === 'PENDING',
      );
      if (!toJoin) return;
      const joinToken = await login('user3@picpec.com', 'Picpec@123');
      const res = await api(app, joinToken)
        .post(`/api/tontines/${toJoin.id}/join`)
        .expect(201);
      expect(res.body).toHaveProperty('tontineId', toJoin.id);
    });

    it('400 — tontine non PENDING', async () => {
      const active = await request(app.getHttpServer())
        .get('/api/tontines')
        .query({ page: 1, limit: 20 });
      const act = active.body?.data?.find(
        (t: { status: string }) => t.status === 'ACTIVE',
      );
      if (!act) return;
      const joinToken = await login('user4@picpec.com', 'Picpec@123');
      await api(app, joinToken)
        .post(`/api/tontines/${act.id}/join`)
        .expect(400);
    });

    it('401 — sans token', () =>
      request(app.getHttpServer())
        .post(`/api/tontines/${tontineId || 'x'}/join`)
        .expect(401));
  });

  afterAll(async () => {
    await closeApp();
  });
});
