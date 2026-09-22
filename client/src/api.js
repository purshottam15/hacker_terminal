const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  registerPlayer: (name) =>
    request('/players', { method: 'POST', body: JSON.stringify({ name }) }),
  getPlayer: (id) => request(`/players/${id}`),
  sendCommand: (id, input) =>
    request(`/players/${id}/command`, { method: 'POST', body: JSON.stringify({ input }) }),
  getLeaderboard: () => request('/leaderboard'),
  getMeta: () => request('/meta')
};
