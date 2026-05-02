import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import authRoutes from './routes/auth.routes';
import matchRoutes from './routes/match.routes';
import playerRoutes from './routes/player.routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const incomingRequestId = req.header('x-request-id');
  const requestId = incomingRequestId && incomingRequestId.trim() ? incomingRequestId : randomUUID();
  res.setHeader('x-request-id', requestId);
  next();
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'dream-coach-backend',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/players', playerRoutes);

app.use((_req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Route not found',
  });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
