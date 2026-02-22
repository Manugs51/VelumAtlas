import assert from 'node:assert/strict';
import test from 'node:test';
import { buildServer } from '../../src/server';
import { resetDbTestDoubles, setDbTestDoubles } from '../../src/db';
import { createMockQuery, createMockWithTransaction } from '../mocks/mockDb';

function setup() {
  const mockQuery = createMockQuery();
  setDbTestDoubles({
    query: mockQuery,
    withTransaction: createMockWithTransaction(mockQuery)
  });

  const app = buildServer();
  return app;
}

test('GET /health returns service status', async () => {
  const app = setup();
  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true, service: 'velumatlas-api' });

  await app.close();
  resetDbTestDoubles();
});

test('GET /api/v1/owners returns mocked owners table', async () => {
  const app = setup();
  const response = await app.inject({ method: 'GET', url: '/api/v1/owners' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.length, 1);
  assert.equal(response.json().data[0].name, 'Ada Lovelace');

  await app.close();
  resetDbTestDoubles();
});

test('GET /api/v1/accounts supports owner filter against mocked table', async () => {
  const app = setup();
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/accounts?ownerId=00000000-0000-0000-0000-000000000001'
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.length, 1);
  assert.equal(response.json().data[0].owner_id, '00000000-0000-0000-0000-000000000001');

  await app.close();
  resetDbTestDoubles();
});

test('GET /api/v1/instruments returns mocked instruments table', async () => {
  const app = setup();
  const response = await app.inject({ method: 'GET', url: '/api/v1/instruments' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data[0].symbol, 'ACME');

  await app.close();
  resetDbTestDoubles();
});

test('GET /api/v1/transactions and /:id include postings from mocked tables', async () => {
  const app = setup();

  const listResponse = await app.inject({ method: 'GET', url: '/api/v1/transactions' });
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.json().data.length, 1);

  const detailResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/transactions/00000000-0000-0000-0000-000000000031'
  });
  assert.equal(detailResponse.statusCode, 200);
  assert.equal(detailResponse.json().data.postings.length, 2);

  await app.close();
  resetDbTestDoubles();
});

test('GET /api/v1/import-profiles returns mocked import_profiles table', async () => {
  const app = setup();
  const response = await app.inject({ method: 'GET', url: '/api/v1/import-profiles' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data[0].profile_name, 'Bank CSV Profile');

  await app.close();
  resetDbTestDoubles();
});
