/**
 * Setup global E2E : charge .env, exécute le seed
 * Prérequis : DB migrée (npm run db:reset ou prisma migrate deploy)
 * Le seed est exécuté pour garantir des données de test.
 */
import { config } from 'dotenv';
import { execSync } from 'child_process';
import * as path from 'path';

config({ path: path.resolve(process.cwd(), '.env') });

export default async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL ou DATABASE_URL_TEST requis pour les tests E2E');
  }

  process.env.DATABASE_URL = dbUrl;

  const backendDir = path.resolve(__dirname, '..');
  execSync('npx tsx prisma/seed.ts', {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
}
