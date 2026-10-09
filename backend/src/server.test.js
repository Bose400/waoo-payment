import test from 'node:test';
import assert from 'node:assert/strict';
import { closeDatabase, startServer } from './server.js';

let server;

test.before(async () => {
  server = await startServer(5001);
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await closeDatabase();
});

test('GET /api returns metadata', async () => {
  const response = await fetch('http://localhost:5001/api');
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.service, 'WAOO PAY API');
  assert.equal(Array.isArray(body.endpoints), true);
});
