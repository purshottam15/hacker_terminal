import React, { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const { player } = await api.registerPlayer(name.trim());
      localStorage.setItem('ht_player_id', player.id);
      onLogin(player);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <main className="login-console">
        <section className="login-box">
          <div className="login-box-top">
            <span className="login-led" />
            <span>dead man's switch</span>
          </div>
          <pre className="ascii-title">
{`  _   _    _    ____ _  _______ ____  ____  
 | | | |  / \\  / ___| |/ / ____|  _ \\/ ___| 
 | |_| | / _ \\| |   | ' /|  _| | |_) \\___ \\ 
 |  _  |/ ___ \\ |___| . \\| |___|  _ < ___) |
 |_| |_/_/   \\_\\____|_|\\_\\_____|_| \\_\\____/ 
`}
          </pre>
          <p className="login-copy">
            Unknown operator detected. Identify yourself to open the recovered shell.
          </p>
          <form onSubmit={submit}>
            <label>
              <span>operator name</span>
              <input
                autoFocus
                placeholder="enter a name"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? 'connecting...' : 'connect'}
            </button>
          </form>
          {error && <p className="login-error">{error}</p>}
        </section>

        <aside className="login-dossier" aria-label="Session dossier">
          <div>
            <span className="dossier-label">case</span>
            <strong>Project CHRYSALIS</strong>
          </div>
          <div>
            <span className="dossier-label">source</span>
            <strong>K. Ashworth drive</strong>
          </div>
          <div>
            <span className="dossier-label">status</span>
            <strong>air-gapped relay live</strong>
          </div>
        </aside>
      </main>
    </div>
  );
}
