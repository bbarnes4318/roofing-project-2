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
// 🔥🔥🔥 NUCLEAR CHECKBOX PERSISTENCE SYSTEM 🔥🔥🔥
// =================================================================

const STORAGE_KEY_PREFIX = 'NUCLEAR_CHECKBOX_';
const BACKUP_KEY_PREFIX = 'BACKUP_CHECKBOX_';
const EMERGENCY_KEY_PREFIX = 'EMERGENCY_CHECKBOX_';

// Save to ALL possible storage locations
const NUCLEAR_SAVE = (projectId, checkedSet) => {
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
    
    console.log(`🔥🔥🔥 NUCLEAR SAVE COMPLETE: ${checkedArray.length} items across ALL layers`);
    return true;
  } catch (error) {
    console.error('💥 NUCLEAR SAVE FAILED:', error);
    return false;
  }
};

// Load from ALL possible storage locations
const NUCLEAR_LOAD = (projectId) => {
  try {
    // Try Layer 1 first (most recent)
    const primary = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    if (primary) {
      const parsed = JSON.parse(primary);
      if (parsed.items && Array.isArray(parsed.items)) {
        console.log(`🔥 NUCLEAR LOAD: Primary storage - ${parsed.items.length} items`);
        return new Set(parsed.items);
      }
    }
    
    // Try Layer 1 v2
    const primaryV2 = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}_v2`);
    if (primaryV2) {
      const parsed = JSON.parse(primaryV2);
      if (Array.isArray(parsed)) {
        console.log(`🔥 NUCLEAR LOAD: Primary V2 - ${parsed.length} items`);
        return new Set(parsed);
      }
    }
    
    // Try sessionStorage
    const session = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.items && Array.isArray(parsed.items)) {
        console.log(`🔥 NUCLEAR LOAD: Session storage - ${parsed.items.length} items`);
        return new Set(parsed.items);
      }
    }
    
    // Try backup
    const backup = sessionStorage.getItem(`${BACKUP_KEY_PREFIX}${projectId}`);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (Array.isArray(parsed)) {
        console.log(`🔥 NUCLEAR LOAD: Backup - ${parsed.length} items`);
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
        console.log(`🔥 NUCLEAR LOAD: Emergency backup - ${parsed.items.length} items`);
        return new Set(parsed.items);
      }
    }
    
  } catch (error) {
    console.error('💥 NUCLEAR LOAD FAILED:', error);
  }
  
  console.log('🔥 NUCLEAR LOAD: No data found, returning empty set');
  return new Set();
};

const checklistPhases = [
  {
    id: 'LEAD',
    label: 'Lead Phase',
    items: [
      {
        id: 'input-customer-info',
        label: 'Input Customer Information – Office 👩🏼‍💻',
        subtasks: [
          'Make sure the name is spelled correctly',
          'Make sure the email is correct. Send a confirmation email to confirm email.'
        ]
      },
      {
        id: 'complete-questions',
        label: 'Complete Questions to Ask Checklist – Office 👩🏼‍💻',
        subtasks: [
          'Input answers from Question Checklist into notes',
          'Record property details'
        ]
      },
      {
        id: 'input-lead-property',
        label: 'Input Lead Property Information – Office 👩🏼‍💻',
        subtasks: [
          'Add Home View photos – Maps',
          'Add Street View photos – Google Maps',
          'Add elevation screenshot – PPRBD',
          'Add property age – County Assessor Website',
          'Evaluate ladder requirements – By looking at the room'
        ]
      },
      {
        id: 'assign-pm',
        label: 'Assign A Project Manager – Office 👩🏼‍💻',
        subtasks: [
          'Use workflow from Lead Assigning Flowchart',
          'Select and brief the Project Manager'
        ]
      },
      {
        id: 'schedule-inspection',
        label: 'Schedule Initial Inspection – Office 👩🏼‍💻',
        subtasks: [
          'Call Customer and coordinate with PM schedule',
          'Create Calendar Appointment in AL'
        ]
      }
    ]
  },
  {
    id: 'PROSPECT',
    label: 'Prospect Phase',
    items: [
      {
        id: 'site-inspection',
        label: 'Site Inspection – Project Manager 👷🏼',
        subtasks: [
          'Take site photos',
          'Complete inspection form',
          'Document material colors',
          'Capture Hover photos',
          'Present upgrade options'
        ]
      },
      {
        id: 'write-estimate',
        label: 'Write Estimate – Project Manager 👷🏼',
        subtasks: [
          'Fill out Estimate Form',
          'Write initial estimate – AccuLynx',
          'Write Customer Pay Estimates',
          'Send for Approval'
        ]
      }
    ]
  }
];

const ProjectChecklistPage = ({ project, onUpdate, onPhaseCompletionChange }) => {
  const projectId = project?._id || project?.id;
  
  // =================================================================
  // 🔥🔥🔥 NUCLEAR STATE MANAGEMENT 🔥🔥🔥
  // =================================================================
  
  // Layer 1: Immediate UI state (for instant visual feedback)
  const [immediateState, setImmediateState] = useState(() => NUCLEAR_LOAD(projectId));
  
  // Layer 2: Persistent state (for storage sync)
  const [persistentState, setPersistentState] = useState(() => NUCLEAR_LOAD(projectId));
  
  // Layer 3: Backup state (for recovery)
  const [backupState, setBackupState] = useState(() => NUCLEAR_LOAD(projectId));
  
  // Layer 4: Force render counter
  const [renderCounter, setRenderCounter] = useState(0);
  
  // Phase management
  const [openPhase, setOpenPhase] = useState('LEAD'); // Start with first phase open
  const [openItem, setOpenItem] = useState({});
  
  // Other states
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [navigationSuccess, setNavigationSuccess] = useState(null);
  
  // =================================================================
  // 🔥🔥🔥 NUCLEAR CHECKBOX HANDLER 🔥🔥🔥
  // =================================================================
  
  const NUCLEAR_CHECKBOX_HANDLER = (phaseId, itemId, subIdx) => {
    const stepId = `${phaseId}-${itemId}-${subIdx}`;
    
    console.log(`🔥🔥🔥 NUCLEAR CHECKBOX CLICKED: ${stepId}`);
    
    // Get current state
    const isCurrentlyChecked = immediateState.has(stepId) || persistentState.has(stepId);
    const newState = !isCurrentlyChecked;
    
    console.log(`🔥 TOGGLE: ${stepId} from ${isCurrentlyChecked} to ${newState}`);
    
    // =================================================================
    // IMMEDIATE STATE UPDATE (NO DELAYS, NO ASYNC, NO BULLSHIT)
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
      NUCLEAR_SAVE(projectId, newPersistent);
      
      console.log(`🔥 ALL STATES UPDATED: ${checked ? 'CHECKED' : 'UNCHECKED'} - ${Array.from(newPersistent).length} items`);
      
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
            console.log(`🌐 SERVER SYNC SUCCESS: ${stepId}`);
          })
          .catch(error => {
            console.error(`💥 SERVER SYNC FAILED: ${stepId}`, error);
            // Keep local state as truth
          });
      } catch (error) {
        console.error(`💥 SERVER CALL FAILED: ${stepId}`, error);
      }
    }, 10); // Minimal delay
    
    // Prevent any event bubbling or default behavior
    return false;
  };
  
  // =================================================================
  // 🔥🔥🔥 NUCLEAR CHECKBOX CHECKER 🔥🔥🔥
  // =================================================================
  
  const IS_NUCLEAR_CHECKED = (stepId) => {
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
  // INITIALIZATION
  // =================================================================
  
  useEffect(() => {
    if (!projectId) return;
    
    console.log(`🔥🔥🔥 NUCLEAR INIT: Project ${projectId}`);
    console.log(`🔥 Initial states:`, {
      immediate: immediateState.size,
      persistent: persistentState.size,
      backup: backupState.size
    });
    
    // Sync all states on init
    const loadedState = NUCLEAR_LOAD(projectId);
    setImmediateState(loadedState);
    setPersistentState(loadedState);
    setBackupState(loadedState);
    setRenderCounter(1);
    
  }, [projectId]);
  
  // Phase click handler
  const handlePhaseClick = (phaseId) => {
    setOpenPhase(openPhase === phaseId ? null : phaseId);
    setOpenItem({});
  };

  const handleItemClick = (itemId) => {
    setOpenItem((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Get phase colors
  const getPhaseColor = (phaseId) => {
    const colors = {
      'LEAD': 'bg-blue-500',
      'PROSPECT': 'bg-green-500',
      'APPROVED': 'bg-yellow-500',
      'EXECUTION': 'bg-orange-500',
      'COMPLETION': 'bg-purple-500',
      'default': 'bg-gray-500'
    };
    return colors[phaseId] || colors.default;
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No project selected</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          🔥 NUCLEAR Workflow Checklist 🔥
        </h2>
        <div className="text-sm text-gray-600">
          Project: {project.projectName || project.name} (ID: {projectId})
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Checked Items: {immediateState.size} | Render: #{renderCounter}
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-4">
        {checklistPhases.map((phase) => (
          <div key={phase.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Phase Header */}
            <button
              onClick={() => handlePhaseClick(phase.id)}
              className={`w-full px-6 py-4 text-left font-semibold text-white transition-colors duration-200 hover:opacity-90 ${getPhaseColor(phase.id)}`}
            >
              <div className="flex items-center justify-between">
                <span>{phase.label}</span>
                <ChevronDownIcon 
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    openPhase === phase.id ? 'rotate-180' : ''
                  }`} 
                />
              </div>
            </button>

            {/* Phase Content */}
            {openPhase === phase.id && (
              <div className="p-6 space-y-4">
                {phase.items.map((item) => (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    {/* Item Header */}
                    <button
                      onClick={() => handleItemClick(item.id)}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left font-medium text-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span>{item.label}</span>
                        <ChevronDownIcon 
                          className={`w-4 h-4 transform transition-transform duration-200 ${
                            openItem[item.id] ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                    </button>

                    {/* Item Content - Subtasks */}
                    {openItem[item.id] && (
                      <div className="p-4 bg-white">
                        <div className="space-y-3">
                          {item.subtasks.map((subtask, subIdx) => {
                            const stepId = `${phase.id}-${item.id}-${subIdx}`;
                            const isChecked = IS_NUCLEAR_CHECKED(stepId);
                            
                            return (
                              <div key={subIdx} className="flex items-start space-x-3">
                                {/* NUCLEAR CHECKBOX */}
                                <div className="relative flex-shrink-0 mt-1">
                                  <input
                                    type="checkbox"
                                    id={stepId}
                                    checked={isChecked}
                                    onChange={() => {
                                      console.log(`📝 NUCLEAR CHECKBOX onChange: ${stepId}`);
                                      NUCLEAR_CHECKBOX_HANDLER(phase.id, item.id, subIdx);
                                    }}
                                    onClick={(e) => {
                                      console.log(`🖱️ NUCLEAR CHECKBOX onClick: ${stepId}`);
                                      e.stopPropagation();
                                    }}
                                    className="h-4 w-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 checked:bg-blue-600 checked:border-blue-600"
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
                                  htmlFor={stepId}
                                  className={`flex-1 text-sm cursor-pointer select-none transition-all duration-200 ${
                                    isChecked 
                                      ? 'text-gray-500 line-through' 
                                      : 'text-gray-800 hover:text-blue-600'
                                  }`}
                                >
                                  {subtask}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-red-100 border border-red-400 rounded p-4 text-sm">
          <div className="font-bold text-red-800">🔥 NUCLEAR DEBUG PANEL 🔥</div>
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