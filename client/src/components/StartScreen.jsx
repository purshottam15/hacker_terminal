
import React, { useState } from 'react';
import { api } from '../api.js';
import IntroSequence from './IntroSequence.jsx';

export default function StartScreen({
  player,
  event,
  onStarted,
  onLogout,
}) {
  const [confirming, setConfirming] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const eventReady = event?.state === 'RUNNING';

  async function startGameAfterIntro() {
    setBusy(true);
    setError('');

    try {
      /*
       * IMPORTANT:
       * The game timer starts only after the cinematic.
       * Therefore the introduction does NOT consume game time.
       */
      const data = await api.startGame();
      onStarted(data);
    } catch (err) {
      setError(err?.message || 'Unable to start the game.');
      setShowIntro(false);
      setBusy(false);
    }
  }

  function beginIntro() {
    setError('');
    setShowIntro(true);
  }

  /*
   * Cinematic introduction
   */
  if (showIntro) {
    return (
      <IntroSequence
        onComplete={startGameAfterIntro}
      />
    );
  }

  return (
    <>
      <style>{`
        /* =====================================================
           TERMINAL ZERO — START SCREEN
        ===================================================== */

        .tz-start-screen {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 32px;

          color: #eaf6ff;

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          background:
            radial-gradient(
              circle at 50% 35%,
              rgba(50, 130, 180, 0.12),
              transparent 38%
            ),
            radial-gradient(
              circle at 10% 90%,
              rgba(0, 150, 220, 0.06),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #05080b 0%,
              #081116 48%,
              #04080b 100%
            );
        }

        /* Grid */
        .tz-start-screen::before {
          content: "";
          position: absolute;
          inset: 0;

          pointer-events: none;

          background:
            linear-gradient(
              rgba(120, 200, 255, 0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(120, 200, 255, 0.035) 1px,
              transparent 1px
            );

          background-size: 64px 64px;

          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 92%
          );

          opacity: 0.65;
        }

        /* Scanlines */
        .tz-start-screen::after {
          content: "";
          position: absolute;
          inset: 0;

          pointer-events: none;

          background:
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.018) 0px,
              rgba(255,255,255,0.018) 1px,
              transparent 1px,
              transparent 4px
            );

          opacity: 0.3;
        }

        .tz-start-container {
          width: min(920px, 100%);

          position: relative;
          z-index: 2;

          animation: tzStartAppear 500ms ease-out both;
        }

        /* =====================================================
           TOP HEADER
        ===================================================== */

        .tz-start-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          margin-bottom: 18px;

          padding: 0 2px;
        }

        .tz-start-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tz-start-mark {
          width: 42px;
          height: 42px;

          display: grid;
          place-items: center;

          border: 1px solid rgba(100, 210, 255, 0.42);
          border-radius: 6px;

          color: #76d9ff;

          background:
            linear-gradient(
              180deg,
              rgba(100, 210, 255, 0.1),
              rgba(100, 210, 255, 0.025)
            ),
            #071016;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-weight: 800;
          letter-spacing: 0.04em;

          box-shadow:
            inset 0 0 20px rgba(70, 190, 255, 0.08),
            0 0 25px rgba(30, 150, 220, 0.06);
        }

        .tz-start-brand-title {
          color: #eaf6ff;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 14px;
          font-weight: 800;

          letter-spacing: 0.08em;
        }

        .tz-start-brand-subtitle {
          margin-top: 3px;

          color: #6d8490;

          font-size: 10px;
          letter-spacing: 0.13em;
        }

        .tz-start-status {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #6f8b98;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 10px;
          letter-spacing: 0.1em;
        }

        .tz-start-status-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #62d5ff;

          box-shadow:
            0 0 7px #62d5ff,
            0 0 18px rgba(98, 213, 255, 0.45);

          animation: tzStatusBlink 1.5s steps(2) infinite;
        }

        /* =====================================================
           MAIN PANEL
        ===================================================== */

        .tz-start-panel {
          position: relative;

          border: 1px solid rgba(115, 185, 215, 0.18);
          border-radius: 8px;

          background:
            linear-gradient(
              135deg,
              rgba(17, 30, 38, 0.96),
              rgba(6, 13, 17, 0.97)
            );

          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.52),
            inset 0 1px rgba(255, 255, 255, 0.055);

          overflow: hidden;
        }

        .tz-start-panel::before {
          content: "";

          position: absolute;
          inset: 0;

          pointer-events: none;

          background:
            linear-gradient(
              90deg,
              rgba(82, 205, 255, 0.055),
              transparent 35%,
              transparent 70%,
              rgba(82, 205, 255, 0.025)
            );
        }

        /* =====================================================
           PANEL HEADER
        ===================================================== */

        .tz-panel-header {
          min-height: 48px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 18px;

          border-bottom: 1px solid rgba(255,255,255,0.07);

          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,0.045),
              rgba(255,255,255,0.012)
            );

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 10px;
          letter-spacing: 0.12em;

          color: #75909c;
        }

        .tz-panel-header-left {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .tz-window-dots {
          display: flex;
          gap: 5px;
        }

        .tz-window-dots span {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #39515c;
        }

        .tz-window-dots span:nth-child(3) {
          background: #4b9ebd;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .tz-start-content {
          padding: 46px 48px 38px;
        }

        .tz-kicker {
          display: flex;
          align-items: center;
          gap: 9px;

          margin-bottom: 18px;

          color: #6fbfdd;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 11px;
          letter-spacing: 0.16em;
        }

        .tz-kicker-line {
          width: 32px;
          height: 1px;

          background: #4daed3;

          box-shadow: 0 0 8px rgba(77,174,211,0.35);
        }

        .tz-start-content h1 {
          margin: 0;

          color: #eef8ff;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: clamp(36px, 6vw, 66px);

          line-height: 0.95;

          letter-spacing: -0.04em;

          font-weight: 800;
        }

        .tz-start-content h1 span {
          color: #61cdf5;

          text-shadow:
            0 0 22px rgba(97,205,245,0.18);
        }

        .tz-start-description {
          max-width: 600px;

          margin: 22px 0 0;

          color: #8298a4;

          font-size: 15px;
          line-height: 1.7;
        }

        /* =====================================================
           PLAYER INFORMATION
        ===================================================== */

        .tz-player-block {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            minmax(180px, 0.55fr);

          gap: 10px;

          margin-top: 32px;
        }

        .tz-player-card {
          min-height: 82px;

          display: flex;
          flex-direction: column;
          justify-content: center;

          padding: 15px 17px;

          border: 1px solid rgba(120,180,205,0.12);
          border-radius: 5px;

          background: rgba(255,255,255,0.025);
        }

        .tz-player-label {
          color: #59717d;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 9px;

          letter-spacing: 0.13em;

          margin-bottom: 7px;
        }

        .tz-player-value {
          color: #dceef6;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 15px;
          font-weight: 700;

          overflow-wrap: anywhere;
        }

        /* =====================================================
           EVENT STATUS
        ===================================================== */

        .tz-event-status {
          display: flex;
          align-items: center;
          gap: 9px;

          margin-top: 18px;

          padding: 10px 12px;

          border-left: 2px solid #4bbde8;

          background: rgba(75,189,232,0.045);

          color: #7894a0;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 11px;
        }

        .tz-event-status.ready {
          color: #79d6f5;

          border-left-color: #65d5ff;
        }

        .tz-event-status.waiting {
          color: #d4a85c;

          border-left-color: #d4a85c;
        }

        .tz-event-status-dot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: currentColor;
        }

        /* =====================================================
           ERROR
        ===================================================== */

        .tz-error {
          margin-top: 16px;

          padding: 11px 13px;

          border: 1px solid rgba(255,105,105,0.2);
          border-radius: 4px;

          background: rgba(255,105,105,0.055);

          color: #ff8585;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 11px;
        }

        /* =====================================================
           ACTIONS
        ===================================================== */

        .tz-actions {
          display: flex;
          align-items: center;

          gap: 10px;

          margin-top: 30px;
        }

        .tz-primary-button {
          min-height: 46px;

          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;

          padding: 0 20px;

          border: 1px solid rgba(92,205,245,0.45);
          border-radius: 5px;

          color: #021016;

          background:
            linear-gradient(
              180deg,
              #79dcff,
              #3aaed4
            );

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 11px;
          font-weight: 800;

          letter-spacing: 0.06em;

          box-shadow:
            0 12px 28px rgba(30,150,200,0.16);

          transition:
            transform 150ms ease,
            filter 150ms ease,
            box-shadow 150ms ease;
        }

        .tz-primary-button:hover:not(:disabled) {
          filter: brightness(1.08);

          transform: translateY(-1px);

          box-shadow:
            0 16px 32px rgba(30,150,200,0.22);
        }

        .tz-primary-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .tz-primary-button:disabled {
          opacity: 0.35;

          cursor: not-allowed;

          box-shadow: none;
        }

        .tz-primary-button .button-prefix {
          opacity: 0.75;
        }

        .tz-secondary-button {
          min-height: 46px;

          padding: 0 17px;

          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 5px;

          color: #8ca2ac;

          background: rgba(255,255,255,0.035);

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 11px;

          transition:
            color 150ms ease,
            background 150ms ease;
        }

        .tz-secondary-button:hover {
          color: #d7e9f1;

          background: rgba(255,255,255,0.065);
        }

        .tz-logout {
          margin-left: auto;

          border: 0;

          padding: 8px;

          color: #50646d;

          background: transparent;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 10px;

          cursor: pointer;
        }

        .tz-logout:hover {
          color: #8ba4ae;
        }

        /* =====================================================
           CONFIRMATION
        ===================================================== */

        .tz-confirm-box {
          margin-top: 28px;

          padding: 20px;

          border: 1px solid rgba(91,202,240,0.18);
          border-radius: 5px;

          background:
            linear-gradient(
              135deg,
              rgba(70,180,220,0.055),
              rgba(255,255,255,0.018)
            );
        }

        .tz-confirm-title {
          margin: 0 0 8px;

          color: #dff4fc;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 16px;
          font-weight: 800;
        }

        .tz-confirm-text {
          margin: 0;

          color: #7f96a0;

          font-size: 13px;
          line-height: 1.6;
        }

        .tz-confirm-warning {
          display: flex;
          align-items: center;
          gap: 8px;

          margin-top: 15px;

          color: #d8ad61;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 10px;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .tz-start-footer {
          min-height: 44px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 18px;

          border-top: 1px solid rgba(255,255,255,0.06);

          color: #4d626c;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 9px;

          letter-spacing: 0.08em;
        }

        /* =====================================================
           ANIMATIONS
        ===================================================== */

        @keyframes tzStartAppear {
          from {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(2px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes tzStatusBlink {
          0%,
          45% {
            opacity: 1;
          }

          46%,
          100% {
            opacity: 0.3;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 700px) {
          .tz-start-screen {
            padding: 16px;
            align-items: flex-start;
            overflow-y: auto;
          }

          .tz-start-container {
            margin: auto 0;
          }

          .tz-start-header {
            align-items: flex-start;
          }

          .tz-start-status {
            display: none;
          }

          .tz-start-content {
            padding: 32px 22px 28px;
          }

          .tz-start-content h1 {
            font-size: 38px;
          }

          .tz-player-block {
            grid-template-columns: 1fr;
          }

          .tz-actions {
            flex-wrap: wrap;
          }

          .tz-primary-button,
          .tz-secondary-button {
            width: 100%;
          }

          .tz-logout {
            width: 100%;
            margin-left: 0;
            text-align: left;
          }

          .tz-start-footer {
            min-height: auto;
            padding: 12px 16px;
            gap: 8px;
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="tz-start-screen">
        <div className="tz-start-container">

          {/* HEADER */}
          <header className="tz-start-header">

            <div className="tz-start-brand">
              <div className="tz-start-mark">
                TZ
              </div>

              <div>
                <div className="tz-start-brand-title">
                  TERMINAL ZERO
                </div>

                <div className="tz-start-brand-subtitle">
                  SECURE SYSTEM // ACCESS NODE
                </div>
              </div>
            </div>

            <div className="tz-start-status">
              <span className="tz-start-status-dot" />
              SYSTEM ONLINE
            </div>

          </header>

          {/* MAIN PANEL */}
          <main className="tz-start-panel">

            <div className="tz-panel-header">

              <div className="tz-panel-header-left">
                <div className="tz-window-dots">
                  <span />
                  <span />
                  <span />
                </div>

                <span>
                  TERMINAL_ZERO // PRE-LAUNCH
                </span>
              </div>

              <span>
                NODE-01
              </span>

            </div>

            <div className="tz-start-content">

              <div className="tz-kicker">
                <span className="tz-kicker-line" />
                IDENTITY VERIFIED
              </div>

              {!confirming ? (
                <>
                  <h1>
                    SYSTEM
                    <br />
                    <span>READY.</span>
                  </h1>

                  <p className="tz-start-description">
                    Your identity has been verified. The Terminal Zero
                    environment is ready for access. Wait for the event
                    system to become active before beginning.
                  </p>

                  {/* PLAYER INFO */}
                  <div className="tz-player-block">

                    <div className="tz-player-card">
                      <span className="tz-player-label">
                        PARTICIPANT
                      </span>

                      <span className="tz-player-value">
                        {player?.name || 'UNKNOWN'}
                      </span>
                    </div>

                    <div className="tz-player-card">
                      <span className="tz-player-label">
                        ROLL NUMBER
                      </span>

                      <span className="tz-player-value">
                        {player?.rollNo || 'UNKNOWN'}
                      </span>
                    </div>

                  </div>

                  {/* EVENT STATUS */}
                  <div
                    className={`tz-event-status ${
                      eventReady ? 'ready' : 'waiting'
                    }`}
                  >
                    <span className="tz-event-status-dot" />

                    {eventReady
                      ? 'EVENT ONLINE // ACCESS AVAILABLE'
                      : `EVENT ${event?.state || 'UNKNOWN'} // WAITING FOR ORGANIZER`
                    }
                  </div>

                  {!eventReady && (
                    <div className="tz-error">
                      &gt; Event has not started yet. Please wait for the
                      organizer to activate Terminal Zero.
                    </div>
                  )}

                  {/* ACTIONS */}
                  <div className="tz-actions">

                    <button
                      type="button"
                      className="tz-primary-button"
                      disabled={!eventReady}
                      onClick={() => setConfirming(true)}
                    >
                      <span className="button-prefix">
                        &gt;_
                      </span>

                      START TERMINAL ZERO
                    </button>

                    <button
                      type="button"
                      className="tz-logout"
                      onClick={onLogout}
                    >
                      LOG OUT
                    </button>

                  </div>
                </>
              ) : (
                <>
                  <h1>
                    READY TO
                    <br />
                    <span>ENTER?</span>
                  </h1>

                  <div className="tz-confirm-box">

                    <h2 className="tz-confirm-title">
                      FINAL ACCESS CONFIRMATION
                    </h2>

                    <p className="tz-confirm-text">
                      You are about to enter the Terminal Zero
                      investigation environment.
                    </p>

                    <div className="tz-confirm-warning">
                      <span>!</span>

                      <span>
                        YOUR 45-MINUTE TIMER STARTS AFTER THE
                        INTRODUCTION.
                      </span>
                    </div>

                  </div>

                  <div className="tz-actions">

                    <button
                      type="button"
                      className="tz-primary-button"
                      disabled={busy}
                      onClick={beginIntro}
                    >
                      <span className="button-prefix">
                        &gt;_
                      </span>

                      {busy
                        ? 'INITIALIZING...'
                        : 'BEGIN INVESTIGATION'}
                    </button>

                    <button
                      type="button"
                      className="tz-secondary-button"
                      disabled={busy}
                      onClick={() => setConfirming(false)}
                    >
                      BACK
                    </button>

                    <button
                      type="button"
                      className="tz-logout"
                      disabled={busy}
                      onClick={onLogout}
                    >
                      LOG OUT
                    </button>

                  </div>
                </>
              )}

              {error && (
                <div className="tz-error">
                  &gt; {error}
                </div>
              )}

            </div>

            {/* FOOTER */}
            <footer className="tz-start-footer">
              <span>
                TERMINAL ZERO // AUTHORIZED PARTICIPANTS ONLY
              </span>

              <span>
                CONNECTION: SECURE
              </span>
            </footer>

          </main>

        </div>
      </div>
    </>
  );
}
