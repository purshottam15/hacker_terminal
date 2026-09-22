import React, { useEffect, useState } from 'react';

function formatElapsed(startedAt, completedAt) {
  const end = completedAt ? new Date(completedAt) : new Date();
  const totalSeconds = Math.max(0, Math.floor((end - new Date(startedAt)) / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function Sidebar({ player, allCommands }) {
  const [elapsed, setElapsed] = useState(formatElapsed(player.startedAt, player.completedAt));

  useEffect(() => {
    if (player.completedAt) {
      setElapsed(formatElapsed(player.startedAt, player.completedAt));
      return;
    }
    const id = setInterval(() => {
      setElapsed(formatElapsed(player.startedAt, player.completedAt));
    }, 1000);
    return () => clearInterval(id);
  }, [player.startedAt, player.completedAt]);

  const unlockedSet = new Set(player.unlockedCommands);
  const progress = Math.round((player.levelsCompleted / player.totalLevels) * 100);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="panel-kicker">live operation</span>
        <h2>{player.name}</h2>
        <p>Ghost-system session telemetry</p>
      </div>

      <div className="progress-dial" style={{ '--progress': `${progress}%` }}>
        <span>{progress}%</span>
        <small>breach</small>
      </div>

      <div className="sidebar-grid">
        <div className="sidebar-stat">
          <span>level</span>
          <strong>
            {player.levelsCompleted}/{player.totalLevels}
          </strong>
        </div>
        <div className="sidebar-stat">
          <span>score</span>
          <strong>{player.score}</strong>
        </div>
        <div className="sidebar-stat wide">
          <span>elapsed</span>
          <strong>{elapsed}</strong>
        </div>
      </div>

      <div className="sidebar-block">
        <h3>COMMANDS</h3>
        <div className="command-list">
          {allCommands.map((c) => (
            <div key={c.name} className={`command-chip mono ${unlockedSet.has(c.name) ? 'unlocked' : 'locked'}`}>
              <span>{unlockedSet.has(c.name) ? '\u2713' : '?'}</span>
              {c.name}
            </div>
          ))}
        </div>
      </div>

      {player.isComplete && (
        <div className="sidebar-block complete-banner">
          SYSTEM FULLY BREACHED
        </div>
      )}
    </aside>
  );
}
