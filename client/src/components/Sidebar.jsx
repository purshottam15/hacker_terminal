import React, { useEffect, useState } from 'react';

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '--:--';
  const total = Math.max(0, seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function Sidebar({ player, event, allCommands }) {
  const [remaining, setRemaining] = useState(player.remainingSeconds);

  useEffect(() => {
    setRemaining(player.remainingSeconds);
    if (player.completedAt || player.status !== 'PLAYING' || event?.state === 'PAUSED') return undefined;
    const id = setInterval(() => setRemaining((value) => Math.max(0, (value || 0) - 1)), 1000);
    return () => clearInterval(id);
  }, [player.remainingSeconds, player.completedAt, player.status, event?.state]);

  const unlockedSet = new Set(player.unlockedCommands);
  const progress = Math.round((player.levelsCompleted / player.totalLevels) * 100);
  const commands = allCommands.filter((command) => unlockedSet.has(command.name));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="panel-kicker">Active Session</span>
        <h2>{player.name}</h2>
        <p>{player.rollNo} / {player.status}</p>
      </div>
      <div className="progress-dial" style={{ '--progress': `${progress}%` }}>
        <span>{progress}%</span>
        <small>Recovered</small>
      </div>
      <div className="sidebar-grid">
        <div className="sidebar-stat"><span>level</span><strong>{player.levelsCompleted}/{player.totalLevels}</strong></div>
        <div className="sidebar-stat"><span>score</span><strong>{player.score}</strong></div>
        <div className="sidebar-stat wide"><span>time remaining</span><strong>{formatTime(remaining)}</strong></div>
      </div>
      {event?.state === 'PAUSED' && <div className="sidebar-block pause-banner">EVENT PAUSED</div>}
      <div className="sidebar-block">
        <h3>COMMANDS - {unlockedSet.size}/{allCommands.length} unlocked - {allCommands.length - unlockedSet.size} to unlock</h3>
        <div className="command-list">
          {commands.map((command) => <div key={command.name} className="command-chip mono unlocked"><span>?</span>{command.name}</div>)}
        </div>
      </div>
      {player.isComplete && <div className="sidebar-block complete-banner">SYSTEM FULLY BREACHED</div>}
    </aside>
  );
}
