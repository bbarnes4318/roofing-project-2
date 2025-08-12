import { useState, useCallback, useEffect, useRef } from 'react';

// Navigation History Hook for tracking user navigation and preserving position/context
export const useNavigationHistory = () => {
    const [history, setHistory] = useState([]);
    const currentPageRef = useRef(null);
    const STORAGE_KEY = 'nav_history';
    const MAX_HISTORY_LENGTH = 50; // Limit to prevent excessive storage usage

    // Load history from sessionStorage on mount
    useEffect(() => {
        try {
            const storedHistory = sessionStorage.getItem(STORAGE_KEY);
            if (storedHistory) {
                const parsed = JSON.parse(storedHistory);
                if (Array.isArray(parsed)) {
                    setHistory(parsed);
                }
            }
        } catch (error) {
            console.warn('Failed to load navigation history:', error);
            // Clear corrupted data
            sessionStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    // Save history to sessionStorage whenever it changes
    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        } catch (error) {
            console.warn('Failed to save navigation history:', error);
        }
    }, [history]);

    // Get current scroll position and form data for position preservation
    const capturePageState = useCallback(() => {
        const scrollPosition = {
            x: window.scrollX || window.pageXOffset || document.documentElement.scrollLeft,
            y: window.scrollY || window.pageYOffset || document.documentElement.scrollTop
        };

        // Capture form inputs if any exist
        const formData = {};
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.name || input.id) {
                const key = input.name || input.id;
                if (input.type === 'checkbox' || input.type === 'radio') {
                    formData[key] = input.checked;
                } else {
                    formData[key] = input.value;
                }
            }
        });

        // Capture selected/active elements
        const activeElements = [];
        const activeCards = document.querySelectorAll('[data-selected="true"], .selected, .active');
        activeCards.forEach(el => {
            if (el.dataset.projectId || el.dataset.itemId || el.id) {
                activeElements.push({
                    selector: el.dataset.projectId ? `[data-project-id="${el.dataset.projectId}"]` :
                             el.dataset.itemId ? `[data-item-id="${el.dataset.itemId}"]` :
                             `#${el.id}`,
                    type: 'active'
                });
            }
        });

        return {
            scrollPosition,
            formData,
            activeElements,
            timestamp: Date.now()
        };
    }, []);

    // Restore page state (scroll position, form data, etc.)
    const restorePageState = useCallback((pageState) => {
        if (!pageState) return;

        // Restore scroll position
        if (pageState.scrollPosition) {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                window.scrollTo({
                    left: pageState.scrollPosition.x,
                    top: pageState.scrollPosition.y,
                    behavior: 'auto'
                });
            }, 50);

            // Fallback for smooth restoration
            setTimeout(() => {
                window.scrollTo({
                    left: pageState.scrollPosition.x,
                    top: pageState.scrollPosition.y,
                    behavior: 'smooth'
                });
            }, 200);
        }

        // Restore form data
        if (pageState.formData) {
            Object.entries(pageState.formData).forEach(([key, value]) => {
                const input = document.querySelector(`[name="${key}"], #${key}`);
                if (input) {
                    if (input.type === 'checkbox' || input.type === 'radio') {
                        input.checked = value;
                    } else {
                        input.value = value;
                    }
                    // Trigger change event
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }

        // Restore active elements
        if (pageState.activeElements) {
            setTimeout(() => {
                pageState.activeElements.forEach(({ selector, type }) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        if (type === 'active') {
                            element.classList.add('selected', 'active');
                            element.dataset.selected = 'true';
                        }
                    }
                });
            }, 100);
        }
    }, []);

    // Push a new navigation entry
    const pushNavigation = useCallback((pageName, pageData = {}, customState = {}) => {
        // Capture current page state before navigating
        const currentState = capturePageState();
        
        const newEntry = {
            id: Date.now().toString(),
            pageName,
            pageData,
            pageState: { ...currentState, ...customState },
            timestamp: Date.now(),
            url: window.location.href,
            pathname: window.location.pathname,
            search: window.location.search
        };

        setHistory(prev => {
            const newHistory = [...prev, newEntry];
            // Keep only the most recent entries to prevent excessive storage
            return newHistory.slice(-MAX_HISTORY_LENGTH);
        });

        currentPageRef.current = newEntry;
    }, [capturePageState]);

    // Navigate back to previous page
    const goBack = useCallback(() => {
        if (history.length === 0) {
            // No history available - use browser back as fallback
            window.history.back();
            return null;
        }

        // Remove current entry and get previous
        setHistory(prev => {
            const newHistory = prev.slice(0, -1);
            return newHistory;
        });

        const previousEntry = history[history.length - 2] || history[history.length - 1];
        
        if (previousEntry) {
            currentPageRef.current = previousEntry;
            
            // Restore the page state after a brief delay to ensure page is rendered
            setTimeout(() => {
                restorePageState(previousEntry.pageState);
            }, 100);

            return {
                pageName: previousEntry.pageName,
                pageData: previousEntry.pageData,
                pageState: previousEntry.pageState
            };
        }

        return null;
    }, [history, restorePageState]);

    // Get the previous navigation entry without modifying history
    const getPrevious = useCallback(() => {
        if (history.length < 2) return null;
        
        const previousEntry = history[history.length - 2];
        return {
            pageName: previousEntry.pageName,
            pageData: previousEntry.pageData,
            pageState: previousEntry.pageState
        };
    }, [history]);

    // Check if back navigation is available
    const canGoBack = useCallback(() => {
        return history.length > 1;
    }, [history]);

    // Clear navigation history
    const clearHistory = useCallback(() => {
        setHistory([]);
        currentPageRef.current = null;
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to clear navigation history:', error);
        }
    }, []);

    // Update current page state without creating new history entry
    const updateCurrentPageState = useCallback((updates) => {
        if (currentPageRef.current) {
            const updatedState = {
                ...currentPageRef.current.pageState,
                ...updates,
                timestamp: Date.now()
            };
            
            currentPageRef.current.pageState = updatedState;
            
            // Update in history array
            setHistory(prev => {
                const newHistory = [...prev];
                if (newHistory.length > 0) {
                    newHistory[newHistory.length - 1].pageState = updatedState;
                }
                return newHistory;
            });
        }
    }, []);

    // Get current page information
    const getCurrentPage = useCallback(() => {
        return currentPageRef.current;
    }, []);

    // Replace current navigation entry (useful for redirects)
    const replaceNavigation = useCallback((pageName, pageData = {}, customState = {}) => {
        const currentState = capturePageState();
        
        const newEntry = {
            id: Date.now().toString(),
            pageName,
            pageData,
            pageState: { ...currentState, ...customState },
            timestamp: Date.now(),
            url: window.location.href,
            pathname: window.location.pathname,
            search: window.location.search
        };

        setHistory(prev => {
            const newHistory = [...prev];
            if (newHistory.length > 0) {
                newHistory[newHistory.length - 1] = newEntry;
            } else {
                newHistory.push(newEntry);
            }
            return newHistory;
        });

        currentPageRef.current = newEntry;
    }, [capturePageState]);

    // Get navigation breadcrumbs for UI display
    const getBreadcrumbs = useCallback(() => {
        return history.map(entry => ({
            id: entry.id,
            pageName: entry.pageName,
            timestamp: entry.timestamp,
            url: entry.url
        }));
    }, [history]);

    return {
        // Navigation methods
        pushNavigation,
        goBack,
        getPrevious,
        canGoBack,
        clearHistory,
        
        // State management
        updateCurrentPageState,
        getCurrentPage,
        replaceNavigation,
        
        // Utility methods
        capturePageState,
        restorePageState,
        getBreadcrumbs,
        
        // Current state
        history,
        historyLength: history.length
    };
};

export default useNavigationHistory;