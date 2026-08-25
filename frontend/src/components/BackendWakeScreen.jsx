import React, { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';

/**
 * BackendWakeScreen
 *
 * Checks backend health before rendering children.
 * Uses effect-local variables (not refs) to avoid the React StrictMode
 * double-invocation bug where a stale ref prevents polling from restarting.
 *
 * States:
 *  - CHECKING : rapid first ping — shows empty dark overlay (no flash)
 *  - WAKING   : backend is cold-starting — shows animated wake card
 *  - READY    : backend is up — renders children
 */
export function BackendWakeScreen({ children }) {
  const [status, setStatus] = useState('CHECKING');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let pollingInterval = null;
    let timerInterval = null;
    let fadeTimeout = null;

    const poll = async () => {
      if (!isMounted) return;
      try {
        const controller = new AbortController();
        const abortTimeout = setTimeout(() => controller.abort(), 2000);
        await checkHealth(controller.signal);
        clearTimeout(abortTimeout);

        if (isMounted) {
          clearInterval(pollingInterval);
          clearInterval(timerInterval);
          setIsFadingOut(true);
          fadeTimeout = setTimeout(() => {
            if (isMounted) setStatus('READY');
          }, 400);
        }
      } catch {
        if (isMounted) {
          // Functional updater avoids stale closure — only switch CHECKING→WAKING
          setStatus(prev => (prev === 'CHECKING' ? 'WAKING' : prev));
        }
      }
    };

    // Immediate first check
    poll();
    // Retry every 3 s
    pollingInterval = setInterval(poll, 3000);
    // Elapsed-time ticker for status messages
    timerInterval = setInterval(() => {
      if (isMounted) setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
      clearInterval(timerInterval);
      clearTimeout(fadeTimeout);
    };
  }, []); // run once on mount — no dependency on `status` avoids restart loops

  const handleManualRetry = () => {
    // Simplest reliable retry: reload the page
    window.location.reload();
  };

  if (status === 'READY') {
    return <>{children}</>;
  }

  if (status === 'CHECKING') {
    // Minimal dark background during the initial ping to avoid a flash of the wake card
    return (
      <div
        className="wake-screen-container checking-mode"
        aria-hidden="true"
      />
    );
  }

  // --- WAKING state ---
  let message = 'Connecting to JobFinder...';
  if (elapsedTime > 5 && elapsedTime <= 15) {
    message = 'Your job engine is waking up…';
  } else if (elapsedTime > 15 && elapsedTime <= 30) {
    message = 'Still waking up — this may take a moment.';
  } else if (elapsedTime > 30) {
    message = 'JobFinder is taking longer than expected.';
  }

  return (
    <div className={`wake-screen-container${isFadingOut ? ' fade-out' : ''}`}>
      <div className="wake-ambient-glow" />

      <div className="wake-card">
        <h1 className="wake-brand">JOBFINDER</h1>
        <h2 className="wake-title">Your job engine is waking up</h2>
        <p className="wake-subtitle">
          The backend is starting. This usually takes a few seconds.
        </p>

        <div className="wake-animation-container" aria-hidden="true">
          <div className="orbit-spinner">
            <div className="orbit" />
            <div className="orbit" />
            <div className="orbit" />
          </div>
        </div>

        <div className="wake-status" aria-live="polite">
          <span className="status-dot" />
          <p>{message}</p>
        </div>

        {elapsedTime > 30 && (
          <button
            className="wake-retry-btn"
            onClick={handleManualRetry}
            aria-label="Reload the page to retry connecting to the API"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
