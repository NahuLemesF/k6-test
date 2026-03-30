import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const users = new SharedArray('users', function () {
  return papaparse
    .parse(open('../data/users.csv'), { header: true, skipEmptyLines: true })
    .data;
});

export const options = {
  scenarios: {
    login_load: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 30,
      maxVUs: 60,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.97'],
  },
};

export default function () {
  const user = users[__ITER % users.length];

  const payload = JSON.stringify({
    username: user.username,
    password: user.password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  const res = http.post('https://fakestoreapi.com/auth/login', payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body !== null && r.body.length > 0,
    'token exists in response': (r) => {
      try {
        const json = JSON.parse(r.body);
        return typeof json.token === 'string' && json.token.length > 0;
      } catch (_) {
        return false;
      }
    },
  });
}
