'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/authSlice';
import { useLogoutUserMutation } from '@/store/api/bandApi';

/**
 * 2 Hours in milliseconds = 2 * 60 * 60 * 1000 = 7,200,000 ms
 */
export const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;
export const SESSION_EXPIRES_KEY = 'tsg_session_expires_at';

export function setSessionTimeoutTimestamp(durationMs = SESSION_TIMEOUT_MS) {
  if (typeof window !== 'undefined') {
    const expiresAt = Date.now() + durationMs;
    localStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt));
  }
}

export function clearSessionTimeoutTimestamp() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_EXPIRES_KEY);
  }
}

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [logoutUser] = useLogoutUserMutation();
  const isTimingOutRef = useRef(false);

  // Function to perform immediate logout and throw user out to login page
  const triggerSessionTimeout = async () => {
    if (isTimingOutRef.current) return;
    isTimingOutRef.current = true;

    try {
      clearSessionTimeoutTimestamp();
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }
      await logoutUser().unwrap().catch(() => {});
    } catch {
      // ignore
    }

    dispatch(logout());

    // Throw out to login page with timeout indicator
    if (typeof window !== 'undefined') {
      window.location.href = '/?timeout=true';
    }
  };

  useEffect(() => {
    // If on the login page ('/') and not authenticated, clear any stale expiry
    if (pathname === '/' && !currentUser && !isAuthenticated) {
      isTimingOutRef.current = false;
      return;
    }

    // Only run active timeout monitor if user is authenticated or has a user profile
    if (!currentUser && !isAuthenticated) {
      return;
    }

    // Initialize or verify session expiration timestamp
    const now = Date.now();
    let storedExpiry = Number(localStorage.getItem(SESSION_EXPIRES_KEY));

    if (!storedExpiry || isNaN(storedExpiry)) {
      storedExpiry = now + SESSION_TIMEOUT_MS;
      localStorage.setItem(SESSION_EXPIRES_KEY, String(storedExpiry));
    } else if (now >= storedExpiry) {
      // Already expired!
      triggerSessionTimeout();
      return;
    }

    // Check every 3 seconds for session expiration
    const intervalId = setInterval(() => {
      const currentExpiry = Number(localStorage.getItem(SESSION_EXPIRES_KEY));
      if (currentExpiry && Date.now() >= currentExpiry) {
        clearInterval(intervalId);
        triggerSessionTimeout();
      }
    }, 3000);

    // Immediate check on tab focus or visibility change
    const checkImmediate = () => {
      const currentExpiry = Number(localStorage.getItem(SESSION_EXPIRES_KEY));
      if (currentExpiry && Date.now() >= currentExpiry) {
        clearInterval(intervalId);
        triggerSessionTimeout();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkImmediate();
      }
    };

    window.addEventListener('focus', checkImmediate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', checkImmediate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname, currentUser, isAuthenticated]);

  return <>{children}</>;
}
