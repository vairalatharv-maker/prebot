import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import * as mongoMemory from 'mongodb-memory-server';
import { ensureMongoUri } from '../config/database.js';

test('ensureMongoUri falls back to an in-memory MongoDB instance when no env URI is configured', async () => {
  const originalUri = process.env.MONGODB_URI;
  const originalUseMemory = process.env.USE_IN_MEMORY_MONGO;

  delete process.env.MONGODB_URI;
  process.env.USE_IN_MEMORY_MONGO = 'true';

  const mockCreate = mock.method(mongoMemory.MongoMemoryServer, 'create', async () => ({
    getUri: () => 'mongodb://127.0.0.1:27017/prepbot-test',
  }));

  try {
    const uri = await ensureMongoUri();
    assert.equal(uri, 'mongodb://127.0.0.1:27017/prepbot-test');
    assert.equal(process.env.MONGODB_URI, uri);
  } finally {
    mockCreate.mock.restore();

    if (originalUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalUri;

    if (originalUseMemory === undefined) delete process.env.USE_IN_MEMORY_MONGO;
    else process.env.USE_IN_MEMORY_MONGO = originalUseMemory;
  }
});
