import { INestApplication } from '@nestjs/common';
import { getApp, login, api, closeApp, request } from './test-utils';

describe('Wallet E2E', () => {
  let app: INestApplication;
  let userToken: string;
  let userToken2: string;
  let userId: string;
  let userId2: string;

  beforeAll(async () => {
    app = await getApp();
    userToken = await login('user1@picpec.com', 'Picpec@123');
    userToken2 = await login('user2@picpec.com', 'Picpec@123');
    const loginRes1 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user1@picpec.com', password: 'Picpec@123' })
      .expect(201);
    const loginRes2 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user2@picpec.com', password: 'Picpec@123' })
      .expect(201);
    userId = loginRes1.body.user?.id ?? loginRes1.body.id;
    userId2 = loginRes2.body.user?.id ?? loginRes2.body.id;
  });

  describe('GET /api/wallet/balance', () => {
    it('200 — devrait retourner le solde', async () => {
      const res = await api(app, userToken).get('/api/wallet/balance').expect(200);
      expect(res.body).toHaveProperty('balance');
      expect(typeof res.body.balance).toBe('number');
    });

    it('401 — sans token', () =>
      request(app.getHttpServer()).get('/api/wallet/balance').expect(401));
  });

  describe('POST /api/wallet/deposit', () => {
    it('201 — devrait créditer le wallet', async () => {
      const res = await api(app, userToken)
        .post('/api/wallet/deposit')
        .send({ amount: 1000 })
        .expect(201);
      expect(res.body).toHaveProperty('balance');
    });

  });

  describe('POST /api/wallet/transfer', () => {
    it('201 — devrait transférer entre utilisateurs', async () => {
      const res = await api(app, userToken)
        .post('/api/wallet/transfer')
        .send({ receiverId: userId2, amount: 100 })
        .expect(201);
      expect(res.body).toHaveProperty('reference');
      expect(res.body.reference).toMatch(/^TRF-/);
    });

    it('400 — transfert vers soi-même', () =>
      api(app, userToken)
        .post('/api/wallet/transfer')
        .send({ receiverId: userId, amount: 100 })
        .expect(400));

    it('404 — destinataire inexistant', () =>
      api(app, userToken)
        .post('/api/wallet/transfer')
        .send({
          receiverId: '00000000-0000-0000-0000-000000000000',
          amount: 100,
        })
        .expect(404));

    it('401 — sans token', () =>
      request(app.getHttpServer())
        .post('/api/wallet/transfer')
        .send({ receiverId: userId2, amount: 100 })
        .expect(401));
  });

  describe('GET /api/wallet/transactions', () => {
    it('200 — devrait retourner la liste paginée', async () => {
      const res = await api(app, userToken)
        .get('/api/wallet/transactions')
        .query({ page: 1, limit: 5 })
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('total');
    });

    it('200 — devrait filtrer par type', () =>
      api(app, userToken)
        .get('/api/wallet/transactions')
        .query({ type: 'DEPOSIT' })
        .expect(200));
  });

  afterAll(async () => {
    await closeApp();
  });
});
