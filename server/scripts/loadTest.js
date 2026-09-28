require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function readCredentials(filePath, limit) {
  const rows = fs.readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
    .filter((cells) => cells[0] && cells[0].toUpperCase() !== 'ROLLNO')
    .slice(0, limit)
    .map(([rollNo, name, pin]) => ({ rollNo, name, pin }));
  if (!rows.length) throw new Error('No credentials found.');
  return rows;
}

async function request(baseUrl, path, options = {}, cookie = '') {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${data.error || text}`);
  const setCookie = res.headers.get('set-cookie');
  return { data, cookie: setCookie ? setCookie.split(';')[0] : cookie };
}

async function timed(label, task) {
  const start = Date.now();
  await task();
  console.log(`${label}: ${Date.now() - start}ms`);
}

async function main() {
  const baseUrl = arg('base-url', process.env.LOAD_TEST_BASE_URL || 'http://localhost:4000');
  const credentialsPath = arg('credentials');
  const count = Number(arg('count', 150));
  if (!credentialsPath) {
    throw new Error('Usage: npm run load:test -- --credentials private-pins.csv --base-url http://localhost:4000 --count 150');
  }

  const users = readCredentials(credentialsPath, count);
  const sessions = [];

  await timed(`Test A: ${users.length} simultaneous logins`, async () => {
    const results = await Promise.allSettled(users.map((user) =>
      request(baseUrl, '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ rollNo: user.rollNo, pin: user.pin })
      })
    ));
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length) throw new Error(`${failures.length} login failures. First: ${failures[0].reason.message}`);
    results.forEach((result, index) => sessions.push({ ...users[index], cookie: result.value.cookie }));
  });

  await timed('Test B: simultaneous /me and /game/state', async () => {
    const calls = sessions.flatMap((session) => [
      request(baseUrl, '/api/auth/me', {}, session.cookie),
      request(baseUrl, '/api/game/state', {}, session.cookie)
    ]);
    const results = await Promise.allSettled(calls);
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length) throw new Error(`${failures.length} state failures. First: ${failures[0].reason.message}`);
  });

  await timed('Test C: simultaneous commands', async () => {
    const results = await Promise.allSettled(sessions.map((session) =>
      request(baseUrl, '/api/game/command', {
        method: 'POST',
        body: JSON.stringify({ input: 'pwd', commandId: crypto.randomUUID() })
      }, session.cookie)
    ));
    const acceptedStatuses = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`Accepted command responses: ${acceptedStatuses}/${sessions.length}`);
  });

  await timed('Test D: simultaneous refresh/reconnect', async () => {
    const results = await Promise.allSettled(sessions.map((session) =>
      request(baseUrl, '/api/auth/me', {}, session.cookie)
    ));
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length) throw new Error(`${failures.length} reconnect failures. First: ${failures[0].reason.message}`);
  });

  await timed('Test E: leaderboard polling burst', async () => {
    const results = await Promise.allSettled(Array.from({ length: users.length }, () =>
      request(baseUrl, '/api/leaderboard')
    ));
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length) throw new Error(`${failures.length} leaderboard failures. First: ${failures[0].reason.message}`);
  });

  await timed('Test G: multiple simultaneous commands from one participant', async () => {
    const session = sessions[0];
    const results = await Promise.allSettled(Array.from({ length: 20 }, () =>
      request(baseUrl, '/api/game/command', {
        method: 'POST',
        body: JSON.stringify({ input: 'help', commandId: crypto.randomUUID() })
      }, session.cookie)
    ));
    console.log(`One-player command responses: ${results.filter((r) => r.status === 'fulfilled').length}/20`);
  });

  console.log('Load test completed. Test F around expiration requires prepared near-expiry fixtures.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
