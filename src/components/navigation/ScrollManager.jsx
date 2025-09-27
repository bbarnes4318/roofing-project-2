import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Ensures pages open at the top on normal navigation (PUSH/REPLACE)
// and restores the previous scroll position on browser back/forward (POP).
export default function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType(); // 'POP' | 'PUSH' | 'REPLACE'
  const positionsRef = useRef(new Map());

  // Track scroll position for the current history entry key
  useEffect(() => {
    const handleScroll = () => {
      positionsRef.current.set(location.key, window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.key]);

  // On route changes, decide whether to restore or scroll to top
  useEffect(() => {
    if (navigationType === 'POP') {
      const y = positionsRef.current.get(location.key) ?? 0;
      window.scrollTo({ top: y, left: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    // Note: include pathname, search, and hash to catch all route changes
  }, [location.pathname, location.search, location.hash, location.key, navigationType]);

  return null;
}
