import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryUsers, createMemoryUser, findMemoryUserByEmail, findMemoryUserById } from '../config/authStore.js';

test('memory auth store can register and retrieve a user', async () => {
  const email = 'fallback@example.com';
  const user = createMemoryUser({ name: 'Fallback User', email, passwordHash: 'hash' });

  assert.ok(user.id);
  assert.equal(findMemoryUserByEmail(email)?.email, email);
  assert.equal(findMemoryUserById(user.id)?.email, email);

  memoryUsers.clear();
});
