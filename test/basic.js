import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'http://localhost:4000/api';

export const options = {
  vus: 1,
  duration: '10s',
};

export default function () {
  const res = http.get(`${BASE_URL}/meta`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}