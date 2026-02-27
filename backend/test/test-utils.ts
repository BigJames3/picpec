import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as supertest from 'supertest';
import { AppModule } from '../src/app.module';

const req = (supertest as any).default || supertest;
/** Use for unauthenticated requests (get, post, etc.) */
export const request = (server: any) => req(server);

let app: INestApplication;

export async function getApp(): Promise<INestApplication> {
  if (app) return app;
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

export async function login(email: string, password: string): Promise<string> {
  const a = await getApp();
  const res = await req(a.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(201);
  return res.body.accessToken;
}

export function api(app: INestApplication, token?: string) {
  const agent = (supertest as any).agent(app.getHttpServer());
  return token ? agent.set('Authorization', `Bearer ${token}`) : agent;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null!;
  }
}
