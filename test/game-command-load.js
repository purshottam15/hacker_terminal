import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    game_test: {
      executor: 'per-vu-iterations',
      vus: 113,
      iterations: 1,
      maxDuration: '2m',
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{type:command}': ['p(95)<1000'],
  },
};

const BASE_URL = 'http://localhost:4000';

const users = Array.from({ length: 114 }, (_, i) => ({
  rollNo: `205125${String(i + 1).padStart(3, '0')}`,
  pin: '123456',
}));

export default function () {

  const user = users[__VU - 1];

  if (!user) {
    console.log(`VU ${__VU}: no test account available`);
    return;
  }

  // -------------------------
  // LOGIN
  // -------------------------

  const login = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      rollNo: user.rollNo,
      pin: user.pin,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: {
        type: 'login',
      },
    }
  );

  const loginOK = check(login, {
    'login successful': (r) => r.status === 200,
  });

  if (!loginOK) {
    console.log(
      `${user.rollNo} -> LOGIN FAILED ${login.status}: ${login.body}`
    );
    return;
  }

  console.log(`${user.rollNo} -> LOGIN OK`);

  sleep(1);

  // -------------------------
  // GAME STATE
  // -------------------------

  const state = http.get(
    `${BASE_URL}/api/game/state`,
    {
      tags: {
        type: 'game_state',
      },
    }
  );

  check(state, {
    'game state successful': (r) => r.status === 200,
  });

  // -------------------------
  // COMMAND
  // -------------------------

  const command = http.post(
    `${BASE_URL}/api/game/command`,
    JSON.stringify({
      input: 'pwd',
      commandId: `loadtest-${__VU}-${Date.now()}`,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: {
        type: 'command',
      },
    }
  );

  const commandOK = check(command, {
    'command successful': (r) => r.status === 200,
  });

  if (!commandOK) {
    console.log(
      `${user.rollNo} -> COMMAND FAILED ${command.status}: ${command.body}`
    );
  } else {
    console.log(`${user.rollNo} -> COMMAND OK`);
  }
}