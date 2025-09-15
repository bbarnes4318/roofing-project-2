import React, { createContext, useContext, useReducer } from 'react';

// Action types
const ACTIVITY_ACTIONS = {
  SET_ITEMS: 'SET_ITEMS',
  TOGGLE_EXPANDED: 'TOGGLE_EXPANDED',
  TOGGLE_COMPLETED: 'TOGGLE_COMPLETED',
  ADD_COMMENT: 'ADD_COMMENT',
  UPDATE_COMMENT_TEXT: 'UPDATE_COMMENT_TEXT',
  SET_SHOW_COMMENT_INPUT: 'SET_SHOW_COMMENT_INPUT',
  SET_COMMENT_INPUTS: 'SET_COMMENT_INPUTS',
  EXPAND_ALL: 'EXPAND_ALL',
  COLLAPSE_ALL: 'COLLAPSE_ALL'
};

// Initial state
const initialState = {
  // Items from all sources (messages, tasks, reminders)
  items: [],
  
  // UI state
  expandedItems: new Set(),
  completedItems: new Set(),
  
  // Comments state
  comments: {}, // { itemId: [comments] }
  newCommentText: {}, // { itemId: text }
  showCommentInput: {}, // { itemId: boolean }
  commentInputs: {} // { itemId: text }
};

// Reducer
function activityReducer(state, action) {
  switch (action.type) {
    case ACTIVITY_ACTIONS.SET_ITEMS:
      // Automatically expand all items when they're set
      const allItemIds = new Set(action.payload.map(item => item.id));
      return {
        ...state,
        items: action.payload,
        expandedItems: allItemIds
      };
      
    case ACTIVITY_ACTIONS.TOGGLE_EXPANDED:
      const newExpanded = new Set(state.expandedItems);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return {
        ...state,
        expandedItems: newExpanded
      };
      
    case ACTIVITY_ACTIONS.TOGGLE_COMPLETED:
      const newCompleted = new Set(state.completedItems);
      if (newCompleted.has(action.payload)) {
        newCompleted.delete(action.payload);
      } else {
        newCompleted.add(action.payload);
      }
      return {
        ...state,
        completedItems: newCompleted
      };
      
    case ACTIVITY_ACTIONS.ADD_COMMENT:
      const { itemId, comment } = action.payload;
      return {
        ...state,
        comments: {
          ...state.comments,
          [itemId]: [...(state.comments[itemId] || []), comment]
        },
        newCommentText: {
          ...state.newCommentText,
          [itemId]: ''
        },
        commentInputs: {
          ...state.commentInputs,
          [itemId]: ''
        }
      };
      
    case ACTIVITY_ACTIONS.UPDATE_COMMENT_TEXT:
      return {
        ...state,
        newCommentText: {
          ...state.newCommentText,
          [action.payload.itemId]: action.payload.text
        }
      };
      
    case ACTIVITY_ACTIONS.SET_SHOW_COMMENT_INPUT:
      return {
        ...state,
        showCommentInput: {
          ...state.showCommentInput,
          [action.payload.itemId]: action.payload.show
        }
      };
      
    case ACTIVITY_ACTIONS.SET_COMMENT_INPUTS:
      return {
        ...state,
        commentInputs: {
          ...state.commentInputs,
          [action.payload.itemId]: action.payload.text
        }
      };
      
    case ACTIVITY_ACTIONS.EXPAND_ALL:
      const allItemIds = new Set(state.items.map(item => item.id));
      return {
        ...state,
        expandedItems: allItemIds
      };
      
    case ACTIVITY_ACTIONS.COLLAPSE_ALL:
      return {
        ...state,
        expandedItems: new Set()
      };
      
    default:
      return state;
  }
}

// Context
const ActivityContext = createContext();

// Provider component
export function ActivityProvider({ children }) {
  const [state, dispatch] = useReducer(activityReducer, initialState);

  // Action creators
  const actions = {
    setItems: (items) => dispatch({ type: ACTIVITY_ACTIONS.SET_ITEMS, payload: items }),
    
    toggleExpanded: (itemId) => dispatch({ type: ACTIVITY_ACTIONS.TOGGLE_EXPANDED, payload: itemId }),
    
    toggleCompleted: (itemId) => dispatch({ type: ACTIVITY_ACTIONS.TOGGLE_COMPLETED, payload: itemId }),
    
    addComment: (itemId, comment) => dispatch({ 
      type: ACTIVITY_ACTIONS.ADD_COMMENT, 
      payload: { itemId, comment } 
    }),
    
    updateCommentText: (itemId, text) => dispatch({ 
      type: ACTIVITY_ACTIONS.UPDATE_COMMENT_TEXT, 
      payload: { itemId, text } 
    }),
    
    setShowCommentInput: (itemId, show) => dispatch({ 
      type: ACTIVITY_ACTIONS.SET_SHOW_COMMENT_INPUT, 
      payload: { itemId, show } 
    }),
    
    setCommentInputs: (itemId, text) => dispatch({ 
      type: ACTIVITY_ACTIONS.SET_COMMENT_INPUTS, 
      payload: { itemId, text } 
    }),
    
    expandAll: () => dispatch({ type: ACTIVITY_ACTIONS.EXPAND_ALL }),
    
    collapseAll: () => dispatch({ type: ACTIVITY_ACTIONS.COLLAPSE_ALL })
  };

  return (
    <ActivityContext.Provider value={{ state, actions }}>
      {children}
    </ActivityContext.Provider>
  );
}

// Hook to use the context
export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}

export { ACTIVITY_ACTIONS };
