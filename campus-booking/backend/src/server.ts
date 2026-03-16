import 'dotenv/config';
import express from 'express';
import corsMiddleware from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(corsMiddleware);
app.use(express.json());

app.use('/api', healthRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
