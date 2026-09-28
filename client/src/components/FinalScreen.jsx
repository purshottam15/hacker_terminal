import React from 'react';

export default function FinalScreen({ player, onLogout }) {
  const timedOut = player.status === 'TIMED_OUT';
  return (
    <div className="login-screen">
      <main className="start-panel">
        <section className="login-box start-box">
          <div className="login-box-top">
            <span className="login-led" />
            <span>{timedOut ? 'operation closed' : 'investigation complete'}</span>
          </div>
          <h1>{timedOut ? "TIME'S UP" : 'SYSTEM FULLY BREACHED'}</h1>
          <p className="start-roll">Roll Number: {player.rollNo}</p>
          <div className="final-score">Final Score: {player.score}</div>
          <p className="login-copy">
            Levels completed: {player.levelsCompleted}/{player.totalLevels}
          </p>
          <button className="secondary-button" type="button" onClick={onLogout}>
            Log out
          </button>
        </section>
      </main>
    </div>
  );
}
