import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

export default async function globalSetup() {
  // Load test env
  dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

  // Run migrations on test DB
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../../..'),
    env: { ...process.env },
    stdio: 'inherit',
  });

  // Seed test data
  execSync('npx ts-node --transpile-only prisma/seed.ts', {
    cwd: path.resolve(__dirname, '../../..'),
    env: { ...process.env },
    stdio: 'inherit',
  });
}
