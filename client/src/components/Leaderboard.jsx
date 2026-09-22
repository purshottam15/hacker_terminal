import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function Leaderboard({ onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getLeaderboard()
      .then((data) => setRows(data.leaderboard))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="panel-kicker">network record</span>
            <h2>Leaderboard</h2>
          </div>
          <button onClick={onClose} aria-label="Close leaderboard">x</button>
        </div>
        {loading ? (
          <p className="modal-loading">Loading records...</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Levels</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{r.name}</td>
                  <td>{r.levelsCompleted}</td>
                  <td>{r.score}</td>
                  <td>
                    {formatMs(r.elapsedMs)} {r.isComplete ? '\u2713' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
