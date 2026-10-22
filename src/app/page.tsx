'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Issue } from '@/lib/schema';
import { SAMPLE_ISSUE } from '@/lib/sample-issue';
import { formatDisplayDate } from '@/lib/config';

type ViewMode = 'loaded' | 'loading' | 'error' | 'empty' | 'config';

const SPLASH_DURATION = 3000;
const SPLASH_FADE = 700;

export default function ZizouApp() {
  const [issue, setIssue] = useState<Issue>(SAMPLE_ISSUE);
  const [view, setView] = useState<'home' | 'read'>('home');
  const [mode, setMode] = useState<ViewMode>('loaded');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [showInstall, setShowInstall] = useState<boolean>(false);
  const [cachedDate, setCachedDate] = useState<string>('');
  const [splashVisible, setSplashVisible] = useState<boolean>(true);
  const [splashFading, setSplashFading] = useState<boolean>(false);

  // Splash screen timer
  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), SPLASH_DURATION);
    const hideTimer = setTimeout(() => setSplashVisible(false), SPLASH_DURATION + SPLASH_FADE);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  // Synchronize hash routing (#/ and #/read) and offline status
  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash;
      if (/^#(s\d+|next|gloss)/.test(hash)) {
        setView('read');
        const elem = document.getElementById(hash.slice(1));
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (hash.startsWith('#/read')) {
        setView('read');
      } else {
        setView('home');
      }
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);

    const updateOnline = () => setIsOffline(false);
    const updateOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOffline);

    // Initial cache loading
    const todayStr = new Date().toISOString().slice(0, 10);
    const cachedToday = localStorage.getItem(`zizou_issue_${todayStr}`);
    const lastCached = localStorage.getItem('zizou_last_issue');

    if (cachedToday) {
      try {
        const parsed = JSON.parse(cachedToday);
        setIssue(parsed);
        setCachedDate(parsed.editionDate);
      } catch {
        // ignore
      }
    } else if (lastCached) {
      try {
        const parsed = JSON.parse(lastCached);
        setIssue(parsed);
        setCachedDate(parsed.editionDate);
      } catch {
        // ignore
      }
    } else {
      // Fetch live issue from /api/preview
      fetchIssue();
    }

    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOffline);
    };
  }, []);

  const fetchIssue = async () => {
    setMode('loading');
    try {
      const res = await fetch('/api/preview');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.issue) {
        setIssue(data.issue);
        setCachedDate(data.issue.editionDate);
        setMode('loaded');
        const todayStr = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`zizou_issue_${todayStr}`, JSON.stringify(data.issue));
        localStorage.setItem('zizou_last_issue', JSON.stringify(data.issue));
      } else {
        setMode('empty');
      }
    } catch {
      // If offline or request failed, fallback to cached
      const lastCached = localStorage.getItem('zizou_last_issue');
      if (lastCached) {
        try {
          const parsed = JSON.parse(lastCached);
          setIssue(parsed);
          setCachedDate(parsed.editionDate);
          setMode('loaded');
        } catch {
          setMode('error');
        }
      } else {
        setMode('error');
      }
    }
  };

  const handleDownloadPdf = () => {
    window.open('/api/pdf?download=true', '_blank');
  };

  const navigateTo = (target: 'home' | 'read') => {
    window.location.hash = target === 'read' ? '#/read' : '#/';
    setView(target);
    window.scrollTo(0, 0);
  };

  const formattedDate = issue ? formatDisplayDate(issue.editionDate) : 'Today';
  const sourceCount = issue
    ? new Set(issue.stories.map((s) => s.sourceName)).size
    : 4;

  const pdfSvg = (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 15v1.5h12V15" />
    </svg>
  );

  const reviewBar = (
    <div className="foot">
      <p style={{ margin: 0 }}>
        Prototype with sample content. Switch the view to review each state:
      </p>
      <div className="review" role="group" aria-label="Review states">
        {[
          ['loaded', 'Issue'],
          ['loading', 'Loading'],
          ['error', 'Error'],
          ['empty', 'Empty'],
          ['config', 'Setup'],
          ['offline', 'Offline'],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              if (k === 'offline') {
                setIsOffline(!isOffline);
              } else {
                setMode(k as ViewMode);
              }
            }}
            aria-pressed={k === 'offline' ? isOffline : mode === k}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  // State Views
  const renderStateView = () => {
    const backBtn = (
      <button
        className="link"
        type="button"
        onClick={() => navigateTo('home')}
      >
        Back to today
      </button>
    );

    if (mode === 'loading') {
      return (
        <div className="state" role="status" aria-live="polite">
          <h2>Preparing today’s edition</h2>
          <p>Gathering stories and writing them up. This usually takes under a minute.</p>
          <div className="sk" style={{ width: '90%' }}></div>
          <div className="sk" style={{ width: '100%' }}></div>
          <div className="sk" style={{ width: '70%' }}></div>
          <div className="sk" style={{ width: '85%' }}></div>
        </div>
      );
    }

    if (mode === 'error') {
      return (
        <div className="state" role="alert">
          <h2>Today’s edition didn’t finish</h2>
          <p>
            Something went wrong while preparing the issue. Nothing was lost, and no email
            was sent.
          </p>
          <ul>
            <li>Check your connection and try again.</li>
            <li>If it keeps failing, wait a few minutes. Some news sources may be slow.</li>
          </ul>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button className="btn" type="button" onClick={() => fetchIssue()}>
              Try again
            </button>
            {backBtn}
          </div>
        </div>
      );
    }

    if (mode === 'empty') {
      return (
        <div className="state">
          <h2>Not enough fresh stories yet</h2>
          <p>
            We need at least four recent, sourced stories to print an edition, and today’s
            sources have fewer. We don’t fill the gap with made-up news.
          </p>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button className="btn" type="button" onClick={() => fetchIssue()}>
              Check again
            </button>
            {backBtn}
          </div>
        </div>
      );
    }

    if (mode === 'config') {
      return (
        <div className="state">
          <h2>Setup isn’t finished</h2>
          <p>
            The owner needs to add the required settings on the server before editions can
            be made. No secrets are shown here.
          </p>
          <ul>
            <li>Open the README and follow the environment setup.</li>
            <li>Restart the app, then return to this page.</li>
          </ul>
          {backBtn}
        </div>
      );
    }

    return null;
  };

  return (
    <>
    {/* Splash Screen */}
    {splashVisible && (
      <div className={`splash${splashFading ? ' splash-out' : ''}`} aria-hidden="true">
        <div className="splash-inner">
          <svg className="splash-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
            <rect width="512" height="512" fill="none"/>
            <path d="M154 245c0-73 42-116 102-116s102 43 102 116v80H154Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="9"/>
            <path d="M176 210c15-43 41-69 80-73 39 4 65 30 80 73" fill="none" stroke="var(--ink)" strokeWidth="8" strokeLinecap="round"/>
            <ellipse cx="222" cy="244" rx="6" ry="9" fill="var(--ink)"/><ellipse cx="290" cy="244" rx="6" ry="9" fill="var(--ink)"/>
            <path d="M240 266c5 7 10 9 16 9s11-2 16-9" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round"/>
            <path d="M86 327c60-22 117-16 170 15v101c-53-31-110-38-170-19Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="9" strokeLinejoin="round"/>
            <path d="M256 342c54-31 112-37 170-15v97c-58-19-116-12-170 19Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="9" strokeLinejoin="round"/>
            <path d="M256 342v101" stroke="var(--ink)" strokeWidth="7"/>
            <path d="M107 350h121m-121 14h94m-94 14h105m65-28h123m-123 14h94m-94 14h105" fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <h1 className="splash-title">Zizou</h1>
          <p className="splash-credit">By Sudharshan</p>
        </div>
        <svg className="splash-plane" viewBox="260 70 230 260" aria-hidden="true">
          <path d="M426 312 469 91 278 190l93 22 55 100Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="9" strokeLinejoin="round"/>
          <path d="m371 212 98-121-43 221m-55-100-70-22" fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinejoin="round"/>
        </svg>
      </div>
    )}
    <div className="wrap" id="shell">
      {/* Masthead */}
      <header className="mast">
        <h1>
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
            }}
            aria-label="Zizou, home"
          >
            Zizou
          </a>
        </h1>
        <div className="ed">
          <span id="date">{formattedDate}</span>
          <span className={`live ${isOffline ? 'off' : ''}`}>
            <i aria-hidden="true"></i>
            <span id="livetxt">{isOffline ? 'Offline' : 'Edition live'}</span>
          </span>
        </div>
        <svg
          className="signalrule"
          viewBox="0 0 400 14"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 7h110l6-5 6 10 6-10 6 10 6-5h254"
            fill="none"
            stroke="var(--signal)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </header>

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="banner" id="banner" role="status">
          You’re offline. You can still read the last issue saved on this phone. Making a
          new issue needs a connection.
        </div>
      )}

      {/* Main Content Area */}
      <main id="main" tabIndex={-1}>
        {mode !== 'loaded' ? (
          renderStateView()
        ) : view === 'home' ? (
          /* ==================== HOME VIEW ==================== */
          <div className="home">
            <h2 className="issue-h">{issue.headline}</h2>
            <p className="dek">{issue.summary}</p>
            <p className="facts">
              <span>
                <b>About {issue.readingTimeMinutes || 5} min</b> read
              </span>
              <span>{issue.stories.length} stories</span>
              <span>{sourceCount} sources</span>
            </p>
            <div className="actions">
              <button
                className="btn"
                type="button"
                onClick={() => navigateTo('read')}
              >
                Read today’s edition
              </button>
              {isOffline ? (
                <button className="btn sec" disabled type="button">
                  PDF needs a connection
                </button>
              ) : (
                <button
                  className="btn sec"
                  type="button"
                  onClick={handleDownloadPdf}
                >
                  {pdfSvg}
                  Download PDF
                </button>
              )}
            </div>
            <section className="about" aria-labelledby="ab">
              <h2 id="ab">What this is</h2>
              <p>
                A short daily paper on AI, technology and careers, written in plain English
                with a link to every original source. A new edition is emailed at 08:00
                India time.
              </p>
              <button
                className="link"
                type="button"
                onClick={() => setShowInstall(true)}
              >
                How to install on iPhone
              </button>
            </section>
            {reviewBar}
          </div>
        ) : (
          /* ==================== READING VIEW ==================== */
          <div className="read">
            {/* Desktop Table of Contents Rail */}
            <nav className="rail" aria-label="In this issue">
              <h2>In this issue</h2>
              <ol>
                {issue.stories.map((s, i) => (
                  <li key={i}>
                    <a href={`#s${i}`}>{s.title}</a>
                  </li>
                ))}
                <li>
                  <a href="#next">Your next move</a>
                </li>
                <li>
                  <a href="#gloss">Glossary</a>
                </li>
              </ol>
            </nav>

            {/* Reading Article Body */}
            <article aria-label="Today’s edition">
              <div className="back">
                <button
                  className="link"
                  type="button"
                  onClick={() => navigateTo('home')}
                >
                  Back to today
                </button>
                {!isOffline && (
                  <button
                    className="btn sec sm"
                    type="button"
                    onClick={handleDownloadPdf}
                  >
                    {pdfSvg}
                    Download PDF
                  </button>
                )}
              </div>

              {isOffline && cachedDate && (
                <p className="cached">
                  Saved on this phone: edition of {cachedDate}
                </p>
              )}

              {/* Stories */}
              {issue.stories.map((s, i) => (
                <section
                  className="story"
                  id={`s${i}`}
                  key={i}
                  aria-labelledby={`t${i}`}
                >
                  <div className="sect">{s.section}</div>
                  <h2 id={`t${i}`}>{s.title}</h2>
                  <p className="by">
                    <b>{s.sourceName}</b>
                    <span>{issue.editionDate}</span>
                  </p>
                  <h3>What happened</h3>
                  <p>{s.whatHappened}</p>
                  <h3>Why it matters to you</h3>
                  <p>{s.whyItMatters}</p>
                  <div className="try">
                    <h3>Try this</h3>
                    <p>{s.nextStep}</p>
                  </div>
                  <a
                    className="src"
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>
                      Read the original at <b>{s.sourceName}</b>
                      <span className="sr"> (opens in a new tab)</span>
                    </span>
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8" />
                    </svg>
                  </a>
                </section>
              ))}

              {/* Your Next Move */}
              {issue.nextMoves && issue.nextMoves.length > 0 && (
                <section className="next" id="next" aria-labelledby="nh">
                  <h2 id="nh">Your next move</h2>
                  <p className="note">
                    Advice from the editor, not confirmed openings.
                  </p>
                  <ul>
                    {issue.nextMoves.map((m, idx) => (
                      <li key={idx}>{m.action}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Glossary */}
              {issue.glossary && issue.glossary.length > 0 && (
                <section className="gloss" id="gloss" aria-labelledby="gh">
                  <h2 id="gh">Glossary</h2>
                  <dl>
                    {issue.glossary.map((g, idx) => (
                      <React.Fragment key={idx}>
                        <dt>{g.term}</dt>
                        <dd>{g.definition}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </section>
              )}

              <div className="endbar">
                <button
                  className="btn"
                  type="button"
                  onClick={() => navigateTo('home')}
                >
                  Back to today
                </button>
                {!isOffline && (
                  <button
                    className="btn sec"
                    type="button"
                    onClick={handleDownloadPdf}
                  >
                    {pdfSvg}
                    Download PDF
                  </button>
                )}
              </div>

              {reviewBar}
            </article>
          </div>
        )}
      </main>

      {/* iPhone Install Dialog Modal */}
      {showInstall && (
        <dialog
          id="install"
          open
          aria-labelledby="ih"
          style={{
            position: 'fixed',
            inset: '0',
            margin: 'auto',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <Image
              src="/apple-touch-icon.png"
              alt="Zizou paper-plane logo"
              width={52}
              height={52}
              style={{
                borderRadius: '12px',
                border: '1.5px solid var(--ink)',
                boxShadow: '2px 2px 0 var(--ink)',
                flexShrink: 0,
              }}
            />
            <div>
              <h2 id="ih" style={{ margin: 0 }}>Install on iPhone</h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: 'var(--ink2)' }}>
                Add Zizou to your Home Screen
              </p>
            </div>
          </div>
          <ol>
            <li>
              Open this site in <b>Safari</b> on your iPhone.
            </li>
            <li>
              Tap the <b>Share</b> button at the bottom of the screen.
            </li>
            <li>
              Choose <b>Add to Home Screen</b>.
            </li>
            <li>
              Keep <b>Open as Web App</b> turned on, then tap <b>Add</b>.
            </li>
          </ol>
          <p className="tip">
            The icon lives on this iPhone only. Other devices need their own install.
          </p>
          <div style={{ marginTop: '18px' }}>
            <button
              className="btn full"
              type="button"
              onClick={() => setShowInstall(false)}
              autoFocus
            >
              Done
            </button>
          </div>
        </dialog>
      )}
    </div>
    </>
  );
}
