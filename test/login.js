import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'http://localhost:4000/api';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const payload = JSON.stringify({
    rollNo: '205125003',
    pin: '123456',
  });

  const res = http.post(
    `${BASE_URL}/auth/login`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(`Login status: ${res.status}`);
  console.log(`Login response: ${res.body}`);

  check(res, {
    'login successful': (r) => r.status === 200,
  });
}