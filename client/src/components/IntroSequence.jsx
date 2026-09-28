import React, { useEffect, useState } from 'react';

const SCENES = [
  {
    type: 'time',
    lines: ['03:17 AM'],
    caption: 'Three weeks ago, this machine was supposed to be dead.',
  },

  {
    type: 'terminal',
    lines: [
      '[03:17:04] RECOVERY NODE INITIALIZING...',
      '[03:17:05] STORAGE MOUNTED',
      '[03:17:05] UNKNOWN PARTITION FOUND',
      '[03:17:06] PARTITION STATUS: LOCKED',
    ],
    caption: 'The drive was recovered from a seized server rack.',
  },

  {
    type: 'diagnostic',
    lines: [
      'STORAGE ........ CORRUPTED',
      'NETWORK ........ REVOKED',
      'CREDENTIALS .... DELETED',
    ],
    caption: 'Nobody could get past the login screen.',
  },

  {
    type: 'alert',
    lines: [
      '[03:17:07] UNKNOWN PROCESS DETECTED',
      '[03:17:08] RECOVERY CONSOLE ACTIVE',
      '',
      '[03:17:08] INCOMING TRANSMISSION',
    ],
    caption: 'Then, last night, the machine connected by itself.',
  },

  {
    type: 'identity',
    lines: [
      'Noah',
      '',
      'LEAD SYSTEMS ARCHITECT',
      'STATUS: TERMINATED',
    ],
    caption: 'His exit was recorded as voluntary.',
  },

  {
    type: 'identity',
    lines: [
      'Noah',
      '',
      'LEAD SYSTEMS ARCHITECT',
      'STATUS: TERMINATED',
    ],
    caption: 'The machine disagreed.',
  },

  {
    type: 'story',
    lines: [
      'A MESSAGE WAS FOUND',
      '',
      'NO INSTRUCTIONS',
      'NO MAP',
      'NO EXPLANATION',
    ],
    caption: 'Noah knew someone might find this machine.',
  },

  {
    type: 'story',
    lines: [
      'HE DID NOT LEAVE',
      'A WAY FORWARD.',
      '',
      'HE LEFT A TRAIL.',
    ],
    caption: 'If you want to know what happened, you will have to follow it.',
  },

  {
    type: 'console',
    lines: [
      'RECOVERY CONSOLE',
      '----------------',
      '',
      'SYSTEM READY',
      '',
      '> _',
    ],
    caption: 'The console is waiting.',
  },

  {
    type: 'final',
    lines: [
      'RECOVERY LOG',
      '------------',
      '',
      'CONSOLE ACCESS READY',
      '',
      'OPERATOR: CONNECTED',
    ],
    caption: 'Whatever happened here is still inside.',
  },
];

function Typewriter({ text }) {
  const [visible, setVisible] = useState('');

  useEffect(() => {
    if (!text) {
      setVisible('');
      return undefined;
    }

    setVisible('');

    let index = 0;

    const timer = window.setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 22);

    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <>
      {visible}
      <span className="intro-caret">▋</span>
    </>
  );
}

export default function IntroSequence({ onComplete }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const scene = SCENES[sceneIndex];
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex === SCENES.length - 1;

  function nextScene() {
    if (exiting) return;

    if (isLast) {
      setExiting(true);

      window.setTimeout(() => {
        onComplete();
      }, 700);

      return;
    }

    setSceneIndex((current) => current + 1);
  }

  function previousScene() {
    if (exiting || isFirst) return;

    setSceneIndex((current) => Math.max(0, current - 1));
  }

  function skipIntro(event) {
    event.stopPropagation();

    if (exiting) return;

    setExiting(true);

    window.setTimeout(() => {
      onComplete();
    }, 700);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (exiting) return;

      if (
        event.code === 'Space' ||
        event.code === 'Enter' ||
        event.code === 'ArrowRight'
      ) {
        event.preventDefault();
        nextScene();
        return;
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        previousScene();
        return;
      }

      if (event.code === 'Escape') {
        event.preventDefault();

        setExiting(true);

        window.setTimeout(() => {
          onComplete();
        }, 700);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sceneIndex, exiting]);

  return (
    <div
      className={`intro-screen ${
        exiting ? 'intro-screen-exiting' : ''
      }`}
      onClick={nextScene}
      role="button"
      tabIndex={0}
      aria-label="Continue story"
    >
      <div className="intro-vignette" />
      <div className="intro-scanlines" />
      <div className="intro-noise" />

      <div
        key={sceneIndex}
        className={`intro-content intro-${scene.type}`}
      >
        <div className="intro-top-status">
          <span className="intro-status-dot" />
          <span>RECOVERY NODE // 03:17</span>
        </div>

        <div className="intro-terminal">
          {scene.lines.map((line, index) => (
            <div
              key={`${sceneIndex}-${index}`}
              className={`intro-line ${
                line === '' ? 'intro-line-empty' : ''
              }`}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {scene.caption && (
          <div className="intro-caption">
            <Typewriter text={scene.caption} />
          </div>
        )}
      </div>

      <div className="intro-controls">
        <div className="intro-navigation">
          {!isFirst && (
            <span className="intro-key">
              ← BACK
            </span>
          )}

          <span className="intro-key primary">
            {isLast
              ? 'ENTER TERMINAL'
              : 'SPACE / ENTER  CONTINUE'}
          </span>
        </div>

        <button
          type="button"
          className="intro-skip-button"
          onClick={skipIntro}
        >
          SKIP INTRO
        </button>
      </div>

      <div className="intro-progress">
        {SCENES.map((_, index) => (
          <span
            key={index}
            className={index <= sceneIndex ? 'active' : ''}
          />
        ))}
      </div>
    </div>
  );
}