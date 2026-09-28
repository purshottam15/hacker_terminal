
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/landing.css';

export default function LandingPage({ onEnter }) {
  const [booted, setBooted] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const navigate = useNavigate();

  function enterSystem() {
    navigate('/login');
  }

  useEffect(() => {
    const bootTimer = setTimeout(() => setBooted(true), 700);
    const contentTimer = setTimeout(() => setShowContent(true), 1200);

    return () => {
      clearTimeout(bootTimer);
      clearTimeout(contentTimer);
    };
  }, []);

  return (
    <div className="landing-page">

      {/* =====================================================
          BACKGROUND
          ===================================================== */}

      <div className="landing-grid" />
      <div className="landing-noise" />
      <div className="landing-vignette" />


      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="landing-header">

        <div className="landing-brand">

          <div className="landing-brand-mark">
            ACM
          </div>

          <div>
            <div className="landing-brand-title">
              TERMINAL ZERO
            </div>

            <div className="landing-brand-subtitle">
              ACM // CYBER CHALLENGE
            </div>
          </div>

        </div>


        <div className="landing-status">
          <span className="status-dot" />
          SYSTEM ONLINE
        </div>

      </header>


      {/* =====================================================
          MAIN HERO
          ===================================================== */}

      <main className="landing-main">

        <div className="landing-terminal-label">
          <span>&gt;</span>
          TERMINAL ZERO
          <span className="terminal-cursor">_</span>
        </div>


        <div
          className={`landing-hero ${
            showContent ? 'visible' : ''
          }`}
        >

          <p className="landing-eyebrow">
            AN INTERACTIVE CYBER CHALLENGE
          </p>


          <h1>
            TERMINAL
            <span> ZERO</span>
          </h1>


          <p className="landing-description">
            Something was left behind.

            <br />
           Someone wanted it to be found.
          </p>


          <div className="landing-divider">
            <span />
            <span className="divider-node" />
            <span />
          </div>


          <p className="landing-story">
            Enter a simulated terminal built around commands,
            <br />
            hidden files, clues and encrypted paths.
            <br />
            <strong>Nothing is given. Everything must be discovered.</strong>
          </p>


          <button
            type="button"
            className="enter-system-button"
            onClick={enterSystem}
          >
            <span className="button-prefix">
              &gt;_
            </span>

            ENTER TERMINAL ZERO

            <span className="button-arrow">
              →
            </span>
          </button>


          <div className="landing-hint">
            <span className="blink">
              ●
            </span>

            ACCESS POINT READY
          </div>

        </div>


        {/* =====================================================
            SYSTEM STATUS PANEL
            ===================================================== */}

        <div
          className={`landing-system-panel ${
            booted ? 'visible' : ''
          }`}
        >

          <div className="system-panel-header">

            <span>
              TERMINAL STATUS
            </span>

            <span>
              TZ-01
            </span>

          </div>


          <div className="system-panel-body">

            <div>
              <span className="system-key">
                SYSTEM
              </span>

              <span className="system-value online">
                ONLINE
              </span>
            </div>


            <div>
              <span className="system-key">
                ENVIRONMENT
              </span>

              <span className="system-value">
                TERMINAL
              </span>
            </div>


            <div>
              <span className="system-key">
                ACCESS
              </span>

              <span className="system-value warning">
                RESTRICTED
              </span>
            </div>


            <div>
              <span className="system-key">
                CHALLENGE
              </span>

              <span className="system-value">
                READY
              </span>
            </div>


            <div>
              <span className="system-key">
                TRACE
              </span>

              <span className="system-value">
                ACTIVE
              </span>
            </div>

          </div>

        </div>

      </main>


      {/* =====================================================
          HOW IT WORKS
          ===================================================== */}

      <section className="landing-info">

        <div className="info-block">

          <span className="info-number">
            01
          </span>

          <div>

            <h3>
              CONNECT
            </h3>

            <p>
              Enter Terminal Zero and access the simulated
              environment using your participant credentials.
            </p>

          </div>

        </div>


        <div className="info-block">

          <span className="info-number">
            02
          </span>

          <div>

            <h3>
              INVESTIGATE
            </h3>

            <p>
              Explore commands, files, clues and hidden
              paths to uncover what the system is hiding.
            </p>

          </div>

        </div>


        <div className="info-block">

          <span className="info-number">
            03
          </span>

          <div>

            <h3>
              BREAK THROUGH
            </h3>

            <p>
              Solve the challenges, unlock new capabilities
              and reach the deepest layer of Terminal Zero.
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="landing-footer">

        <span>
          TERMINAL ZERO // ACM CYBER CHALLENGE
        </span>

        <span>
          AUTHORIZED PARTICIPANTS ONLY
        </span>

      </footer>

    </div>
  );
}

