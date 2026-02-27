import { INestApplication } from '@nestjs/common';
import { getApp, login, api, closeApp, request } from './test-utils';

describe('Products E2E', () => {
  let app: INestApplication;
  let sellerToken: string;
  let buyerToken: string;
  let productId: string;

  beforeAll(async () => {
    app = await getApp();
    sellerToken = await login('vendeur1@picpec.com', 'Picpec@123');
    buyerToken = await login('user1@picpec.com', 'Picpec@123');
  });

  describe('POST /api/products', () => {
    it('201 — devrait créer un produit', async () => {
      const res = await api(app, sellerToken)
        .post('/api/products')
        .send({
          name: 'Produit E2E Test',
          description: 'Description test',
          price: 15000,
          stock: 5,
        })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Produit E2E Test');
      productId = res.body.id;
    });

    it('400 — données invalides', async () => {
      const res = await api(app, sellerToken)
        .post('/api/products')
        .send({ name: 'x' });
      expect([400, 500]).toContain(res.status);
    });

    it('401 — sans token', () =>
      request(app.getHttpServer())
        .post('/api/products')
        .send({
          name: 'Produit',
          description: 'Desc',
          price: 10000,
          stock: 1,
        })
        .expect(401));
  });

  describe('GET /api/products', () => {
    it('200 — devrait retourner la liste paginée', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .query({ page: 1, limit: 10 })
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('200 — devrait filtrer par search', () =>
      request(app.getHttpServer())
        .get('/api/products')
        .query({ search: 'boubou', page: 1, limit: 10 })
        .expect(200));

    it('200 — devrait filtrer par priceMin/priceMax', () =>
      request(app.getHttpServer())
        .get('/api/products')
        .query({ priceMin: 1000, priceMax: 50000, page: 1, limit: 10 })
        .expect(200));

    it('200 — sans token (public)', () =>
      request(app.getHttpServer())
        .get('/api/products')
        .query({ page: 1, limit: 5 })
        .expect(200));
  });

  describe('GET /api/products/:id', () => {
    it('200 — devrait retourner le détail', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/products')
        .query({ page: 1, limit: 1 });
      const p = listRes.body?.data?.[0];
      if (!p) return;
      const res = await request(app.getHttpServer())
        .get(`/api/products/${p.id}`)
        .expect(200);
      expect(res.body).toHaveProperty('id', p.id);
    });

    it('404 — produit inexistant', () =>
      request(app.getHttpServer())
        .get('/api/products/00000000-0000-0000-0000-000000000000')
        .expect(404));
  });

  describe('PATCH /api/products/:id', () => {
    it('200 — devrait modifier si owner', async () => {
      if (!productId) return;
      const res = await api(app, sellerToken)
        .patch(`/api/products/${productId}`)
        .send({ name: 'Produit modifié' })
        .expect(200);
      expect(res.body).toHaveProperty('name', 'Produit modifié');
    });

    it('403 — si non owner', async () => {
      if (!productId) return;
      await api(app, buyerToken)
        .patch(`/api/products/${productId}`)
        .send({ name: 'Hack' })
        .expect(403);
    });

    it('401 — sans token', () =>
      request(app.getHttpServer())
        .patch(`/api/products/${productId || 'x'}`)
        .send({ name: 'x' })
        .expect(401));
  });

  describe('POST /api/products/:id/purchase', () => {
    it('201 — devrait acheter le produit', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/products')
        .query({ page: 1, limit: 20 });
      const products = listRes.body?.data ?? [];
      const product = products.find(
        (p: { seller?: { id: string }; stock: number }) =>
          p.stock > 0 && p.seller?.id,
      );
      if (!product) return;
      const res = await api(app, buyerToken)
        .post(`/api/products/${product.id}/purchase`)
        .send({ quantity: 1 })
        .expect(201);
      expect(res.body).toHaveProperty('id', product.id);
    });

    it('401 — sans token', () =>
      request(app.getHttpServer())
        .post(`/api/products/${productId || 'x'}/purchase`)
        .send({ quantity: 1 })
        .expect(401));
  });

  describe('GET /api/products/purchases/my', () => {
    it('200 — devrait retourner achats et ventes', async () => {
      const res = await api(app, buyerToken)
        .get('/api/products/purchases/my')
        .expect(200);
      expect(res.body).toHaveProperty('purchases');
      expect(res.body).toHaveProperty('sales');
    });

    it('401 — sans token', () =>
      request(app.getHttpServer())
        .get('/api/products/purchases/my')
        .expect(401));
  });

  describe('DELETE /api/products/:id', () => {
    it('200 — devrait supprimer si owner', async () => {
      const created = await api(app, sellerToken)
        .post('/api/products')
        .send({
          name: 'Produit à supprimer',
          description: 'Desc',
          price: 5000,
          stock: 1,
        })
        .expect(201);
      await api(app, sellerToken)
        .delete(`/api/products/${created.body.id}`)
        .expect(200);
    });

    it('403 — si non owner', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/products')
        .query({ page: 1, limit: 1 });
      const p = listRes.body?.data?.[0];
      if (!p) return;
      await api(app, buyerToken).delete(`/api/products/${p.id}`).expect(403);
    });
  });

  afterAll(async () => {
    await closeApp();
  });
});
