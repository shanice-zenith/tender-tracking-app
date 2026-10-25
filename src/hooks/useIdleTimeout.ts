import { useState, useEffect, useCallback, useRef } from 'react';

// Default durations:
// 1 hour and 55 minutes = 115 minutes = 6,900,000 ms
// 2 hours = 120 minutes = 7,200,000 ms
const DEFAULT_WARNING_MS = 115 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 120 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = 'zenith_last_activity_timestamp';

interface UseIdleTimeoutOptions {
  enabled: boolean;
  onLogout: () => void;
  warningMs?: number;
  totalTimeoutMs?: number;
}

export function useIdleTimeout({
  enabled,
  onLogout,
  warningMs = DEFAULT_WARNING_MS,
  totalTimeoutMs = DEFAULT_TIMEOUT_MS
}: UseIdleTimeoutOptions) {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const lastThrottleRef = useRef<number>(Date.now());
  const logoutTriggeredRef = useRef<boolean>(false);

  // Throttled activity updater
  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleRef.current > 2000) {
      lastThrottleRef.current = now;
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
      } catch (e) {}
    }
  }, []);

  // Explicit user extension ("Keep Me Signed In")
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastThrottleRef.current = now;
    logoutTriggeredRef.current = false;
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
    } catch (e) {}
    setIsWarningOpen(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsWarningOpen(false);
      return;
    }

    logoutTriggeredRef.current = false;
    // Initialize timestamp if missing
    const existing = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleInteraction = () => {
      // While warning modal is shown, do not passively extend; user must explicitly click "Keep Me Signed In"
      if (!isWarningOpen) {
        recordActivity();
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleInteraction, { passive: true });
    });

    // High frequency interval (1 second) to inspect elapsed inactivity
    const interval = setInterval(() => {
      const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      const lastActivity = stored ? parseInt(stored, 10) : Date.now();
      const now = Date.now();
      const elapsed = now - lastActivity;

      if (elapsed >= totalTimeoutMs) {
        if (!logoutTriggeredRef.current) {
          logoutTriggeredRef.current = true;
          setIsWarningOpen(false);
          onLogout();
        }
      } else if (elapsed >= warningMs) {
        const remaining = Math.max(0, Math.ceil((totalTimeoutMs - elapsed) / 1000));
        setSecondsRemaining(remaining);
        setIsWarningOpen(true);
      } else {
        setIsWarningOpen(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleInteraction);
      });
      clearInterval(interval);
    };
  }, [enabled, warningMs, totalTimeoutMs, recordActivity, isWarningOpen, onLogout]);

  return {
    isWarningOpen,
    secondsRemaining,
    extendSession
  };
}
