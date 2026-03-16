import 'dotenv/config';
import express from 'express';
import corsMiddleware from '../middleware/cors';
import { errorHandler } from '../middleware/errorHandler';
import healthRouter from '../routes/health';
import authRouter from '../routes/auth';
import roomsRouter from '../routes/rooms';
import bookingsRouter from '../routes/bookings';

const app = express();

app.use(corsMiddleware);
app.use(express.json());

// Mock io for tests
app.set('io', { to: () => ({ emit: () => {} }) });

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api', roomsRouter);
app.use('/api/bookings', bookingsRouter);

app.use(errorHandler);

export default app;
