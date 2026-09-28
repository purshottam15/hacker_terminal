
import React, { useState } from 'react';
import { api } from '../api.js';
import '../style/login.css';

export default function Login({ onLogin }) {
  const [rollNo, setRollNo] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!rollNo.trim() || !pin) {
      setError('Roll number and access PIN are required.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const data = await api.login(rollNo.trim(), pin);

      if (onLogin) {
        onLogin(data);
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-container">

        {/* Header */}
        <div className="login-header">
          <div className="login-brand">
            <span className="login-brand-mark">TZ</span>

            <div>
              <div className="login-brand-title">
                TERMINAL ZERO
              </div>

              <div className="login-brand-subtitle">
                SECURE ACCESS NODE
              </div>
            </div>
          </div>

          <div className="login-status">
            <span className="login-status-dot" />
            SYSTEM ONLINE
          </div>
        </div>

        {/* Login content */}
        <div className="login-content">

          <div className="login-kicker">
            AUTHENTICATION // NODE-01
          </div>

          <h1>ACCESS REQUIRED</h1>

          <p className="login-description">
            Authenticate to access the Terminal Zero system.
          </p>

          <form onSubmit={handleSubmit}>

            {/* Roll number */}
            <label>
              ROLL NUMBER

              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="Enter roll number"
                autoComplete="username"
                disabled={busy}
              />
            </label>

            {/* PIN */}
            <label>
              ACCESS PIN

              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter access PIN"
                autoComplete="current-password"
                disabled={busy}
              />
            </label>

            {/* Error */}
            {error && (
              <div className="login-error">
                &gt; {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
            >
              <span>&gt;_</span>

              {busy
                ? 'AUTHENTICATING...'
                : 'AUTHENTICATE'}
            </button>

          </form>

          {/* Connection status */}
          <div className="login-footer-status">
            <span>●</span>
            ENCRYPTED CONNECTION
          </div>

        </div>

        {/* Footer */}
        <div className="login-bottom">
          <span>TERMINAL ZERO</span>
          <span>AUTHORIZED PARTICIPANTS ONLY</span>
        </div>

      </div>
    </div>
  );
}
