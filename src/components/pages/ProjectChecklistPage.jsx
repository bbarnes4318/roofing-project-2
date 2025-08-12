import React, { useState, useEffect, useRef } from 'react';
import { useSocket, useRealTimeUpdates } from '../../hooks/useSocket';
import { projectsService, workflowAlertsService } from '../../services/api';
import workflowService from '../../services/workflowService';
import { ChevronDownIcon, PlusCircleIcon } from '../common/Icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useWorkflowUpdate } from '../../hooks/useWorkflowUpdate';
import PhaseOverrideButton from '../ui/PhaseOverrideButton';
import WorkflowProgressService from '../../services/workflowProgress';

// =================================================================
// CHECKBOX PERSISTENCE SYSTEM
// =================================================================

const STORAGE_KEY_PREFIX = 'WORKFLOW_CHECKBOX_';
const BACKUP_KEY_PREFIX = 'BACKUP_CHECKBOX_';
const EMERGENCY_KEY_PREFIX = 'EMERGENCY_CHECKBOX_';

// Save to multiple storage locations for reliability
const saveCheckboxState = (projectId, checkedSet) => {
  const checkedArray = Array.from(checkedSet);
  const timestamp = Date.now();
  const data = JSON.stringify({ items: checkedArray, timestamp, version: 'v3' });
  
  try {
    // Layer 1: localStorage
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, data);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}_v2`, JSON.stringify(checkedArray));
    
    // Layer 2: sessionStorage
    sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, data);
    sessionStorage.setItem(`${BACKUP_KEY_PREFIX}${projectId}`, JSON.stringify(checkedArray));
    
    // Layer 3: Emergency backup with timestamp
    localStorage.setItem(`${EMERGENCY_KEY_PREFIX}${projectId}_${timestamp}`, data);
    
    // Layer 4: Browser cache simulation
    if (window.caches) {
      // Don't block on this
      setTimeout(() => {
        try {
          window.caches.open('workflow-cache').then(cache => {
            const blob = new Blob([data], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            cache.put(`/workflow/${projectId}`, new Response(blob));
          });
        } catch(e) {}
      }, 0);
    }
    
    console.log(`Checkbox state saved: ${checkedArray.length} items across multiple layers`);
    return true;
  } catch (error) {
    console.error('Checkbox state save failed:', error);
    return false;
  }
};

// Load from multiple storage locations with fallback
const loadCheckboxState = (projectId) => {
  try {
    // Try Layer 1 first (most recent)
    const primary = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    if (primary) {
      const parsed = JSON.parse(primary);
      if (parsed.items && Array.isArray(parsed.items)) {
        console.log(`Loaded from primary storage: ${parsed.items.length} items`);
        return new Set(parsed.items);
      }
    }
    
    // Try Layer 1 v2
    const primaryV2 = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}_v2`);
    if (primaryV2) {
      const parsed = JSON.parse(primaryV2);
      if (Array.isArray(parsed)) {
        console.log(`Loaded from primary V2: ${parsed.length} items`);
        return new Set(parsed);
      }
    }
    
    // Try sessionStorage
    const session = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.items && Array.isArray(parsed.items)) {
        console.log(`Loaded from session storage: ${parsed.items.length} items`);
        return new Set(parsed.items);
      }
    }
    
    // Try backup
    const backup = sessionStorage.getItem(`${BACKUP_KEY_PREFIX}${projectId}`);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (Array.isArray(parsed)) {
        console.log(`Loaded from backup: ${parsed.length} items`);
        return new Set(parsed);
      }
    }
    
    // Try emergency backups (latest)
    const emergencyKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(`${EMERGENCY_KEY_PREFIX}${projectId}_`))
      .sort()
      .reverse(); // Most recent first
    
    if (emergencyKeys.length > 0) {
      const emergency = localStorage.getItem(emergencyKeys[0]);
      const parsed = JSON.parse(emergency);
      if (parsed.items && Array.isArray(parsed.items)) {
        console.log(`Loaded from emergency backup: ${parsed.items.length} items`);
        return new Set(parsed.items);
      }
    }
    
  } catch (error) {
    console.error('Checkbox state load failed:', error);
  }
  
  console.log('No checkbox data found, returning empty set');
  return new Set();
};

// Workflow data will be loaded from database API

const ProjectChecklistPage = ({ project, onUpdate, onPhaseCompletionChange, targetLineItemId, targetSectionId }) => {
  const projectId = project?._id || project?.id;
  
  // =================================================================
  // CHECKBOX STATE MANAGEMENT
  // =================================================================
  
  // Layer 1: Immediate UI state (for instant visual feedback)
  const [immediateState, setImmediateState] = useState(() => loadCheckboxState(projectId));
  
  // Layer 2: Persistent state (for storage sync)
  const [persistentState, setPersistentState] = useState(() => loadCheckboxState(projectId));
  
  // Layer 3: Backup state (for recovery)
  const [backupState, setBackupState] = useState(() => loadCheckboxState(projectId));
  
  // Layer 4: Force render counter
  const [renderCounter, setRenderCounter] = useState(0);
  
  // Phase management - collapsed by default
  const [openPhase, setOpenPhase] = useState(null);
  const [openItem, setOpenItem] = useState({});
  
  // Workflow data states
  const [workflowData, setWorkflowData] = useState(null);
  const [projectPosition, setProjectPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [navigationSuccess, setNavigationSuccess] = useState(null);
  
  // Navigation and highlighting states (support URL param ?highlight_item=PHASE-SECTION-INDEX)
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const urlHighlight = urlParams.get('highlight_item');
  const [highlightedLineItemId, setHighlightedLineItemId] = useState(targetLineItemId || urlHighlight);
  const [highlightedSectionId, setHighlightedSectionId] = useState(targetSectionId);
  
  // =================================================================
  // CHECKBOX HANDLERS
  // =================================================================
  
  const handleCheckboxToggle = (stepId, phaseId, itemId, subIdx) => {
    console.log(`Checkbox clicked: ${stepId}`);
    
    // Get current state
    const isCurrentlyChecked = immediateState.has(stepId) || persistentState.has(stepId);
    const newState = !isCurrentlyChecked;
    
    console.log(`Toggle: ${stepId} from ${isCurrentlyChecked} to ${newState}`);
    
    // =================================================================
    // IMMEDIATE STATE UPDATE
    // =================================================================
    
    const updateAllStates = (checked) => {
      // Create new sets
      const newImmediate = new Set(immediateState);
      const newPersistent = new Set(persistentState);
      const newBackup = new Set(backupState);
      
      if (checked) {
        newImmediate.add(stepId);
        newPersistent.add(stepId);
        newBackup.add(stepId);
      } else {
        newImmediate.delete(stepId);
        newPersistent.delete(stepId);
        newBackup.delete(stepId);
      }
      
      // Update all states IMMEDIATELY
      setImmediateState(newImmediate);
      setPersistentState(newPersistent);
      setBackupState(newBackup);
      
      // Force render
      setRenderCounter(prev => prev + 1);
      
      // Save to storage
      saveCheckboxState(projectId, newPersistent);
      
      console.log(`All states updated: ${checked ? 'CHECKED' : 'UNCHECKED'} - ${Array.from(newPersistent).length} items`);
      
      return newPersistent;
    };
    
    // Execute the update
    const finalState = updateAllStates(newState);
    
    // Background server sync (non-blocking)
    setTimeout(() => {
      try {
        // Call server API with database IDs
        workflowService.updateStep(projectId, stepId, newState)
          .then(() => {
            console.log(`Server sync success: ${stepId}`);
          })
          .catch(error => {
            console.error(`Server sync failed: ${stepId}`, error);
            // Keep local state as truth
          });
      } catch (error) {
        console.error(`Server call failed: ${stepId}`, error);
      }
    }, 10); // Minimal delay
    
    // Prevent any event bubbling or default behavior
    return false;
  };
  
  const handleLegacyCheckbox = (phaseId, itemId, subIdx) => {
    const stepId = `${phaseId}-${itemId}-${subIdx}`;
    
    console.log(`Legacy checkbox clicked: ${stepId}`);
    
    // Get current state
    const isCurrentlyChecked = immediateState.has(stepId) || persistentState.has(stepId);
    const newState = !isCurrentlyChecked;
    
    console.log(`Toggle: ${stepId} from ${isCurrentlyChecked} to ${newState}`);
    
    // =================================================================
    // IMMEDIATE STATE UPDATE
    // =================================================================
    
    const updateAllStates = (checked) => {
      // Create new sets
      const newImmediate = new Set(immediateState);
      const newPersistent = new Set(persistentState);
      const newBackup = new Set(backupState);
      
      if (checked) {
        newImmediate.add(stepId);
        newPersistent.add(stepId);
        newBackup.add(stepId);
      } else {
        newImmediate.delete(stepId);
        newPersistent.delete(stepId);
        newBackup.delete(stepId);
      }
      
      // Update all states IMMEDIATELY
      setImmediateState(newImmediate);
      setPersistentState(newPersistent);
      setBackupState(newBackup);
      
      // Force render
      setRenderCounter(prev => prev + 1);
      
      // Save to storage
      saveCheckboxState(projectId, newPersistent);
      
      console.log(`All states updated: ${checked ? 'CHECKED' : 'UNCHECKED'} - ${Array.from(newPersistent).length} items`);
      
      return newPersistent;
    };
    
    // Execute the update
    const finalState = updateAllStates(newState);
    
    // Background server sync (non-blocking)
    setTimeout(() => {
      try {
        // Call server API
        workflowService.updateStep(projectId, stepId, newState)
          .then(() => {
            console.log(`Server sync success: ${stepId}`);
          })
          .catch(error => {
            console.error(`Server sync failed: ${stepId}`, error);
            // Keep local state as truth
          });
      } catch (error) {
        console.error(`Server call failed: ${stepId}`, error);
      }
    }, 10); // Minimal delay
    
    // Prevent any event bubbling or default behavior
    return false;
  };
  
  // =================================================================
  // CHECKBOX STATE CHECKER
  // =================================================================
  
  const isItemChecked = (stepId) => {
    // Check immediate state first (highest priority)
    const immediateCheck = immediateState.has(stepId);
    const persistentCheck = persistentState.has(stepId);
    const backupCheck = backupState.has(stepId);
    
    // Use immediate if it exists, fallback to others
    const result = immediateCheck || persistentCheck || backupCheck;
    
    // Debug log
    if (stepId === 'LEAD-input-customer-info-0') {
      console.log(`🔍 CHECKING ${stepId}: immediate=${immediateCheck}, persistent=${persistentCheck}, backup=${backupCheck}, result=${result}`);
    }
    
    return result;
  };
  
  // =================================================================
  // LOAD WORKFLOW DATA FROM DATABASE
  // =================================================================
  
  useEffect(() => {
    const loadWorkflowData = async () => {
      if (!projectId) return;
      
      console.log(`Loading workflow data for project: ${projectId}`);
      setLoading(true);
      setLoadingError(null);
      
      try {
        // Load both workflow structure and project position in parallel
        const [workflowResponse, positionResponse] = await Promise.all([
          fetch('/api/workflow-data/full-structure', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
            }
          }),
          fetch(`/api/workflow-data/project-position/${projectId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-sarah-owner-token-fixed-12345'}`
            }
          })
        ]);
        
        const workflowResult = await workflowResponse.json();
        const positionResult = await positionResponse.json();
        
        if (workflowResult.success) {
          setWorkflowData(workflowResult.data);
          console.log(`Loaded ${workflowResult.data.length} phases from database`);
          console.log(`Phase names:`, workflowResult.data.map(p => p.id + ' (' + p.items.length + ' items)'));
          console.log(`Full workflow data:`, workflowResult.data);
        } else {
          throw new Error('Failed to load workflow structure');
        }
        
        if (positionResult.success && positionResult.data) {
          setProjectPosition(positionResult.data);
          console.log(`Loaded project position:`, positionResult.data);
          
          // Handle navigation targets - expand phase/section if navigating to specific item
          let expanded = false;
          if (targetLineItemId || targetSectionId || urlHighlight) {
            const effectiveTargetLineItem = targetLineItemId || urlHighlight;

            if (effectiveTargetLineItem) {
              // Case 1: Composite format PHASE-SECTION-INDEX
              const knownPhaseIds = new Set((workflowResult.data || []).map(p => p.id));
              const parts = effectiveTargetLineItem.split('-');
              if (parts.length >= 3 && knownPhaseIds.has(parts[0])) {
                const phaseId = parts[0];
                const sectionId = parts.slice(1, -1).join('-');
                console.log(`🎯 NAVIGATION: Expanding by composite id: phase=${phaseId}, section=${sectionId}`);
                setOpenPhase(phaseId);
                setOpenItem(prev => ({ ...prev, [sectionId]: true }));
                expanded = true;
              } else {
                // Case 2: DB line item id - find its phase/section in workflow data
                outer: for (const phase of workflowResult.data || []) {
                  for (const item of phase.items || []) {
                    const match = (item.subtasks || []).some(st => typeof st === 'object' && st.id === effectiveTargetLineItem);
                    if (match) {
                      console.log(`🎯 NAVIGATION: Expanding by DB id: phase=${phase.id}, section=${item.id}`);
                      setOpenPhase(phase.id);
                      setOpenItem(prev => ({ ...prev, [item.id]: true }));
                      expanded = true;
                      break outer;
                    }
                  }
                }
              }
            }

            // Case 3: Fallback to explicit section targeting if provided
            if (!expanded && targetSectionId) {
              const targetPhase = (workflowResult.data || []).find(phase => 
                phase.items.some(item => item.id === targetSectionId)
              );
              if (targetPhase) {
                console.log(`🎯 NAVIGATION: Expanding by targetSectionId: phase=${targetPhase.id}, section=${targetSectionId}`);
                setOpenPhase(targetPhase.id);
                setOpenItem(prev => ({ ...prev, [targetSectionId]: true }));
                expanded = true;
              }
            }
          }

          // Default: if nothing targeted, open the current phase and section from project position
          if (!expanded && positionResult?.data?.currentPhase && positionResult?.data?.currentSection) {
            console.log(`🎯 NAVIGATION: Default expand to current position: phase=${positionResult.data.currentPhase}, section=${positionResult.data.currentSection}`);
            setOpenPhase(positionResult.data.currentPhase);
            setOpenItem(prev => ({ ...prev, [positionResult.data.currentSection]: true }));
            expanded = true;
          }

          // Final fallback: open the first phase/section from workflow data so the UI always responds
          if (!expanded && Array.isArray(workflowResult.data) && workflowResult.data.length > 0) {
            const firstPhase = workflowResult.data[0];
            const firstSection = firstPhase.items && firstPhase.items.length > 0 ? firstPhase.items[0] : null;
            if (firstPhase && firstSection) {
              console.log(`🎯 NAVIGATION: Fallback expand to first phase/section: phase=${firstPhase.id}, section=${firstSection.id}`);
              setOpenPhase(firstPhase.id);
              setOpenItem(prev => ({ ...prev, [firstSection.id]: true }));
            }
          }
          
          // Auto-scroll to target or current position after a brief delay
          setTimeout(() => {
            let targetElement = null;
            let scrollReason = '';
            
            // Priority 1: Navigate to specific target line item (prop or URL param)
            const effectiveTargetLineItem = targetLineItemId || urlHighlight;
            if (effectiveTargetLineItem) {
              targetElement = document.getElementById(`lineitem-${effectiveTargetLineItem}`);
              scrollReason = `target line item: ${effectiveTargetLineItem}`;
            }
            // Priority 2: Navigate to specific target section
            else if (targetSectionId) {
              targetElement = document.getElementById(`item-${targetSectionId}`);
              scrollReason = `target section: ${targetSectionId}`;
            }
            // Priority 3: Navigate to current project position
            else {
              targetElement = document.getElementById(`item-${positionResult.data.currentSection}`);
              scrollReason = `current section: ${positionResult.data.sectionDisplayName}`;
            }
            
            if (targetElement) {
              targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
              
              // Add bright highlighting for targeted navigation
              const highlightClass = (targetLineItemId || targetSectionId) 
                ? ['ring-4', 'ring-yellow-400', 'ring-opacity-90', 'bg-yellow-100'] 
                : ['ring-4', 'ring-blue-500', 'ring-opacity-75'];
              
              targetElement.classList.add(...highlightClass);
              setTimeout(() => {
                targetElement.classList.remove(...highlightClass);
              }, targetLineItemId ? 8000 : 5000); // Longer highlight for targeted items
              
              console.log(`Auto-navigated to ${scrollReason}`);
            }
          }, 1000);
          
        } else {
          console.log(`⚠️ No project position found for: ${projectId}`);
        }
        
      } catch (error) {
        console.error('❌ Error loading workflow data:', error);
        setLoadingError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadWorkflowData();
  }, [projectId]);
  
  // =================================================================
  // NUCLEAR INITIALIZATION
  // =================================================================
  
  useEffect(() => {
    if (!projectId) return;
    
    console.log(`Initializing workflow for project: ${projectId}`);
    console.log(`Initial states:`, {
      immediate: immediateState.size,
      persistent: persistentState.size,
      backup: backupState.size
    });
    
    // Sync all states on init
    const loadedState = loadCheckboxState(projectId);
    setImmediateState(loadedState);
    setPersistentState(loadedState);
    setBackupState(loadedState);
    setRenderCounter(1);
    
  }, [projectId]);
  
  // Phase click handler - modified to handle ALL phases state
  const handlePhaseClick = (phaseId) => {
    if (openPhase === 'ALL') {
      setOpenPhase(phaseId); // Switch from ALL to specific phase
    } else {
      setOpenPhase(openPhase === phaseId ? null : phaseId);
    }
    setOpenItem({});
  };

  const handleItemClick = (itemId) => {
    setOpenItem((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Get phase colors (standardized via WorkflowProgressService)
  const getPhaseColor = (phaseId) => {
    const color = WorkflowProgressService.getPhaseColor(phaseId);
    // Map to tailwind bg utility fallbacks if needed
    const map = {
      '#E0E7FF': 'bg-indigo-400',
      '#0066CC': 'bg-blue-500',
      '#10B981': 'bg-emerald-500',
      '#F59E0B': 'bg-amber-500',
      '#8B5CF6': 'bg-violet-500',
      '#14532D': 'bg-green-900'
    };
    return map[color.hex] || 'bg-gray-500';
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No project selected</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div className="text-gray-600">Loading workflow from database...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-600 font-semibold mb-2">Failed to Load Workflow</div>
          <div className="text-red-500 text-sm">{loadingError}</div>
        </div>
      </div>
    );
  }

  if (!workflowData || workflowData.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="text-yellow-600 font-semibold">No Workflow Data Found</div>
          <div className="text-yellow-500 text-sm mt-1">Unable to load workflow structure from database.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-0 space-y-0">

      {/* Checklist */}
      <div className="space-y-4">
        {workflowData.map((phase) => {
          console.log(`Rendering phase: ${phase.id} with ${phase.items.length} items`);
          return (
          <div key={phase.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Phase Header */}
            <button
              onClick={() => handlePhaseClick(phase.id)}
              className={`w-full px-6 py-4 text-left font-semibold bg-white hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 ${
                phase.items.length > 0 && phase.items.every(item => 
                  item.subtasks.every((_, subIdx) => {
                    const stepId = `DB_${phase.id}-${item.id}-${subIdx}`;
                    return isItemChecked(stepId);
                  })
                ) ? 'line-through decoration-2' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Phase Color Circle */}
                  <div 
                    className={`w-4 h-4 rounded-full ${getPhaseColor(phase.id)} flex-shrink-0`}
                  ></div>
                  {/* Phase Title */}
                  <span className="text-gray-900">{phase.label}</span>
                </div>
                <ChevronDownIcon 
                  className={`w-5 h-5 transform transition-transform duration-200 text-gray-600 ${
                    openPhase === phase.id || openPhase === 'ALL' ? 'rotate-180' : ''
                  }`} 
                />
              </div>
            </button>

            {/* Phase Content - Show when specific phase is open OR when ALL phases are open */}
            {openPhase === phase.id && (
              <div className="p-6 space-y-4">
                {phase.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <div className="text-lg font-medium">No items in this phase yet</div>
                    <div className="text-sm">This phase will be populated with workflow items as needed.</div>
                  </div>
                ) : (
                  phase.items.map((item) => {
                  // Check if this is the current active section
                  const isCurrentSection = projectPosition && projectPosition.currentSection === item.id;
                  
                  return (
                    <div key={item.id} id={`item-${item.id}`} className={`border rounded-lg overflow-hidden ${
                      isCurrentSection ? 'border-blue-500 bg-blue-50/50' : ''
                    }`}>
                      {/* Item Header */}
                      <button
                        onClick={() => handleItemClick(item.id)}
                        className={`w-full px-4 py-3 text-left font-medium transition-colors duration-200 ${
                          isCurrentSection 
                            ? 'bg-blue-100 hover:bg-blue-150 text-blue-900' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                        } ${
                          item.subtasks.every((_, subIdx) => {
                            const stepId = `DB_${phase.id}-${item.id}-${subIdx}`;
                            return isItemChecked(stepId);
                          }) ? 'line-through decoration-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            {isCurrentSection && <span className="text-blue-500">👈</span>}
                            {item.label}
                          </span>
                          <ChevronDownIcon 
                            className={`w-4 h-4 transform transition-transform duration-200 ${
                              openItem[item.id] ? 'rotate-180' : ''
                            }`} 
                          />
                        </div>
                      </button>

                      {/* Item Content - Subtasks */}
                      {openItem[item.id] && (
                        <div className={`p-4 ${isCurrentSection ? 'bg-blue-50/30' : 'bg-white'}`}>
                          <div className="space-y-3">
                            {item.subtasks.map((subtask, subIdx) => {
                              // Support object format from DB: { id, label }
                              const subtaskId = typeof subtask === 'object' ? subtask.id : null;
                              const subtaskLabel = typeof subtask === 'object' ? subtask.label : subtask;
                              // Prefer DB line item id when available for persistence and server calls
                              const stepId = subtaskId ? subtaskId : `DB_${phase.id}-${item.id}-${subIdx}`;
                              const isChecked = isItemChecked(stepId);
                              // console.log(`🔍 CHECKING SUBTASK: ${subtask} | stepId: ${stepId} | checked: ${isChecked}`);
                              
                              // Check if this is the current active line item
                              const isCurrentLineItem = projectPosition && 
                                projectPosition.currentSection === item.id && 
                                (projectPosition.currentLineItem === subtaskId || projectPosition.currentLineItemName === subtaskLabel);
                              
                              // Create unique line item ID for navigation targeting
                              const lineItemId = subtaskId ? subtaskId : `${phase.id}-${item.id}-${subIdx}`;
                              
                              // Check if this line item is being targeted for navigation
                              const isTargetedLineItem = highlightedLineItemId && highlightedLineItemId === lineItemId;
                              
                              return (
                                <div 
                                  key={subIdx} 
                                  id={`lineitem-${lineItemId}`}
                                  className={`flex items-start space-x-3 ${
                                    isCurrentLineItem ? 'p-2 bg-blue-100 border border-blue-300 rounded-lg ring-2 ring-blue-400 ring-opacity-50' : 
                                    isTargetedLineItem ? 'p-2 bg-yellow-100 border border-yellow-300 rounded-lg ring-2 ring-yellow-400 ring-opacity-75' : ''
                                  }`}
                                >
                                  {/* NUCLEAR CHECKBOX */}
                                  <div className="relative flex-shrink-0 mt-1">
                                    <input
                                      type="checkbox"
                                      id={`lineitem-checkbox-${stepId}`}
                                      checked={isChecked}
                                      onChange={() => {
                                        console.log(`Checkbox onChange: ${stepId}`);
                                        handleCheckboxToggle(stepId, phase.id, item.id, subIdx);
                                      }}
                                      onClick={(e) => {
                                        console.log(`Checkbox onClick: ${stepId}`);
                                        e.stopPropagation();
                                      }}
                                      className={`h-4 w-4 rounded border-2 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 checked:bg-blue-600 checked:border-blue-600 ${
                                        isCurrentLineItem ? 'border-blue-500' : 'border-gray-300'
                                      }`}
                                    />
                                    {/* Custom checkmark */}
                                    {isChecked && (
                                      <svg 
                                        className="absolute inset-0 w-4 h-4 text-white pointer-events-none" 
                                        fill="currentColor" 
                                        viewBox="0 0 20 20"
                                      >
                                        <path 
                                          fillRule="evenodd" 
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                          clipRule="evenodd" 
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  
                                  {/* Task Label */}
                                  <label 
                                    htmlFor={`lineitem-checkbox-${stepId}`}
                                    className={`flex-1 text-sm cursor-pointer select-none transition-all duration-200 ${
                                      isCurrentLineItem
                                        ? 'font-semibold text-blue-800'
                                        : isTargetedLineItem
                                          ? 'font-semibold text-yellow-800'
                                          : isChecked 
                                            ? 'text-gray-500 line-through decoration-2' 
                                            : 'text-gray-800 hover:text-blue-600'
                                    }`}
                                  >
                                    {isCurrentLineItem && <span className="text-blue-500">👈 </span>}
                                    {isTargetedLineItem && <span className="text-yellow-500">⭐ </span>}
                                    {subtaskLabel}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>
      
      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 border border-gray-400 rounded p-4 text-sm">
          <div className="font-bold text-gray-800">Debug Information</div>
          <div>Immediate State: {immediateState.size} items</div>
          <div>Persistent State: {persistentState.size} items</div>
          <div>Backup State: {backupState.size} items</div>
          <div>Render Counter: {renderCounter}</div>
          <div className="mt-2 text-xs">
            Checked IDs: {Array.from(immediateState).slice(0, 5).join(', ')}
            {immediateState.size > 5 && '...'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectChecklistPage;