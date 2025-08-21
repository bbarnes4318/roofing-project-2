import React, { useState, useEffect, useRef } from 'react';
import { useSocket, useRealTimeUpdates } from '../../hooks/useSocket';
import api, { projectsService, workflowAlertsService } from '../../services/api';
import workflowService from '../../services/workflowService';
import { ChevronDownIcon, PlusCircleIcon } from '../common/Icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useWorkflowUpdate } from '../../hooks/useWorkflowUpdate';
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
  
  // LOG NAVIGATION PARAMETERS
  console.log('📍 PROJECT CHECKLIST PAGE - Navigation params received:');
  console.log('   targetLineItemId:', targetLineItemId);
  console.log('   targetSectionId:', targetSectionId);
  console.log('   projectId:', projectId);
  
  // Add pulse animation styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.02); opacity: 0.9; }
      }
      .workflow-line-item { transition: all 0.3s ease; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  
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
  
  // Multiple workflow states
  const [activeWorkflowIndex, setActiveWorkflowIndex] = useState(0);
  const [workflowTabs, setWorkflowTabs] = useState([]);
  
  // Navigation and highlighting states (support URL param ?highlight_item=PHASE-SECTION-INDEX)
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const urlHighlight = urlParams.get('highlight_item');
  const [highlightedLineItemId, setHighlightedLineItemId] = useState(targetLineItemId || urlHighlight);
  const [highlightedSectionId, setHighlightedSectionId] = useState(targetSectionId);
  
  // =================================================================
  // CREATE SECTION AND LINE ITEM STATES
  // =================================================================
  
  // Section creation states
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [createSectionData, setCreateSectionData] = useState({
    sectionName: '',
    displayName: '',
    description: ''
  });
  const [selectedPhaseForSection, setSelectedPhaseForSection] = useState(null);
  const [creatingSection, setCreatingSection] = useState(false);
  
  // Line item creation states
  const [showCreateLineItemModal, setShowCreateLineItemModal] = useState(false);
  const [createLineItemData, setCreateLineItemData] = useState({
    itemName: '',
    responsibleRole: 'WORKER',
    description: '',
    estimatedMinutes: 30,
    alertDays: 1
  });
  const [selectedSectionForLineItem, setSelectedSectionForLineItem] = useState(null);
  const [creatingLineItem, setCreatingLineItem] = useState(false);
  
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
            // Trigger project data refresh to update phase colors and status
            if (onUpdate && typeof onUpdate === 'function') {
              console.log('🔄 Triggering project data refresh after workflow completion');
              onUpdate();
            }
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
  
  // =================================================================
  // CREATE SECTION AND LINE ITEM HANDLERS
  // =================================================================
  
  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!selectedPhaseForSection || !createSectionData.sectionName.trim()) return;
    
    setCreatingSection(true);
    try {
      const response = await api.post('/workflows/sections', {
        phaseId: selectedPhaseForSection.id,
        sectionName: createSectionData.sectionName.trim(),
        displayName: createSectionData.displayName.trim() || createSectionData.sectionName.trim(),
        description: createSectionData.description.trim() || null
      });
      
      if (response.data.success) {
        // Refresh workflow data to show new section
        const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
        if (workflowResponse.data.success) {
          setWorkflowData(workflowResponse.data.data);
        }
        
        // Reset form
        setCreateSectionData({ sectionName: '', displayName: '', description: '' });
        setSelectedPhaseForSection(null);
        setShowCreateSectionModal(false);
        
        console.log('✅ Section created successfully:', response.data.data);
      }
    } catch (error) {
      console.error('❌ Error creating section:', error);
      alert('Failed to create section. Please try again.');
    } finally {
      setCreatingSection(false);
    }
  };
  
  const handleCreateLineItem = async (e) => {
    e.preventDefault();
    if (!selectedSectionForLineItem || !createLineItemData.itemName.trim()) return;
    
    setCreatingLineItem(true);
    try {
      const response = await api.post('/workflows/line-items', {
        sectionId: selectedSectionForLineItem.id,
        itemName: createLineItemData.itemName.trim(),
        responsibleRole: createLineItemData.responsibleRole,
        description: createLineItemData.description.trim() || null,
        estimatedMinutes: parseInt(createLineItemData.estimatedMinutes) || 30,
        alertDays: parseInt(createLineItemData.alertDays) || 1
      });
      
      if (response.data.success) {
        // Refresh workflow data to show new line item
        const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
        if (workflowResponse.data.success) {
          setWorkflowData(workflowResponse.data.data);
        }
        
        // Reset form
        setCreateLineItemData({
          itemName: '',
          responsibleRole: 'WORKER',
          description: '',
          estimatedMinutes: 30,
          alertDays: 1
        });
        setSelectedSectionForLineItem(null);
        setShowCreateLineItemModal(false);
        
        console.log('✅ Line item created successfully:', response.data.data);
      }
    } catch (error) {
      console.error('❌ Error creating line item:', error);
      alert('Failed to create line item. Please try again.');
    } finally {
      setCreatingLineItem(false);
    }
  };
  
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
        // Load multiple workflows for this specific project
        const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
        
        const workflowResult = workflowResponse.data;
        
        if (workflowResult.success) {
          setWorkflowData(workflowResult.data);
          
          // Set up workflow tabs
          const tabs = workflowResult.data.map((workflow, index) => ({
            id: workflow.workflowType,
            name: workflow.tradeName,
            isMainWorkflow: workflow.isMainWorkflow,
            completedCount: workflow.completedCount,
            totalCount: workflow.totalCount,
            progress: workflow.totalCount > 0 ? Math.round((workflow.completedCount / workflow.totalCount) * 100) : 0
          }));
          setWorkflowTabs(tabs);
          
          console.log(`Loaded ${workflowResult.data.length} workflows from database`);
          workflowResult.data.forEach(workflow => {
            console.log(`  - ${workflow.workflowType}: ${workflow.completedCount}/${workflow.totalCount} completed`);
          });
          console.log(`Full workflow data:`, workflowResult.data);
        } else {
          throw new Error('Failed to load workflow structure');
        }
        
        // Set the main workflow position for navigation
        const mainWorkflow = workflowResult.data.find(w => w.isMainWorkflow);
        if (mainWorkflow) {
          const positionData = {
            projectId: projectId,
            currentPhase: mainWorkflow.currentPhase,
            currentSection: mainWorkflow.currentSection,
            currentLineItem: mainWorkflow.currentLineItem,
            trackerId: mainWorkflow.trackerId
          };
          setProjectPosition(positionData);
          console.log(`Loaded main workflow position:`, positionData);
          
          // Handle navigation targets - expand phase/section if navigating to specific item
          let expanded = false;
          if (targetLineItemId || targetSectionId || urlHighlight) {
            const effectiveTargetLineItem = targetLineItemId || urlHighlight;

            if (effectiveTargetLineItem && mainWorkflow) {
              // Search within the main workflow for navigation
              const mainWorkflowPhases = mainWorkflow.phases || [];
              
              // Case 1: Composite format PHASE-SECTION-INDEX
              const knownPhaseIds = new Set(mainWorkflowPhases.map(p => p.id));
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
                outer: for (const phase of mainWorkflowPhases) {
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
          if (!expanded && mainWorkflow?.currentPhase && mainWorkflow?.currentSection) {
            console.log(`🎯 NAVIGATION: Default expand to current position: phase=${mainWorkflow.currentPhase}, section=${mainWorkflow.currentSection}`);
            setOpenPhase(mainWorkflow.currentPhase);
            setOpenItem(prev => ({ ...prev, [mainWorkflow.currentSection]: true }));
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
              
              // If not found by lineitem ID, try checkbox ID format
              if (!targetElement) {
                targetElement = document.getElementById(`checkbox-${effectiveTargetLineItem}`);
                if (targetElement) {
                  targetElement = targetElement.closest('.workflow-line-item');
                  scrollReason = `target line item (via checkbox): ${effectiveTargetLineItem}`;
                }
              }
            }
            // Priority 2: Navigate to specific target section
            else if (targetSectionId) {
              targetElement = document.getElementById(`item-${targetSectionId}`);
              scrollReason = `target section: ${targetSectionId}`;
            }
            // Priority 3: Navigate to current project position
            else if (mainWorkflow?.currentSection) {
              targetElement = document.getElementById(`item-${mainWorkflow.currentSection}`);
              scrollReason = `current section: ${mainWorkflow.currentSection}`;
            }
            
            if (targetElement) {
              console.log('🎯 HIGHLIGHTING:', scrollReason);
              
              targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
              
              // Enhanced highlighting for targeted navigation
              if (targetLineItemId) {
                // Apply strong highlight for line items
                targetElement.style.backgroundColor = '#FEF3C7';
                targetElement.style.border = '3px solid #F59E0B';
                targetElement.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.5)';
                targetElement.style.transition = 'all 0.3s ease';
                
                // Add pulsing animation
                targetElement.style.animation = 'pulse 1.5s ease-in-out 3';
                
                // Remove highlight after delay
                setTimeout(() => {
                  targetElement.style.backgroundColor = '';
                  targetElement.style.border = '';
                  targetElement.style.boxShadow = '';
                  targetElement.style.animation = '';
                }, 8000);
              } else {
                // Standard highlight for sections
                const highlightClass = ['ring-4', 'ring-blue-500', 'ring-opacity-75'];
                targetElement.classList.add(...highlightClass);
                setTimeout(() => {
                  targetElement.classList.remove(...highlightClass);
                }, 5000);
              }
              
              console.log(`✅ Auto-navigated and highlighted: ${scrollReason}`);
            } else {
              console.log('⚠️ Could not find element to highlight:', scrollReason);
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
  
  // =================================================================
  // GLOBAL EVENT LISTENER FOR ALERT COMPLETIONS
  // =================================================================
  useEffect(() => {
    const handleWorkflowStepCompleted = (event) => {
      const { projectId: eventProjectId, lineItemId, stepName, source } = event.detail;
      
      // Only process events for this project
      if (eventProjectId !== projectId) return;
      
      console.log(`🔔 ProjectChecklistPage: Received workflowStepCompleted event for project ${eventProjectId}`, {
        lineItemId,
        stepName,
        source
      });
      
      // Mark the line item as checked
      if (lineItemId) {
        // Try different possible step ID formats that might match
        const possibleStepIds = [
          lineItemId,
          `DB_${lineItemId}`,
          `${lineItemId}-0`,
          `DB_${lineItemId}-0`
        ];
        
        let stepIdToCheck = null;
        
        // Find which step ID format exists in our current state
        for (const testId of possibleStepIds) {
          // Check if this step ID would be in our workflow data
          if (testId.includes('DB_') || testId === lineItemId) {
            stepIdToCheck = testId;
            break;
          }
        }
        
        if (stepIdToCheck) {
          console.log(`🔄 ProjectChecklistPage: Marking line item ${stepIdToCheck} as checked from ${source}`);
          
          // Update all checkbox states to include this item
          const newImmediate = new Set(immediateState);
          const newPersistent = new Set(persistentState);
          const newBackup = new Set(backupState);
          
          newImmediate.add(stepIdToCheck);
          newPersistent.add(stepIdToCheck);
          newBackup.add(stepIdToCheck);
          
          setImmediateState(newImmediate);
          setPersistentState(newPersistent);
          setBackupState(newBackup);
          
          // Save to storage
          saveCheckboxState(projectId, newPersistent);
          
          // Force a render to show the updated checkbox
          setRenderCounter(prev => prev + 1);
          
          console.log(`✅ ProjectChecklistPage: Successfully marked ${stepIdToCheck} as completed`);
        } else {
          console.warn(`⚠️ ProjectChecklistPage: Could not determine step ID format for line item ${lineItemId}`);
        }
      }
    };
    
    // Add event listener
    window.addEventListener('workflowStepCompleted', handleWorkflowStepCompleted);
    
    // Cleanup
    return () => {
      window.removeEventListener('workflowStepCompleted', handleWorkflowStepCompleted);
    };
  }, [projectId, immediateState, persistentState, backupState]);

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

  // Get phase color circle background class using centralized props
  const getPhaseColor = (phaseId) => {
    const props = WorkflowProgressService.getPhaseButtonProps(phaseId);
    return props.bgColor || 'bg-gray-500';
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

  // Get current workflow data based on active tab
  const currentWorkflow = workflowData[activeWorkflowIndex];
  const currentWorkflowPhases = currentWorkflow?.phases || [];

  return (
    <div className="max-w-4xl mx-auto p-0 space-y-0">
      
      {/* Workflow Tabs */}
      {workflowTabs.length > 1 && (
        <div className="bg-white border-b border-gray-200 mb-6">
          <div className="flex space-x-1 overflow-x-auto">
            {workflowTabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveWorkflowIndex(index)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  index === activeWorkflowIndex
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{tab.name}</span>
                  {tab.isMainWorkflow && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Main
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {tab.completedCount}/{tab.totalCount}
                  </span>
                  <div className="w-12 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${tab.progress}%` }}
                    ></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Workflow Title */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentWorkflow?.tradeName || 'Workflow'} Checklist
              {currentWorkflow?.isMainWorkflow && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Main Workflow
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {currentWorkflow?.completedCount || 0} of {currentWorkflow?.totalCount || 0} items completed 
              ({currentWorkflow?.totalCount > 0 ? Math.round((currentWorkflow.completedCount / currentWorkflow.totalCount) * 100) : 0}%)
            </p>
          </div>
          
          {/* Create Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCreateSectionModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircleIcon className="w-4 h-4 mr-1" />
              Add Section
            </button>
            <button
              onClick={() => setShowCreateLineItemModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <PlusCircleIcon className="w-4 h-4 mr-1" />
              Add Line Item
            </button>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-4">
        {currentWorkflowPhases.map((phase) => {
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
                                        console.log(`Checkbox onChange: ${stepId}, Database ID: ${subtaskId}`);
                                        handleCheckboxToggle(subtaskId || stepId, phase.id, item.id, subIdx);
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
      
      {/* Create Section Modal */}
      {showCreateSectionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Section</h3>
              <form onSubmit={handleCreateSection}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phase
                  </label>
                  <select
                    value={selectedPhaseForSection?.id || ''}
                    onChange={(e) => {
                      const phase = currentWorkflowPhases.find(p => p.id === e.target.value);
                      setSelectedPhaseForSection(phase);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a phase</option>
                    {currentWorkflowPhases.map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section Name *
                  </label>
                  <input
                    type="text"
                    value={createSectionData.sectionName}
                    onChange={(e) => setCreateSectionData({...createSectionData, sectionName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter section name"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={createSectionData.displayName}
                    onChange={(e) => setCreateSectionData({...createSectionData, displayName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter display name (optional)"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={createSectionData.description}
                    onChange={(e) => setCreateSectionData({...createSectionData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter description (optional)"
                    rows="3"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateSectionModal(false);
                      setCreateSectionData({ sectionName: '', displayName: '', description: '' });
                      setSelectedPhaseForSection(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingSection || !selectedPhaseForSection || !createSectionData.sectionName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingSection ? 'Creating...' : 'Create Section'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Line Item Modal */}
      {showCreateLineItemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Line Item</h3>
              <form onSubmit={handleCreateLineItem}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section
                  </label>
                  <select
                    value={selectedSectionForLineItem?.id || ''}
                    onChange={(e) => {
                      // Find the section across all phases
                      let foundSection = null;
                      for (const phase of currentWorkflowPhases) {
                        const section = phase.items.find(s => s.id === e.target.value);
                        if (section) {
                          foundSection = section;
                          break;
                        }
                      }
                      setSelectedSectionForLineItem(foundSection);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a section</option>
                    {currentWorkflowPhases.map((phase) => (
                      <optgroup key={phase.id} label={phase.label}>
                        {phase.items.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={createLineItemData.itemName}
                    onChange={(e) => setCreateLineItemData({...createLineItemData, itemName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter item name"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsible Role *
                  </label>
                  <select
                    value={createLineItemData.responsibleRole}
                    onChange={(e) => setCreateLineItemData({...createLineItemData, responsibleRole: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="WORKER">Worker</option>
                    <option value="FOREMAN">Foreman</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={createLineItemData.description}
                    onChange={(e) => setCreateLineItemData({...createLineItemData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter description (optional)"
                    rows="3"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Minutes
                    </label>
                    <input
                      type="number"
                      value={createLineItemData.estimatedMinutes}
                      onChange={(e) => setCreateLineItemData({...createLineItemData, estimatedMinutes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alert Days
                    </label>
                    <input
                      type="number"
                      value={createLineItemData.alertDays}
                      onChange={(e) => setCreateLineItemData({...createLineItemData, alertDays: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1"
                      min="1"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateLineItemModal(false);
                      setCreateLineItemData({
                        itemName: '',
                        responsibleRole: 'WORKER',
                        description: '',
                        estimatedMinutes: 30,
                        alertDays: 1
                      });
                      setSelectedSectionForLineItem(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingLineItem || !selectedSectionForLineItem || !createLineItemData.itemName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingLineItem ? 'Creating...' : 'Create Line Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectChecklistPage;