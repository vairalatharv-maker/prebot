import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import supabase from './config/supabase.js';

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
  'https://prebot-1.onrender.com',
  'https://prebot-r2uw.vercel.app',
];

export function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
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
/* =========================
   Supabase Connection
========================= */

if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
  console.log('Supabase configuration loaded.');
} else {
  console.warn(
    'SUPABASE_URL or SUPABASE_SECRET_KEY is not configured.'
  );
}
/* =========================
   Vercel Export
========================= */

export default app;

/* =========================
   Local Development Server
========================= */

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (process.env.VERCEL !== '1' && isMainModule && process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`PrepBot API listening on port ${port}`);
  });
}
