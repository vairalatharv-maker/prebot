import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export async function ensureMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  if (process.env.USE_IN_MEMORY_MONGO === 'false') {
    throw new Error('MONGODB_URI is not configured and in-memory MongoDB fallback is disabled.');
  }

  mongoMemoryServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoMemoryServer.getUri();
  console.warn('MONGODB_URI not configured. Starting an in-memory MongoDB instance for local development.');
  return process.env.MONGODB_URI;
}

export async function connectDatabase() {
  let uri = process.env.MONGODB_URI;

  try {
    if (!uri) {
      uri = await ensureMongoUri();
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');
    return mongoose.connection;
  } catch (error) {
    const fallbackEnabled = process.env.USE_IN_MEMORY_MONGO !== 'false';

    if (!fallbackEnabled) {
      throw error;
    }

    if (!mongoMemoryServer) {
      console.warn('MongoDB connection failed. Falling back to an in-memory MongoDB instance for local development.');
      mongoMemoryServer = await MongoMemoryServer.create();
      process.env.MONGODB_URI = mongoMemoryServer.getUri();
      uri = process.env.MONGODB_URI;
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB with the in-memory fallback.');
    return mongoose.connection;
  }
}
