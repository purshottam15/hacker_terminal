import React, { useState } from 'react';
import Terminal from '../components/Terminal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import StartScreen from '../components/StartScreen.jsx';
import FinalScreen from '../components/FinalScreen.jsx';

export default function GamePage({
  player,
  event,
  meta,
  connectionLost,
  setPlayer,
  setEvent,
  onConnectionLost,
  onLogout
}) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  /*
   * Player has finished, timed out, or has been disqualified.
   */
  if (
    player.status === 'COMPLETED' ||
    player.status === 'TIMED_OUT' ||
    player.status === 'DISQUALIFIED'
  ) {
    return (
      <FinalScreen
        player={player}
        onLogout={onLogout}
      />
    );
  }

  /*
   * Player has logged in but has not started the game.
   */
  if (
    !player.startedAt ||
    player.status === 'READY' ||
    player.status === 'LOGGED_IN'
  ) {
    return (
      <StartScreen
        player={player}
        event={event}
        onStarted={(data) => {
          if (data.player) setPlayer(data.player);
          if (data.event) setEvent(data.event);
        }}
        onLogout={onLogout}
      />
    );
  }

  /*
   * Actual game.
   */
  return (
    <div className="app-layout">

      <div className="topbar">

        <div className="brand-lockup">

          <span className="brand-mark">
            HT
          </span>

          <div>
            <span className="topbar-title">
              Terminal Zero
            </span>

            <span className="topbar-subtitle">
              Recovered shell / Noah drive
            </span>
          </div>

        </div>

        <div className="topbar-actions">

          {connectionLost && (
            <span className="status-pill warning">
              Connection lost. Attempting to reconnect...
            </span>
          )}

          <span className="status-pill">
            Event: {event?.state || 'UNKNOWN'}
          </span>

          <span className="status-pill">
            RollNo: {player.rollNo}
          </span>

          {/*
          Enable this later if you want the leaderboard
          available during the event.
          */}
          {/*
          <button
            className="secondary-button compact"
            type="button"
            onClick={() => setShowLeaderboard(true)}
          >
            Leaderboard
          </button>
          */}

          <button
            className="secondary-button compact"
            type="button"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </div>

      <div className="main-layout">

        <Terminal
          player={player}
          event={event}
          onPlayerUpdate={setPlayer}
          onEventUpdate={setEvent}
          onConnectionLost={onConnectionLost}
        />

        <Sidebar
          player={player}
          event={event}
          allCommands={meta.commands}
        />

      </div>

      {showLeaderboard && (
        <Leaderboard
          onClose={() => setShowLeaderboard(false)}
        />
      )}

    </div>
  );
}