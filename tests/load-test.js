import http from 'k6/http';
import { check, sleep } from 'k6';

const TARGET_URL = 'https://qly13474-star.github.io/tabarak-platform/';

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '20s', target: 200 },
    { duration: '30s', target: 200 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
};

export default function () {
  const res = http.get(TARGET_URL);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'contains <!doctype html>': (r) =>
      typeof r.body === 'string' && r.body.toLowerCase().includes('<!doctype html>'),
  });

  sleep(1);
}
