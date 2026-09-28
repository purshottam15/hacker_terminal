import React, { useEffect, useState } from 'react';
import {
  
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { api } from './api.js';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import GamePage from './pages/GamePage.jsx';
import AdminPage from './pages/AdminPage.jsx';

import ProtectedRoute from './Routes/ProtectedRoute.jsx';
import AdminRoute from './Routes/AdminRoute.jsx';

// import './style/landing.css';
import './styles.css';

export default function App() {
  const [player, setPlayer] = useState(null);
  const [event, setEvent] = useState(null);
  const [meta, setMeta] = useState(null);

  const [loading, setLoading] = useState(true);
  const [connectionLost, setConnectionLost] = useState(false);

  function applyServerData(data) {
    if (!data) return;

    if (data.player) {
      setPlayer(data.player);
    }

    if (data.event) {
      setEvent(data.event);
    }
  }

  /*
   * Load current authenticated user and game state.
   */
  async function refresh() {
    try {
      const data = await api.me();

      applyServerData(data);

      if (data.player?.role === 'participant') {
        const state = await api.getGameState().catch(() => null);

        if (state) {
          applyServerData(state);
        }
      }

      setConnectionLost(false);

      return data;
    } catch (err) {
      setConnectionLost(true);
      throw err;
    }
  }

  /*
   * Initial application load.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const metaData = await api
          .getMeta()
          .catch(() => ({
            commands: [],
            totalLevels: 20
          }));

        if (cancelled) return;

        setMeta(metaData);

        const meData = await api.me().catch((err) => {
          if (err.status === 401) {
            return null;
          }

          throw err;
        });

        if (cancelled) return;

        if (meData) {
          applyServerData(meData);

          /*
           * If participant is already playing,
           * immediately recover the current game state.
           */
          if (meData.player?.role === 'participant') {
            const state = await api
              .getGameState()
              .catch(() => null);

            if (!cancelled && state) {
              applyServerData(state);
            }
          }
        }

        setConnectionLost(false);

      } catch (err) {
        if (!cancelled) {
          setConnectionLost(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Participant heartbeat.
   */
  useEffect(() => {
    if (!player) {
      return undefined;
    }

    const heartbeat = async () => {
      try {
        await api.heartbeat();
        setConnectionLost(false);
      } catch {
        setConnectionLost(true);
      }
    };

    heartbeat();

    const id = setInterval(
      heartbeat,
      30000
    );

    return () => {
      clearInterval(id);
    };
  }, [player?.id]);

  /*
   * Browser network connection handling.
   */
  useEffect(() => {
    function onOnline() {
      refresh().catch(() => {
        setConnectionLost(true);
      });
    }

    function onOffline() {
      setConnectionLost(true);
    }

    window.addEventListener(
      'online',
      onOnline
    );

    window.addEventListener(
      'offline',
      onOffline
    );

    return () => {
      window.removeEventListener(
        'online',
        onOnline
      );

      window.removeEventListener(
        'offline',
        onOffline
      );
    };
  }, []);

  /*
   * Logout.
   */
  async function logout() {
    await api.logout().catch(() => {});

    setPlayer(null);
    setEvent(null);
  }

  /*
   * Loading screen.
   */
  if (loading || !meta) {
    return (
      <div className="loading-screen">
        connecting...
      </div>
    );
  }

  return (
   

      <Routes>

        {/* =================================================
            LANDING
           ================================================= */}

        <Route
          path="/"
          element={
            <LandingPage />
          }
        />


        {/* =================================================
            LOGIN
           ================================================= */}

        <Route
          path="/login"
          element={
            player ? (
              player.role === 'admin' ? (
                <Navigate
                  to="/admin"
                  replace
                />
              ) : (
                <Navigate
                  to="/game"
                  replace
                />
              )
            ) : (
              <LoginPage
                onLogin={applyServerData}
              />
            )
          }
        />


        {/* =================================================
            PLAYER GAME
           ================================================= */}

        <Route
          path="/game"
          element={
            <ProtectedRoute
              player={player}
            >
              <GamePage
                player={player}
                event={event}
                meta={meta}
                connectionLost={connectionLost}
                setPlayer={setPlayer}
                setEvent={setEvent}
                onConnectionLost={() =>
                  setConnectionLost(true)
                }
                onLogout={logout}
              />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN
           ================================================= */}

        <Route
          path="/admin"
          element={
            <AdminRoute
              player={player}
            >
              <AdminPage
                player={player}
                onLogout={logout}
              />
            </AdminRoute>
          }
        />


        {/* =================================================
            UNKNOWN URL
           ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    
  );
}