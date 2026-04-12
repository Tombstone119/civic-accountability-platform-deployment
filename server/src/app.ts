import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// CORS — allow the frontend origin (set FRONTEND_URL in production env vars)
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);
app.use(errorHandler);

export default app;
