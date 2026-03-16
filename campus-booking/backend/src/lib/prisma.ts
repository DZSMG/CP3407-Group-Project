import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// PrismaPg accepts a connection string directly in Prisma v7
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });

const prisma = new PrismaClient({ adapter });

export default prisma;
