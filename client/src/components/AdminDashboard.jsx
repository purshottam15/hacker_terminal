import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}


const handleExtendAllTime = async () => {
  const input = window.prompt(
    'Enter extra time for ALL currently playing players (minutes):',
    '10'
  );

  if (input === null) return;

  const minutes = parseInt(input.trim(), 10);

  if (Number.isNaN(minutes) || minutes <= 0) {
    alert('Please enter a valid numerical value, for example: 10');
    return;
  }

  if (minutes > 120) {
    alert('Maximum allowed extension is 120 minutes.');
    return;
  }

  const confirmed = window.confirm(
    `Add ${minutes} minutes to ALL currently playing players?`
  );

  if (!confirmed) return;

  try {
    const data = await api.adminExtendAllTime(
      minutes,
      `Admin extended all players by ${minutes} minutes`
    );

    alert(
      `Successfully added ${minutes} minutes to ${data.playersExtended || 0} players.`
    );

    if (typeof loadDashboard === 'function') {
      await loadDashboard();
    }

  } catch (err) {
    console.error('Extend all time error:', err);

    alert(
      err?.data?.error ||
      err?.message ||
      'Failed to extend time for players.'
    );
  }
};
function formatRemaining(seconds) {
  if (seconds === null || seconds === undefined) return '-';
  const total = Math.max(0, seconds);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function AdminDashboard({ admin, onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  async function load() {
    try {
      const data = await api.adminDashboard();
      setDashboard(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 7000);
    return () => clearInterval(id);
  }, []);

  async function runAction(task) {
    try {
      setError('');
      await task();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function reason(defaultText = '') {
    return window.prompt('Reason for audit log:', defaultText) || '';
  }

  async function inspect(rollNo) {
    await runAction(async () => {
      const data = await api.adminPlayer(rollNo);
      setSelected(data.player);
    });
  }

  if (!dashboard) {
    return (
      <div className="app-layout">
        <div className="loading-screen">loading admin console...</div>
      </div>
    );
  }

  const stats = dashboard.stats;
  const event = dashboard.event;

  return (
    <div className="app-layout admin-layout">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">ACM</span>
          <div>
            <span className="topbar-title">ACM Control Panel</span>
            <span className="topbar-subtitle">Event state: {event.state}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="status-pill">admin: {admin.rollNo}</span>
          <button className="topbar-btn" type="button" onClick={() => runAction(() => api.adminStartEvent('Event started'))}>Start</button>
          <button className="topbar-btn" type="button" onClick={() => runAction(() => api.adminPauseEvent(reason('Organizer pause')))}>Pause</button>
          <button className="topbar-btn" type="button" onClick={() => runAction(() => api.adminResumeEvent(reason('Organizer resume')))}>Resume</button>

          <button
  className="danger-button"
  type="button"
  onClick={() => {
    const confirmed = window.confirm(
      'RESET ALL PLAYERS?\n\n' +
      'This will erase every participant\'s game progress, score, unlocked levels, hints and active session.\n\n' +
      'All participants will return to READY and can start again.\n\n' +
      'This cannot be undone.'
    );

    if (!confirmed) return;

    const why = reason('Reset all players');

    return runAction(() =>
      api.adminResetAllPlayers(why)
    );
  }}
>
  Reset All
</button>

<button
  type="button"
  onClick={handleExtendAllTime}
  className="admin-action-btn extend-all-btn"
>
  ⏱ Extend All Players
</button>
          <button className="danger-button" type="button" onClick={() => runAction(() => api.adminEndEvent(reason('Event ended')))}>End</button>
          <button className="secondary-button compact" type="button" onClick={() => window.open('/api/admin/export', '_blank')}>Export CSV</button>
          <button className="secondary-button compact" type="button" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <main className="admin-main">
        {error && <div className="admin-error">{error}</div>}
        <section className="admin-stats">
          <div><span>Total Participants</span><strong>{stats.totalParticipants}</strong></div>
          <div><span>Ready</span><strong>{stats.ready}</strong></div>
          <div><span>Logged In</span><strong>{stats.loggedIn}</strong></div>
          <div><span>Playing</span><strong>{stats.playing}</strong></div>
          <div><span>Completed</span><strong>{stats.completed}</strong></div>
          <div><span>Timed Out</span><strong>{stats.timedOut}</strong></div>
          <div><span>Stale</span><strong>{stats.disconnectedStale}</strong></div>
        </section>

        <section className="admin-table-wrap">
          <table className="leaderboard-table admin-table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Name</th>
                <th>Status</th>
                <th>Score</th>
                <th>Level</th>
                <th>Started</th>
                <th>Expires</th>
                <th>Remaining</th>
                <th>Last Seen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.players.map((player) => (
                <tr key={player.rollNo} className={player.stale ? 'is-stale' : ''}>
                  <td>{player.rollNo}</td>
                  <td>{player.name}</td>
                  <td>{player.status}</td>
                  <td>{player.score}</td>
                  <td>{player.completedLevels}/{player.totalLevels}</td>
                  <td>{formatDate(player.startedAt)}</td>
                  <td>{formatDate(player.expiresAt)}</td>
                  <td>{formatRemaining(player.remainingSeconds)}</td>
                  <td>{formatDate(player.lastSeenAt)}</td>
                  <td>
                    <div className="admin-actions">
                      <button type="button" onClick={() => inspect(player.rollNo)}>View</button>
                      <button type="button" onClick={() => runAction(() => api.adminResetSession(player.rollNo, reason('Session reset')))}>Reset</button>
                      <button
                        type="button"
                        onClick={() => {
                          const minutes = Number(window.prompt('Extend by minutes:', '5') || 0);
                          const why = reason('Technical issue');
                          return runAction(() => api.adminExtendTime(player.rollNo, minutes, why));
                        }}
                      >
                        Extend
                      </button>
                      <button className="danger-link" type="button" onClick={() => runAction(() => api.adminDisqualify(player.rollNo, reason('Disqualified')))}>DQ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal player-state-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="panel-kicker">participant state</span>
                <h2>{selected.rollNo}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)}>x</button>
            </div>
            <pre className="state-json">{JSON.stringify(selected, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
