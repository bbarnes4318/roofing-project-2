import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const NavigationContext = createContext();

// Action types for navigation state management
const NAVIGATION_ACTIONS = {
  SET_CONTEXT: 'SET_CONTEXT',
  CLEAR_CONTEXT: 'CLEAR_CONTEXT',
  UPDATE_SCROLL_POSITION: 'UPDATE_SCROLL_POSITION',
  SET_FILTERS: 'SET_FILTERS',
  SET_EXPANDED_STATE: 'SET_EXPANDED_STATE',
  PUSH_NAVIGATION: 'PUSH_NAVIGATION',
  POP_NAVIGATION: 'POP_NAVIGATION'
};

// Initial state for navigation context
const initialState = {
  navigationStack: [],
  currentContext: null,
  scrollPositions: {},
  expandedStates: {},
  filters: {}
};

// Reducer to manage navigation state
function navigationReducer(state, action) {
  switch (action.type) {
    case NAVIGATION_ACTIONS.PUSH_NAVIGATION:
      return {
        ...state,
        navigationStack: [...state.navigationStack, action.payload],
        currentContext: action.payload
      };

    case NAVIGATION_ACTIONS.POP_NAVIGATION:
      const newStack = [...state.navigationStack];
      newStack.pop();
      return {
        ...state,
        navigationStack: newStack,
        currentContext: newStack[newStack.length - 1] || null
      };

    case NAVIGATION_ACTIONS.SET_CONTEXT:
      return {
        ...state,
        currentContext: { ...state.currentContext, ...action.payload }
      };

    case NAVIGATION_ACTIONS.CLEAR_CONTEXT:
      return {
        ...state,
        navigationStack: [],
        currentContext: null
      };

    case NAVIGATION_ACTIONS.UPDATE_SCROLL_POSITION:
      return {
        ...state,
        scrollPositions: {
          ...state.scrollPositions,
          [action.payload.contextId]: action.payload.position
        }
      };

    case NAVIGATION_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.contextId]: action.payload.filters
        }
      };

    case NAVIGATION_ACTIONS.SET_EXPANDED_STATE:
      return {
        ...state,
        expandedStates: {
          ...state.expandedStates,
          [action.payload.contextId]: action.payload.state
        }
      };

    default:
      return state;
  }
}

export function NavigationProvider({ children }) {
  const [state, dispatch] = useReducer(navigationReducer, initialState);
  const navigate = useNavigate();

  // Create a unique context ID for tracking
  const createContextId = useCallback((section, additionalData = {}) => {
    const timestamp = Date.now();
    const dataString = JSON.stringify(additionalData);
    return `${section}_${timestamp}_${btoa(dataString).slice(0, 10)}`;
  }, []);

  // Push a new navigation context onto the stack
  const pushNavigationContext = useCallback((contextData) => {
    const contextId = createContextId(contextData.section, contextData);
    const fullContext = {
      ...contextData,
      contextId,
      timestamp: Date.now()
    };

    dispatch({
      type: NAVIGATION_ACTIONS.PUSH_NAVIGATION,
      payload: fullContext
    });

    return contextId;
  }, [createContextId]);

  // Navigate to a subpage with context tracking
  const navigateWithContext = useCallback((path, contextData) => {
    // Save current scroll position if we're in a context
    if (state.currentContext) {
      const scrollY = window.scrollY;
      dispatch({
        type: NAVIGATION_ACTIONS.UPDATE_SCROLL_POSITION,
        payload: {
          contextId: state.currentContext.contextId,
          position: scrollY
        }
      });
    }

    // Push new navigation context
    const contextId = pushNavigationContext(contextData);

    // Navigate to the new path
    navigate(path);

    return contextId;
  }, [state.currentContext, pushNavigationContext, navigate]);

  // Navigate back to the previous context
  const navigateBack = useCallback(() => {
    if (state.navigationStack.length === 0) {
      // No context to go back to, use browser back
      navigate(-1);
      return;
    }

    // Pop current context from stack
    dispatch({ type: NAVIGATION_ACTIONS.POP_NAVIGATION });

    const previousContext = state.navigationStack[state.navigationStack.length - 2];
    
    if (previousContext) {
      // Navigate back to the previous context's path
      navigate(previousContext.returnPath);

      // Restore scroll position after navigation
      setTimeout(() => {
        const savedScrollPosition = state.scrollPositions[previousContext.contextId];
        if (savedScrollPosition !== undefined) {
          window.scrollTo(0, savedScrollPosition);
        }
      }, 100);
    } else {
      // No previous context, go to dashboard
      navigate('/dashboard');
    }
  }, [state.navigationStack, state.scrollPositions, navigate]);

  // Update scroll position for current context
  const updateScrollPosition = useCallback((position) => {
    if (state.currentContext) {
      dispatch({
        type: NAVIGATION_ACTIONS.UPDATE_SCROLL_POSITION,
        payload: {
          contextId: state.currentContext.contextId,
          position: position || window.scrollY
        }
      });
    }
  }, [state.currentContext]);

  // Save filters for current context
  const saveFilters = useCallback((filters) => {
    if (state.currentContext) {
      dispatch({
        type: NAVIGATION_ACTIONS.SET_FILTERS,
        payload: {
          contextId: state.currentContext.contextId,
          filters
        }
      });
    }
  }, [state.currentContext]);

  // Get saved filters for current context
  const getSavedFilters = useCallback((contextId) => {
    return state.filters[contextId] || {};
  }, [state.filters]);

  // Save expanded state for current context
  const saveExpandedState = useCallback((expandedState) => {
    if (state.currentContext) {
      dispatch({
        type: NAVIGATION_ACTIONS.SET_EXPANDED_STATE,
        payload: {
          contextId: state.currentContext.contextId,
          state: expandedState
        }
      });
    }
  }, [state.currentContext]);

  // Get saved expanded state for current context
  const getSavedExpandedState = useCallback((contextId) => {
    return state.expandedStates[contextId] || {};
  }, [state.expandedStates]);

  // Clear all navigation context (useful for fresh starts)
  const clearNavigationContext = useCallback(() => {
    dispatch({ type: NAVIGATION_ACTIONS.CLEAR_CONTEXT });
  }, []);

  // Get the previous context for display purposes
  const getPreviousContext = useCallback(() => {
    if (state.navigationStack.length < 2) return null;
    return state.navigationStack[state.navigationStack.length - 2];
  }, [state.navigationStack]);

  // Check if we can navigate back
  const canNavigateBack = useCallback(() => {
    return state.navigationStack.length > 0;
  }, [state.navigationStack]);

  const contextValue = {
    // State
    currentContext: state.currentContext,
    navigationStack: state.navigationStack,
    scrollPositions: state.scrollPositions,
    expandedStates: state.expandedStates,
    filters: state.filters,

    // Navigation actions
    navigateWithContext,
    navigateBack,
    pushNavigationContext,
    clearNavigationContext,

    // State management
    updateScrollPosition,
    saveFilters,
    getSavedFilters,
    saveExpandedState,
    getSavedExpandedState,

    // Utilities
    getPreviousContext,
    canNavigateBack,
    createContextId
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

// Custom hook to use navigation context
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Helper hook for section-specific navigation
export function useSectionNavigation(sectionName) {
  const navigation = useNavigation();

  const navigateToProject = useCallback((projectData, targetPath) => {
    return navigation.navigateWithContext(targetPath, {
      section: sectionName,
      type: 'project',
      returnPath: '/dashboard',
      projectId: projectData.id,
      projectName: projectData.projectName,
      projectNumber: projectData.projectNumber,
      selectedData: projectData
    });
  }, [navigation, sectionName]);

  const navigateToMessage = useCallback((messageData, targetPath) => {
    return navigation.navigateWithContext(targetPath, {
      section: sectionName,
      type: 'message',
      returnPath: '/dashboard',
      messageId: messageData.id,
      projectId: messageData.projectId,
      selectedData: messageData
    });
  }, [navigation, sectionName]);

  const navigateToAlert = useCallback((alertData, targetPath) => {
    return navigation.navigateWithContext(targetPath, {
      section: sectionName,
      type: 'alert',
      returnPath: '/dashboard',
      alertId: alertData.id,
      projectId: alertData.projectId,
      stepId: alertData.stepId,
      selectedData: alertData
    });
  }, [navigation, sectionName]);

  const navigateToProjectCube = useCallback((projectData, targetPath) => {
    return navigation.navigateWithContext(targetPath, {
      section: sectionName,
      type: 'project-cube',
      returnPath: '/dashboard',
      projectId: projectData.id,
      selectedData: projectData
    });
  }, [navigation, sectionName]);

  return {
    ...navigation,
    navigateToProject,
    navigateToMessage,
    navigateToAlert,
    navigateToProjectCube
  };
}

export default NavigationContext;