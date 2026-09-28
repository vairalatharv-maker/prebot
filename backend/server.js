import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendDirectory, '.env') });

const app = express();
const port = Number(process.env.PORT) || 4000;
app.disable('x-powered-by');
app.use(cors({origin: ["http://localhost:5173","https://prebot-1.onrender.com"],credentials: true}));
app.use(express.json({ limit: '64kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'prepbot-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, _req, res, _next) => {
  console.error('API error:', err.message);
  const status = err.status === 413 ? 413 : err.status === 400 ? 400 : 500;
  const message = status === 413 ? 'The request is too large.' : status === 400 ? 'The request body must be valid JSON.' : 'The server could not complete the request.';
  res.status(status).json({ message });
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB.'))
    .catch((error) => { console.error('MongoDB connection failed:', error.message); });
} else {
  console.warn('MONGODB_URI is not configured. Using an in-memory auth fallback for local development.');
}

app.listen(port, '0.0.0.0', () => console.log(`PrepBot API listening on port ${port}`));
