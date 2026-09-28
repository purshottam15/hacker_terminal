const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',

    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },

    ...options
  });

  const text = await res.text();

  let data = {};

  try {
    data = text
      ? JSON.parse(text)
      : {};
  } catch {
    data = {
      raw: text
    };
  }

  if (!res.ok) {
    const err = new Error(
      data.error || 'Request failed'
    );

    err.status = res.status;
    err.data = data;

    throw err;
  }

  return data;
}

export const api = {
  login: (rollNo, pin) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        rollNo,
        pin
      })
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST'
    }),

  me: () =>
    request('/auth/me'),

  getGameState: () =>
    request('/game/state'),

  startGame: () =>
    request('/game/start', {
      method: 'POST'
    }),

  sendCommand: (
    input,
    commandId
  ) =>
    request('/game/command', {
      method: 'POST',
      body: JSON.stringify({
        input,
        commandId
      })
    }),

  /*
   * Hint request.
   *
   * confirm = false
   *     shows the cost
   *
   * confirm = true
   *     actually consumes the hint
   */
  requestHint: (
    commandId,
    confirm = false
  ) =>
    request('/game/hint', {
      method: 'POST',

      body: JSON.stringify({
        commandId,
        confirm
      })
    }),

  heartbeat: () =>
    request('/session/heartbeat', {
      method: 'POST'
    }),

  getLeaderboard: () =>
    request('/leaderboard'),

  getMeta: () =>
    request('/meta'),

  adminDashboard: () =>
    request('/admin/dashboard'),

  adminPlayer: (rollNo) =>
    request(
      `/admin/players/${encodeURIComponent(
        rollNo
      )}`
    ),

  adminExtendTime: (
    rollNo,
    minutes,
    reason
  ) =>
    request(
      `/admin/players/${encodeURIComponent(
        rollNo
      )}/extend-time`,
      {
        method: 'POST',

        body: JSON.stringify({
          minutes,
          reason
        })
      }
    ),

  /*
   * Extend time for ALL currently playing players.
   *
   * minutes = number of minutes to add
   */
  adminExtendAllTime: (
    minutes,
    reason
  ) =>
    request(
      '/admin/extend-all-time',
      {
        method: 'POST',

        body: JSON.stringify({
          minutes,
          reason
        })
      }
    ),

  adminDisqualify: (
    rollNo,
    reason
  ) =>
    request(
      `/admin/players/${encodeURIComponent(
        rollNo
      )}/disqualify`,
      {
        method: 'POST',

        body: JSON.stringify({
          reason
        })
      }
    ),

  adminStartEvent: (reason) =>
    request(
      '/admin/event/start',
      {
        method: 'POST',

        body: JSON.stringify({
          reason
        })
      }
    ),

  adminPauseEvent: (reason) =>
    request(
      '/admin/event/pause',
      {
        method: 'POST',

        body: JSON.stringify({
          reason
        })
      }
    ),

  adminResumeEvent: (reason) =>
    request(
      '/admin/event/resume',
      {
        method: 'POST',

        body: JSON.stringify({
          reason
        })
      }
    ),

  adminEndEvent: (reason) =>
    request(
      '/admin/event/end',
      {
        method: 'POST',

        body: JSON.stringify({
          reason
        })
      }
    ),

  adminResetSession: (
    rollNo,
    reason
  ) =>
    request(
      `/admin/players/${encodeURIComponent(
        rollNo
      )}/reset-session`,
      {
        method: 'POST',

        body: JSON.stringify({
          reason
        })
      }
    ),

  adminResetAllPlayers: (
    reason
  ) =>
    request(
      '/admin/reset-all',
      {
        method: 'POST',

        body: JSON.stringify({
          reason
        })
      }
    )
};