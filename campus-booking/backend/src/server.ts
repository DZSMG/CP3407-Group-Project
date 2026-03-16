import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import corsMiddleware from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import bookingsRouter from './routes/bookings';
import { initCronJobs } from './cron/roomStatus';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5500', 'null'],
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  socket.on('subscribe:floor', ({ buildingId, floor }) => {
    socket.join(`floor:${buildingId}:${floor}`);
  });
  socket.on('unsubscribe:floor', ({ buildingId, floor }) => {
    socket.leave(`floor:${buildingId}:${floor}`);
  });
});

app.use(corsMiddleware);
app.use(express.json());

// Make io available to routes
app.set('io', io);

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api', roomsRouter);
app.use('/api/bookings', bookingsRouter);

app.use(errorHandler);

initCronJobs(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
export default app;
