import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 2,
  iterations: 10,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500']
  }
};

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health returns 200': (r) => r.status === 200,
    'health ok is true': (r) => r.json('ok') === true
  });

  const owners = http.get(`${BASE_URL}/api/v1/owners`);
  check(owners, {
    'owners returns 200': (r) => r.status === 200,
    'owners has data array': (r) => Array.isArray(r.json('data'))
  });

  const accounts = http.get(`${BASE_URL}/api/v1/accounts`);
  check(accounts, {
    'accounts returns 200': (r) => r.status === 200,
    'accounts has data array': (r) => Array.isArray(r.json('data'))
  });

  const instruments = http.get(`${BASE_URL}/api/v1/instruments`);
  check(instruments, {
    'instruments returns 200': (r) => r.status === 200
  });

  const transactions = http.get(`${BASE_URL}/api/v1/transactions`);
  check(transactions, {
    'transactions returns 200': (r) => r.status === 200,
    'transactions has data array': (r) => Array.isArray(r.json('data'))
  });

  const profiles = http.get(`${BASE_URL}/api/v1/import-profiles`);
  check(profiles, {
    'import profiles returns 200': (r) => r.status === 200
  });
}
