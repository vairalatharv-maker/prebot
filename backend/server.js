import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.join(backendDirectory, '.env'),
});

const app = express();
const port = Number(process.env.PORT) || 4000;

app.disable('x-powered-by');

/* =========================
   CORS
========================= */

const allowedOrigins = [
  'http://localhost:5173',
  'https://prebot-1.onrender.com',
  'https://prebot-r2uw.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // (for example health checks/server-to-server requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

/* =========================
   Middleware
========================= */

app.use(express.json({ limit: '64kb' }));

/* =========================
   Health Check
========================= */

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'prepbot-api',
  });
});

/* =========================
   Routes
========================= */

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

/* =========================
   404 Handler
========================= */

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found.',
  });
});

/* =========================
   Error Handler
========================= */

app.use((err, _req, res, _next) => {
  console.error('API error:', err.message);

  const status =
    err.status === 413
      ? 413
      : err.status === 400
        ? 400
        : 500;

  const message =
    status === 413
      ? 'The request is too large.'
      : status === 400
        ? 'The request body must be valid JSON.'
        : 'The server could not complete the request.';

  res.status(status).json({
    message,
  });
});

/* =========================
   MongoDB Connection
========================= */

if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB.');
    })
    .catch((error) => {
      console.error(
        'MongoDB connection failed:',
        error.message
      );
    });
} else {
  console.warn(
    'MONGODB_URI is not configured. Account registration and sign-in will be unavailable until persistent storage is configured.'
  );
}

/* =========================
   Vercel Export
========================= */

export default app;

/* =========================
   Local Development Server
========================= */

if (process.env.VERCEL !== '1') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`PrepBot API listening on port ${port}`);
  });
}
