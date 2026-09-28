import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

function createCommandId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto);
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Terminal({ player, event, onPlayerUpdate, onEventUpdate, onConnectionLost }) {
  const [history, setHistory] = useState([
    {
      type: 'system',
      text: "Connection established. Type 'help' to see what you can do."
    },
    {
      type: 'system',
      text: "Try: cat readme.txt"
    }
  ]);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Automatically scroll terminal to bottom whenever history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input when component first loads
  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  // Keep cursor focused after every command / UI update
  useEffect(() => {
    if (!busy) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [busy, history]);

  async function submit(e) {
    e.preventDefault();

    const trimmed = input.trim();

    if (!trimmed || busy) return;

    // Add command to terminal history
    setHistory((h) => [
      ...h,
      {
        type: 'input',
        text: trimmed,
        cwd: player.cwd
      }
    ]);

    // Save command for Arrow Up / Arrow Down
    setCmdHistory((h) => [...h, trimmed]);

    setHistoryIdx(-1);
    setInput('');
    setBusy(true);

    try {
      const commandId = createCommandId();
      const {
        output,
        events = [],
        player: updated,
        event: updatedEvent
      } = await api.sendCommand(trimmed, commandId);

      // Handle clear command
      if (events.includes('CLEAR_SCREEN')) {
        setHistory([]);
      } else {
        setHistory((h) => [
          ...h,
          ...output.map((line) => ({
            type: events.includes('GAME_COMPLETE')
              ? 'complete'
              : 'output',
            text: line
          }))
        ]);
      }

      // Update player state
      onPlayerUpdate(updated);
      if (updatedEvent) onEventUpdate(updatedEvent);

    } catch (err) {
      if (err.data?.player) onPlayerUpdate(err.data.player);
      if (err.data?.event) onEventUpdate(err.data.event);
      if (!err.status) onConnectionLost?.();
      setHistory((h) => [
        ...h,
        {
          type: 'error',
          text: 'Connection error: ' + err.message
        }
      ]);
    } finally {
      // React will trigger the focus effect after busy becomes false
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    // Arrow UP → previous command
    if (e.key === 'ArrowUp') {
      e.preventDefault();

      if (cmdHistory.length === 0) return;

      const nextIdx =
        historyIdx === -1
          ? cmdHistory.length - 1
          : Math.max(0, historyIdx - 1);

      setHistoryIdx(nextIdx);
      setInput(cmdHistory[nextIdx]);
    }

    // Arrow DOWN → next command
    else if (e.key === 'ArrowDown') {
      e.preventDefault();

      if (historyIdx === -1) return;

      const nextIdx = historyIdx + 1;

      if (nextIdx >= cmdHistory.length) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        setHistoryIdx(nextIdx);
        setInput(cmdHistory[nextIdx]);
      }
    }
  }

  // Clicking anywhere on the terminal focuses the input
  function focusTerminal() {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  return (
    <section
      className="terminal-card"
      onClick={focusTerminal}
    >
      <div className="terminal-toolbar">

        <div
          className="window-controls"
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>

        <span className="terminal-title">
          /mnt/recovered-drive/zero-node 
        </span>

        <span
          className={`terminal-network ${
            busy ? 'busy' : ''
          }`}
        >
          {event?.state === 'PAUSED' ? 'paused' : busy ? 'syncing' : 'online'}
        </span>
      </div>

      <div className="terminal">

        <div
          className="terminal-scroll"
          ref={scrollRef}
        >
          {history.map((line, i) => (
            <div
              key={i}
              className={`term-line term-${line.type}`}
            >
              {line.type === 'input' ? (
                <>
                  <span className="prompt">
                    operator@zero-node:/$:{line.cwd}$
                  </span>{' '}
                  {line.text}
                </>
              ) : (
                line.text
              )}
            </div>
          ))}
        </div>

        <form
          className={`terminal-input-row ${
            busy ? 'is-busy' : ''
          }`}
          onSubmit={submit}
        >
          <span className="prompt">
            guest@ghost-system:{player.cwd}$
          </span>

          <input
            ref={inputRef}
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Terminal command input"
          />
        </form>

      </div>
    </section>
  );
}
