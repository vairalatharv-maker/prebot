import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../server.js';

test('allows local Vite dev origins on dynamic ports', () => {
  assert.equal(isAllowedOrigin('http://localhost:5178'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:5174'), true);
  assert.equal(isAllowedOrigin('https://evil.example'), false);
});
