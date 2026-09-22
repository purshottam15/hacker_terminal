import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Terminal from './components/Terminal.jsx';
import Sidebar from './components/Sidebar.jsx';
import Leaderboard from './components/Leaderboard.jsx';

export default function App() {
  const [player, setPlayer] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    api.getMeta().then(setMeta).catch(() => setMeta({ commands: [], totalLevels: 20 }));

    const savedId = localStorage.getItem('ht_player_id');
    if (!savedId) {
      setLoading(false);
      return;
    }
    api
      .getPlayer(savedId)
      .then((data) => setPlayer(data.player))
      .catch(() => localStorage.removeItem('ht_player_id'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !meta) {
    return <div className="loading-screen">connecting...</div>;
  }

  if (!player) {
    return <Login onLogin={setPlayer} />;
  }

  return (
    <div className="app-layout">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">HT</span>
          <div>
            <span className="topbar-title">Hacker's Terminal</span>
            <span className="topbar-subtitle">Recovered shell / Ashworth drive</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="status-pill">secure relay</span>
          <span className="status-pill">player: {player.name}</span>
          <button className="topbar-btn" onClick={() => setShowLeaderboard(true)}>
            leaderboard
          </button>
        </div>
      </div>
      <div className="main-layout">
        <Terminal player={player} onPlayerUpdate={setPlayer} />
        <Sidebar player={player} allCommands={meta.commands} />
      </div>
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}
