import React, { useState, useEffect, useRef } from 'react';
import { useSocket, useRealTimeUpdates } from '../../hooks/useSocket';
import api, { projectsService, workflowAlertsService } from '../../services/api';
import workflowService from '../../services/workflowService';
import { ChevronDownIcon } from '../common/Icons';
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

// Recursive sub-item renderer for N-level nesting
const RecursiveSubItems = ({ 
  children, depth, phase, item, projectId, 
  isItemChecked, handleCheckboxToggle, projectPosition, 
  highlightedLineItemId, api, setWorkflowData,
  inlineNewSubItem, setInlineNewSubItem 
}) => {
  if (!children || children.length === 0) return null;
  const marginLeft = `${depth * 1.5}rem`;
  
  return (
    <div style={{ marginLeft }} className="mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
      {children.map((child, idx) => {
        const childId = child.id;
        const childLabel = child.label;
        const isChecked = isItemChecked(childId);
        const hasGrandchildren = child.children && child.children.length > 0;
        
        return (
          <React.Fragment key={childId || idx}>
            <div className="workflow-line-item group flex items-start space-x-2 py-0.5">
              {/* Checkbox */}
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleCheckboxToggle(childId, phase.id, item.id, idx, child)}
                  className="h-3.5 w-3.5 rounded border-2 border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500 checked:bg-[var(--color-primary-blueprint-blue)] checked:border-blue-600"
                />
              </div>
              {/* Label */}
              <span className={`flex-1 text-xs cursor-pointer select-none ${
                isChecked ? 'text-gray-400 line-through' : 'text-gray-700 hover:text-blue-600'
              }`}>
                {childLabel}
                {hasGrandchildren && (
                  <span className="ml-1 text-gray-400">({child.children.length})</span>
                )}
              </span>
              {/* Delete */}
              {childId && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm('Delete this sub-item?')) return;
                    try {
                      let resp;
                      try { resp = await api.delete(`/workflows/line-items/${childId}`); }
                      catch (e) { resp = await api.post(`/workflows/line-items/${childId}/delete`); }
                      if (resp.data?.success) {
                        const wr = await api.get(`/workflow-data/project-workflows/${projectId}`);
                        if (wr.data.success) setWorkflowData(wr.data.data);
                      }
                    } catch (err) { alert('Failed to delete'); }
                  }}
                  className="p-0.5 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-7 4v6m4-6v6M7 7l1 13a2 2 0 002 2h4a2 2 0 002-2l1-13" />
                  </svg>
                </button>
              )}
              {/* Add sub-item */}
              {childId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setInlineNewSubItem(prev => ({
                      ...prev,
                      [childId]: prev[childId] ? undefined : { name: '', sectionId: item.id, saving: false }
                    }));
                  }}
                  className="p-0.5 rounded text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition"
                  title="Add sub-item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
            {/* Inline sub-item form */}
            {childId && inlineNewSubItem[childId] && (
              <div style={{ marginLeft: '1.5rem' }} className="mt-0.5">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const val = inlineNewSubItem[childId]?.name?.trim();
                    if (!val) return;
                    setInlineNewSubItem(prev => ({ ...prev, [childId]: { ...prev[childId], saving: true } }));
                    try {
                      const resp = await api.post('/workflows/line-items', {
                        sectionId: item.id, itemName: val, responsibleRole: 'PROJECT_MANAGER', parentId: childId
                      });
                      if (resp.data?.success) {
                        const wr = await api.get(`/workflow-data/project-workflows/${projectId}`);
                        if (wr.data.success) setWorkflowData(wr.data.data);
                        setInlineNewSubItem(prev => ({ ...prev, [childId]: undefined }));
                      }
                    } catch (err) {
                      alert('Failed to add sub-item');
                      setInlineNewSubItem(prev => ({ ...prev, [childId]: { ...prev[childId], saving: false } }));
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    autoFocus type="text"
                    value={inlineNewSubItem[childId]?.name || ''}
                    onChange={(e) => setInlineNewSubItem(prev => ({ ...prev, [childId]: { ...prev[childId], name: e.target.value } }))}
                    className="px-1 py-0.5 border border-gray-300 rounded text-xs w-32"
                    placeholder="Sub-item name"
                  />
                  <button type="submit" disabled={inlineNewSubItem[childId]?.saving} className="px-1.5 py-0.5 text-xs text-white bg-blue-500 rounded disabled:opacity-50">
                    {inlineNewSubItem[childId]?.saving ? '...' : 'Add'}
                  </button>
                  <button type="button" onClick={() => setInlineNewSubItem(prev => ({ ...prev, [childId]: undefined }))} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                </form>
              </div>
            )}
            {/* Recurse into grandchildren */}
            {hasGrandchildren && (
              <RecursiveSubItems
                children={child.children}
                depth={depth + 1}
                phase={phase}
                item={item}
                projectId={projectId}
                isItemChecked={isItemChecked}
                handleCheckboxToggle={handleCheckboxToggle}
                projectPosition={projectPosition}
                highlightedLineItemId={highlightedLineItemId}
                api={api}
                setWorkflowData={setWorkflowData}
                inlineNewSubItem={inlineNewSubItem}
                setInlineNewSubItem={setInlineNewSubItem}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ProjectChecklistPage = ({ project, onUpdate, onPhaseCompletionChange, targetLineItemId, targetSectionId, selectionNonce, onBack, colorMode, projectSourceSection, onProjectSelect }) => {
  const projectId = project?._id || project?.id;
  const normalizeRoleForServer = () => 'PROJECT_MANAGER';
  
  // LOG NAVIGATION PARAMETERS - Enhanced for Current Alerts debugging
  console.log('📍 PROJECT CHECKLIST PAGE - Navigation params received:');
  console.log('   targetLineItemId:', targetLineItemId);
  console.log('   targetSectionId:', targetSectionId);
  console.log('   projectId:', projectId);
  console.log('   project.navigationSource:', project?.navigationSource);
  console.log('   project.highlightTarget:', project?.highlightTarget);
  console.log('   project.navigationTarget:', project?.navigationTarget);
  console.log('   project.returnToSection:', project?.returnToSection);
  
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
  const [inlineNewSection, setInlineNewSection] = useState({});
  const [inlineNewLineItem, setInlineNewLineItem] = useState({});
  
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
  const [navigationNonce, setNavigationNonce] = useState(project?.navigationTarget?.nonce || null);
  
  // React to changes in incoming targets (e.g., tab click deep-link)
  useEffect(() => {
    if (targetLineItemId || targetSectionId) {
      setHighlightedLineItemId(targetLineItemId || highlightedLineItemId);
      setHighlightedSectionId(targetSectionId || highlightedSectionId);
      setNavigationNonce(Date.now());
    }
  }, [targetLineItemId, targetSectionId]);
  
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
    responsibleRole: 'OFFICE',
    description: '',
    estimatedMinutes: 30,
    alertDays: 1,
    addToAllWorkflows: false
  });
  const [selectedSectionForLineItem, setSelectedSectionForLineItem] = useState(null);
  const [creatingLineItem, setCreatingLineItem] = useState(false);
  
  // Custom workflow creation states
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [createWorkflowData, setCreateWorkflowData] = useState({
    name: '',
    description: '',
    phases: [{ phaseName: '' }]
  });
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  
  // Custom workflow edit states
  const [showEditWorkflowModal, setShowEditWorkflowModal] = useState(false);
  const [editWorkflowData, setEditWorkflowData] = useState(null); // { customWorkflowId, name, description, phases: [{ id, phaseName, isNew, isDeleted }] }
  const [savingWorkflowEdit, setSavingWorkflowEdit] = useState(false);
  
  // Sub-item inline creation state { [parentLineItemId]: { name, sectionId, saving } }
  const [inlineNewSubItem, setInlineNewSubItem] = useState({});
  
  // =================================================================
  // CHECKBOX HANDLERS
  // =================================================================
  
  const handleCheckboxToggle = (stepId, phaseId, itemId, subIdx, subtaskData) => {
    console.log(`Checkbox clicked: ${stepId}`);
    
    // Get current state
    const isCurrentlyChecked = immediateState.has(stepId) || persistentState.has(stepId);
    const newState = !isCurrentlyChecked;
    
    console.log(`Toggle: ${stepId} from ${isCurrentlyChecked} to ${newState}`);
    
    // =================================================================
    // PARENT/CHILD COMPLETION LOGIC
    // =================================================================
    
    // Helper to collect ALL descendant IDs recursively
    const collectChildIds = (children) => {
      if (!children || children.length === 0) return [];
      const ids = [];
      for (const child of children) {
        const childId = child.id || child;
        ids.push(childId);
        if (child.children) ids.push(...collectChildIds(child.children));
      }
      return ids;
    };
    
    // Helper to check if ALL children are completed
    const allChildrenCompleted = (children) => {
      if (!children || children.length === 0) return true;
      return children.every(child => {
        const childId = child.id || child;
        const isChildChecked = immediateState.has(childId) || persistentState.has(childId);
        return isChildChecked && allChildrenCompleted(child.children);
      });
    };
    
    // If the item has children and user is trying to CHECK it
    const hasChildren = subtaskData?.children && subtaskData.children.length > 0;
    if (hasChildren && newState === true) {
      // Can't check parent until all children are done
      if (!allChildrenCompleted(subtaskData.children)) {
        const autoComplete = window.confirm(
          'This item has sub-items that are not yet completed. \n\nWould you like to auto-complete all sub-items?'
        );
        if (!autoComplete) return; // User cancelled
        // Auto-complete all children then the parent
        const childIds = collectChildIds(subtaskData.children);
        batchUpdateStates([stepId, ...childIds], true);
        // Server sync for each
        setTimeout(() => {
          [stepId, ...childIds].forEach(id => {
            workflowService.updateStep(projectId, id, true).catch(e => console.error('Sync fail:', id, e));
          });
          if (onUpdate) onUpdate();
        }, 10);
        return;
      }
    }
    
    // If user is UNCHECKING a parent, also uncheck all children
    if (hasChildren && newState === false) {
      const childIds = collectChildIds(subtaskData.children);
      batchUpdateStates([stepId, ...childIds], false);
      setTimeout(() => {
        [stepId, ...childIds].forEach(id => {
          workflowService.updateStep(projectId, id, false).catch(e => console.error('Sync fail:', id, e));
        });
        if (onUpdate) onUpdate();
      }, 10);
      return;
    }
    
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
  
  // Batch update states for parent/child auto-complete
  const batchUpdateStates = (ids, checked) => {
    const newImmediate = new Set(immediateState);
    const newPersistent = new Set(persistentState);
    const newBackup = new Set(backupState);
    for (const id of ids) {
      if (checked) {
        newImmediate.add(id);
        newPersistent.add(id);
        newBackup.add(id);
      } else {
        newImmediate.delete(id);
        newPersistent.delete(id);
        newBackup.delete(id);
      }
    }
    setImmediateState(newImmediate);
    setPersistentState(newPersistent);
    setBackupState(newBackup);
    setRenderCounter(prev => prev + 1);
    saveCheckboxState(projectId, newPersistent);
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
    
    // Validate form data
    if (!selectedPhaseForSection) {
      alert('Please select a phase for the section.');
      return;
    }
    
    if (!createSectionData.sectionName.trim()) {
      alert('Please enter a section name.');
      return;
    }
    
    setCreatingSection(true);
    try {
      const requestData = {
        phaseId: selectedPhaseForSection.id,
        sectionName: createSectionData.sectionName.trim(),
        displayName: createSectionData.displayName.trim() || createSectionData.sectionName.trim(),
        description: createSectionData.description.trim() ? createSectionData.description.trim() : undefined
      };
      
      console.log('🔍 CREATE SECTION: Sending request data:', requestData);
      
             const response = await api.post('/workflows/sections', requestData);
      
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
    
    // Validate form data
    if (!selectedSectionForLineItem) {
      alert('Please select a section for the line item.');
      return;
    }
    
    if (!createLineItemData.itemName.trim()) {
      alert('Please enter an item name.');
      return;
    }
    
    setCreatingLineItem(true);
    try {
      const requestData = {
        sectionId: selectedSectionForLineItem.id,
        itemName: createLineItemData.itemName.trim(),
        responsibleRole: normalizeRoleForServer(createLineItemData.responsibleRole),
        description: createLineItemData.description.trim() ? createLineItemData.description.trim() : undefined,
        estimatedMinutes: parseInt(createLineItemData.estimatedMinutes) || 30,
        alertDays: parseInt(createLineItemData.alertDays) || 1,
        addToAllWorkflows: createLineItemData.addToAllWorkflows
      };
      
      console.log('🔍 CREATE LINE ITEM: Sending request data:', requestData);
      
             const response = await api.post('/workflows/line-items', requestData);
      
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
          alertDays: 1,
          addToAllWorkflows: false
        });
        setSelectedSectionForLineItem(null);
        setShowCreateLineItemModal(false);
        
        console.log('✅ Line item created successfully:', response.data.data);
      }
    } catch (error) {
      console.error('❌ Error creating line item:', error);
      const serverMsg = error?.response?.data?.message;
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors && Array.isArray(serverErrors)) {
        const first = serverErrors[0];
        alert(first?.msg || first?.message || serverMsg || 'Failed to create line item.');
      } else {
        alert(serverMsg || 'Failed to create line item. Please try again.');
      }
    } finally {
      setCreatingLineItem(false);
    }
  };
  
  // =================================================================
  // CREATE CUSTOM WORKFLOW HANDLER
  // =================================================================
  
  const handleCreateCustomWorkflow = async (e) => {
    e.preventDefault();
    if (!createWorkflowData.name.trim()) {
      alert('Please enter a workflow name.');
      return;
    }
    setCreatingWorkflow(true);
    try {
      const validPhases = createWorkflowData.phases
        .filter(p => p.phaseName.trim())
        .map(p => ({ phaseName: p.phaseName.trim() }));
      
      const requestData = {
        projectId,
        name: createWorkflowData.name.trim(),
        description: createWorkflowData.description.trim() || undefined,
        phases: validPhases.length > 0 ? validPhases : undefined
      };
      
      const response = await api.post('/workflows/custom', requestData);
      if (response.data.success) {
        // Refresh workflow data
        const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
        if (workflowResponse.data.success) {
          const newData = workflowResponse.data.data;
          setWorkflowData(newData);
          
          // Rebuild workflow tabs
          const tabs = newData.map((workflow, index) => ({
            id: workflow.customWorkflowId || workflow.workflowType,
            name: workflow.tradeName,
            isMainWorkflow: workflow.isMainWorkflow,
            completedCount: workflow.completedCount,
            totalCount: workflow.totalCount,
            progress: workflow.totalCount > 0 ? Math.round((workflow.completedCount / workflow.totalCount) * 100) : 0
          }));
          setWorkflowTabs(tabs);
          
          // Switch to the new workflow (last item in the array)
          setActiveWorkflowIndex(newData.length - 1);
        }
        // Reset and close
        setCreateWorkflowData({ name: '', description: '', phases: [{ phaseName: '' }] });
        setShowCreateWorkflowModal(false);
        console.log('✅ Custom workflow created:', response.data.data);
      }
    } catch (error) {
      console.error('❌ Error creating custom workflow:', error);
      alert(error?.response?.data?.message || 'Failed to create workflow.');
    } finally {
      setCreatingWorkflow(false);
    }
  };
  
  // Open edit modal for existing custom workflow
  const openEditWorkflowModal = (workflowIndex) => {
    const workflow = workflowData[workflowIndex];
    if (!workflow || !workflow.customWorkflowId) return;
    
    setEditWorkflowData({
      customWorkflowId: workflow.customWorkflowId,
      name: workflow.tradeName || '',
      description: '', // We don't store description in the tab data; user can update if needed
      phases: workflow.phases.map(phase => ({
        id: phase.phaseId,
        phaseName: phase.label,
        isNew: false,
        isDeleted: false
      }))
    });
    setShowEditWorkflowModal(true);
  };
  
  // Save edits to custom workflow (name, phases)
  const handleSaveWorkflowEdits = async (e) => {
    e.preventDefault();
    if (!editWorkflowData) return;
    
    setSavingWorkflowEdit(true);
    try {
      const { customWorkflowId, name, description, phases } = editWorkflowData;
      
      // 1. Update workflow name/description
      await api.put(`/workflows/custom/${customWorkflowId}`, {
        name: name.trim(),
        description: description?.trim() || undefined
      });
      
      // 2. Process phase changes
      for (const phase of phases) {
        if (phase.isDeleted && !phase.isNew) {
          // Delete existing phase
          await api.delete(`/workflows/custom/${customWorkflowId}/phases/${phase.id}`);
        } else if (phase.isNew && !phase.isDeleted && phase.phaseName.trim()) {
          // Create new phase
          await api.post(`/workflows/custom/${customWorkflowId}/phases`, {
            phaseName: phase.phaseName.trim()
          });
        } else if (!phase.isNew && !phase.isDeleted) {
          // Update existing phase name if changed
          await api.put(`/workflows/custom/${customWorkflowId}/phases/${phase.id}`, {
            phaseName: phase.phaseName.trim()
          });
        }
      }
      
      // 3. Refresh workflow data
      const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
      if (workflowResponse.data.success) {
        const newData = workflowResponse.data.data;
        setWorkflowData(newData);
        
        const tabs = newData.map((workflow) => ({
          id: workflow.customWorkflowId || workflow.workflowType,
          name: workflow.tradeName,
          isMainWorkflow: workflow.isMainWorkflow,
          completedCount: workflow.completedCount,
          totalCount: workflow.totalCount,
          progress: workflow.totalCount > 0 ? Math.round((workflow.completedCount / workflow.totalCount) * 100) : 0
        }));
        setWorkflowTabs(tabs);
      }
      
      setShowEditWorkflowModal(false);
      setEditWorkflowData(null);
      console.log('✅ Custom workflow updated successfully');
    } catch (error) {
      console.error('❌ Error updating custom workflow:', error);
      alert(error?.response?.data?.message || 'Failed to update workflow.');
    } finally {
      setSavingWorkflowEdit(false);
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
            id: workflow.customWorkflowId || workflow.workflowType,
            name: workflow.tradeName,
            isMainWorkflow: workflow.isMainWorkflow,
            isCustom: workflow.workflowType === 'CUSTOM',
            customWorkflowId: workflow.customWorkflowId || null,
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
          
          // Enhanced navigation handling - check project metadata for Current Alerts navigation
          let expanded = false;
          const hasNavigationTarget = targetLineItemId || targetSectionId || urlHighlight || 
                                     project?.highlightTarget || project?.navigationTarget;
          
          if (hasNavigationTarget) {
            console.log('🎯 ENHANCED NAVIGATION: Processing navigation target from', project?.navigationSource || 'unknown');
            
            // Use enhanced navigation metadata if available (from Current Alerts)
            if (project?.highlightTarget) {
              const target = project.highlightTarget;
              console.log('🎯 ENHANCED NAVIGATION: Using highlightTarget:', target);
              if (target.phaseId && target.sectionId) {
                setOpenPhase(target.phaseId);
                setOpenItem(prev => ({ ...prev, [target.sectionId]: true }));
                expanded = true;
              }
            } else if (project?.navigationTarget) {
              const target = project.navigationTarget;
              console.log('🎯 ENHANCED NAVIGATION: Using navigationTarget:', target);
              if (target.phase && target.section) {
                // Find phase and section within the current workflow
                const phasesToSearch = (mainWorkflow?.phases || []);
                const targetPhase = phasesToSearch.find(p => 
                  p.id === target.phase || p.label === target.phase || p.name === target.phase
                );
                if (targetPhase) {
                  const targetSection = (targetPhase.items || []).find(item => 
                    item.id === target.section || item.displayName === target.section || item.label === target.section
                  );
                  if (targetSection) {
                    console.log('🎯 ENHANCED NAVIGATION: Expanding phase/section from navigationTarget');
                    setOpenPhase(targetPhase.id);
                    setOpenItem(prev => ({ ...prev, [targetSection.id]: true }));
                    expanded = true;
                  }
                }
              }
            }
            
            // Fallback to standard navigation if enhanced navigation didn't handle it
            if (!expanded) {
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
          
          // Enhanced auto-scroll with Current Alerts navigation support
          setTimeout(() => {
            let targetElement = null;
            let scrollReason = '';
            
            // Priority 0: Enhanced navigation from Current Alerts
            if (project?.highlightTarget && project.highlightTarget.scrollAndHighlight) {
              const target = project.highlightTarget;
              console.log('🎯 ENHANCED SCROLL: Attempting to scroll to highlightTarget:', target.lineItemId);
              
              targetElement = document.getElementById(`lineitem-${target.lineItemId}`);
              if (!targetElement) {
                targetElement = document.getElementById(`lineitem-checkbox-${target.lineItemId}`);
                if (targetElement) {
                  targetElement = targetElement.closest('.workflow-line-item');
                }
              }
              
              if (targetElement) {
                scrollReason = `Enhanced navigation from ${project.navigationSource}: ${target.lineItemId}`;
              }
            }
            // Priority 0.5: Enhanced navigation with navigationTarget
            else if (project?.navigationTarget && project.navigationTarget.autoOpen) {
              const target = project.navigationTarget;
              const targetElementId = target.targetElementId || `lineitem-${target.lineItemId}`;
              console.log('🎯 ENHANCED SCROLL: Attempting to scroll to navigationTarget:', targetElementId);
              
              targetElement = document.getElementById(targetElementId);
              if (!targetElement && target.lineItemId) {
                targetElement = document.getElementById(`lineitem-${target.lineItemId}`);
              }
              if (!targetElement && target.lineItemId) {
                targetElement = document.getElementById(`lineitem-checkbox-${target.lineItemId}`);
                if (targetElement) {
                  targetElement = targetElement.closest('.workflow-line-item');
                }
              }
              
              if (targetElement) {
                scrollReason = `Enhanced navigation from ${project.navigationSource}: ${target.lineItemId || targetElementId}`;
              }
            }
            // Priority 1: Standard navigation to specific target line item (prop or URL param)
            else {
              const effectiveTargetLineItem = targetLineItemId || urlHighlight;
              if (effectiveTargetLineItem) {
                targetElement = document.getElementById(`lineitem-${effectiveTargetLineItem}`);
                scrollReason = `target line item: ${effectiveTargetLineItem}`;
                
                // If not found by lineitem ID, try checkbox ID format
                if (!targetElement) {
                  targetElement = document.getElementById(`lineitem-checkbox-${effectiveTargetLineItem}`);
                  if (targetElement) {
                    targetElement = targetElement.closest('.workflow-line-item');
                    scrollReason = `target line item (via checkbox): ${effectiveTargetLineItem}`;
                  }
                }
              }
            }
            
            // Priority 2: Navigate to specific target section
            if (!targetElement && targetSectionId) {
              targetElement = document.getElementById(`item-${targetSectionId}`);
              scrollReason = `target section: ${targetSectionId}`;
            }
            // Priority 3: Navigate to current project position
            if (!targetElement && mainWorkflow?.currentSection) {
              targetElement = document.getElementById(`item-${mainWorkflow.currentSection}`);
              scrollReason = `current section: ${mainWorkflow.currentSection}`;
            }
            
            if (targetElement) {
              console.log('🎯 HIGHLIGHTING:', scrollReason);
              
              targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
              
              // Enhanced highlighting with Current Alerts support
              const useEnhancedHighlight = project?.highlightTarget || project?.navigationTarget;
              const highlightColor = useEnhancedHighlight ? 
                (project.highlightTarget?.highlightColor || project.navigationTarget?.highlightColor || '#0066CC') : 
                '#F59E0B';
              const highlightDuration = useEnhancedHighlight ?
                (project.highlightTarget?.highlightDuration || project.navigationTarget?.highlightDuration || 5000) :
                8000;
              
              if (targetLineItemId || useEnhancedHighlight) {
                console.log('🎯 ENHANCED HIGHLIGHTING: Applying enhanced highlight from', project?.navigationSource);
                
                // Apply enhanced highlight for line items
                if (highlightColor === '#0066CC') {
                  // Special Current Alerts highlighting
                  targetElement.style.backgroundColor = '#EFF6FF';
                  targetElement.style.border = '3px solid #0066CC';
                  targetElement.style.boxShadow = '0 0 20px rgba(0, 102, 204, 0.5)';
                } else {
                  // Standard highlighting  
                  targetElement.style.backgroundColor = '#FEF3C7';
                  targetElement.style.border = '3px solid #F59E0B';
                  targetElement.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.5)';
                }
                
                targetElement.style.transition = 'all 0.3s ease';
                
                // Add pulsing animation
                targetElement.style.animation = 'pulse 1.5s ease-in-out 3';
                
                // Remove highlight after delay
                setTimeout(() => {
                  targetElement.style.backgroundColor = '';
                  targetElement.style.border = '';
                  targetElement.style.boxShadow = '';
                  targetElement.style.animation = '';
                }, highlightDuration);
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
        }
          
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

  // Get current workflow data based on active tab
  const currentWorkflow = workflowData?.[activeWorkflowIndex];
  const currentWorkflowPhases = currentWorkflow?.phases || [];

  useEffect(() => {
    // Re-run expansion and highlighting when targets change or nonce updates
    if (!currentWorkflow || (!targetLineItemId && !targetSectionId && !project?.navigationTarget)) return;

    // Expand phase/section based on incoming targets
    const run = async () => {
      try {
        let expandedLocal = false;
        const mainPhases = currentWorkflowPhases || [];

        // If explicit DB line item id provided, locate its phase/section
        if (targetLineItemId) {
          outer2: for (const phase of mainPhases) {
            for (const item of phase.items || []) {
              const match = (item.subtasks || []).some(st => typeof st === 'object' && (st.id === targetLineItemId || st.id === String(targetLineItemId)));
              if (match) {
                setOpenPhase(phase.id);
                setOpenItem(prev => ({ ...prev, [item.id]: true }));
                expandedLocal = true;
                break outer2;
              }
            }
          }
        }

        // Section targeting fallback
        if (!expandedLocal && targetSectionId) {
          const targetPhase = mainPhases.find(p => (p.items || []).some(i => i.id === targetSectionId));
          if (targetPhase) {
            setOpenPhase(targetPhase.id);
            setOpenItem(prev => ({ ...prev, [targetSectionId]: true }));
            expandedLocal = true;
          }
        }

        // navigationTarget phase/section names/ids
        if (!expandedLocal && project?.navigationTarget?.phase && project?.navigationTarget?.section) {
          const p = mainPhases.find(ph => ph.id === project.navigationTarget.phase || ph.label === project.navigationTarget.phase || ph.name === project.navigationTarget.phase);
          if (p) {
            const s = (p.items || []).find(it => it.id === project.navigationTarget.section || it.displayName === project.navigationTarget.section || it.label === project.navigationTarget.section);
            if (s) {
              setOpenPhase(p.id);
              setOpenItem(prev => ({ ...prev, [s.id]: true }));
              expandedLocal = true;
            }
          }
        }

        // Scroll and highlight
        setTimeout(() => {
          let el = null;
          const tli = targetLineItemId || project?.navigationTarget?.lineItemId || project?.highlightTarget?.lineItemId;
          if (tli) {
            el = document.getElementById(`lineitem-${tli}`) || document.getElementById(`lineitem-checkbox-${tli}`)?.closest('.workflow-line-item') || null;
          }
          if (!el && (targetSectionId || project?.navigationTarget?.targetSectionId)) {
            const sec = targetSectionId || project.navigationTarget.targetSectionId;
            el = document.getElementById(`item-${sec}`);
          }
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Force highlight each time
            const useEnhanced = project?.highlightTarget || project?.navigationTarget;
            const highlightColor = useEnhanced ? (project.highlightTarget?.highlightColor || project.navigationTarget?.highlightColor || '#0066CC') : '#F59E0B';
            if (highlightColor === '#0066CC') {
              el.style.backgroundColor = '#EFF6FF';
              el.style.border = '3px solid #0066CC';
              el.style.boxShadow = '0 0 20px rgba(0, 102, 204, 0.5)';
            } else {
              el.style.backgroundColor = '#FEF3C7';
              el.style.border = '3px solid #F59E0B';
              el.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.5)';
            }
            el.style.transition = 'all 0.3s ease';
            el.style.animation = 'pulse 1.5s ease-in-out 3';
            setTimeout(() => {
              el.style.backgroundColor = '';
              el.style.border = '';
              el.style.boxShadow = '';
              el.style.animation = '';
            }, (project.highlightTarget?.highlightDuration || project.navigationTarget?.highlightDuration || 5000));
          }
        }, 500);

        // Clear nonce so subsequent clicks with new nonce re-trigger
        if (project?.navigationTarget?.nonce) {
          setNavigationNonce(project.navigationTarget.nonce);
        }
      } catch (e) {
        console.error('Navigation re-run failed', e);
      }
    };

    run();
  // Include navigationNonce so each new click with a new nonce re-triggers
  }, [targetLineItemId, targetSectionId, project?.navigationTarget?.phase, project?.navigationTarget?.section, project?.navigationTarget?.lineItemId, navigationNonce, selectionNonce, currentWorkflowPhases]);

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
      
      {/* Back Button */}
      {onBack && (
        <div className="mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to {projectSourceSection === 'Project Workflow Line Items' ? 'Dashboard' : (projectSourceSection || 'Dashboard')}
          </button>
        </div>
      )}
      
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
                  {tab.isCustom && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Custom
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
                  {tab.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditWorkflowModal(index);
                      }}
                      className="ml-1 p-1 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50 transition-colors"
                      title="Edit workflow"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
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
              {currentWorkflow?.workflowType === 'CUSTOM' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  Custom
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {currentWorkflow?.completedCount || 0} of {currentWorkflow?.totalCount || 0} items completed 
              ({currentWorkflow?.totalCount > 0 ? Math.round((currentWorkflow.completedCount / currentWorkflow.totalCount) * 100) : 0}%)
            </p>
          </div>
          <button
            onClick={() => setShowCreateWorkflowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Workflow
          </button>
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
                {/* Inline add section */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInlineNewSection(prev => ({ ...prev, [phase.id]: prev[phase.id] ? undefined : { name: '', saving: false } }))}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700"
                  >
                    + Add Section
                  </button>
                  {inlineNewSection[phase.id] && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const val = inlineNewSection[phase.id].name?.trim();
                        if (!val) return;
                        setInlineNewSection(prev => ({ ...prev, [phase.id]: { ...prev[phase.id], saving: true } }));
                        try {
                          const payload = { phaseId: phase.id, sectionName: val, displayName: val };
                          const resp = await api.post('/workflows/sections', payload);
                          if (resp.data?.success) {
                            const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
                            if (workflowResponse.data.success) {
                              setWorkflowData(workflowResponse.data.data);
                            }
                            setInlineNewSection(prev => ({ ...prev, [phase.id]: undefined }));
                          }
                        } catch (err) {
                          alert(err?.response?.data?.message || 'Failed to add section');
                          setInlineNewSection(prev => ({ ...prev, [phase.id]: { ...prev[phase.id], saving: false } }));
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        autoFocus
                        type="text"
                        value={inlineNewSection[phase.id]?.name || ''}
                        onChange={(e) => setInlineNewSection(prev => ({ ...prev, [phase.id]: { ...prev[phase.id], name: e.target.value } }))}
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        placeholder="Section name"
                      />
                      <button type="submit" disabled={inlineNewSection[phase.id]?.saving} className="px-2 py-1 text-xs text-white bg-[var(--color-success-green)] rounded-md disabled:opacity-50">
                        {inlineNewSection[phase.id]?.saving ? 'Saving...' : 'Save'}
                      </button>
                    </form>
                  )}
                </div>
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
                        <div className="flex items-center justify-between group">
                          <span className="flex items-center gap-2">
                            {isCurrentSection && <span className="text-blue-500">👈</span>}
                            {item.label}
                          </span>
                          <div className="flex items-center gap-2">
                            {/* Delete section (subtle icon, shown on hover) */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!window.confirm('Delete this section?')) return;
                                try {
                                  let resp;
                                  try {
                                    resp = await api.delete(`/workflows/sections/${item.id}`);
                                  } catch (e) {
                                    // Fallback for environments without DELETE route
                                    resp = await api.post(`/workflows/sections/${item.id}/delete`);
                                  }
                                  if (resp.data?.success) {
                                    const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
                                    if (workflowResponse.data.success) {
                                      setWorkflowData(workflowResponse.data.data);
                                    }
                                  }
                                } catch (err) {
                                  alert(err?.response?.data?.message || 'Failed to delete section');
                                }
                              }}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                              title="Delete section"
                              aria-label="Delete section"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-7 4v6m4-6v6M7 7l1 13a2 2 0 002 2h4a2 2 0 002-2l1-13" />
                              </svg>
                            </button>
                            <ChevronDownIcon 
                              className={`w-4 h-4 transform transition-transform duration-200 ${
                                openItem[item.id] ? 'rotate-180' : ''
                              }`} 
                            />
                          </div>
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
                                <React.Fragment key={subIdx}>
                                <div 
                                  id={`lineitem-${lineItemId}`}
                                  className={`workflow-line-item group flex items-start space-x-3 ${
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
                                        handleCheckboxToggle(subtaskId || stepId, phase.id, item.id, subIdx, subtask);
                                      }}
                                      onClick={(e) => {
                                        console.log(`Checkbox onClick: ${stepId}`);
                                        e.stopPropagation();
                                      }}
                                      className={`h-4 w-4 rounded border-2 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all duration-200 checked:bg-[var(--color-primary-blueprint-blue)] checked:border-blue-600 ${
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
                                    {subtask.children && subtask.children.length > 0 && (
                                      <span className="ml-1 text-xs text-gray-400">({subtask.children.length} sub-items)</span>
                                    )}
                                  </label>
                                  {/* Delete line item (subtle icon on hover) */}
                                  {subtaskId && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
        										if (!window.confirm('Delete this line item?')) return;
                                        try {
                                          let resp;
                                          try {
                                            resp = await api.delete(`/workflows/line-items/${subtaskId}`);
                                          } catch (e) {
                                            // Fallback for environments without DELETE route
                                            resp = await api.post(`/workflows/line-items/${subtaskId}/delete`);
                                          }
                                          if (resp.data?.success) {
                                            const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
                                            if (workflowResponse.data.success) {
                                              setWorkflowData(workflowResponse.data.data);
                                            }
                                          }
                                        } catch (err) {
                                          alert(err?.response?.data?.message || 'Failed to delete line item');
                                        }
                                      }}
                                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition ml-2"
                                      title="Delete line item"
                                      aria-label="Delete line item"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-7 4v6m4-6v6M7 7l1 13a2 2 0 002 2h4a2 2 0 002-2l1-13" />
                                      </svg>
                                    </button>
                                  )}
                                  {/* Add Sub-Item button */}
                                  {subtaskId && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInlineNewSubItem(prev => ({
                                          ...prev,
                                          [subtaskId]: prev[subtaskId] ? undefined : { name: '', sectionId: item.id, saving: false }
                                        }));
                                      }}
                                      className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition ml-1"
                                      title="Add sub-item"
                                      aria-label="Add sub-item"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                {/* Inline sub-item creation form */}
                                {subtaskId && inlineNewSubItem[subtaskId] && (
                                  <div className="ml-7 mt-1">
                                    <form
                                      onSubmit={async (e) => {
                                        e.preventDefault();
                                        const val = inlineNewSubItem[subtaskId]?.name?.trim();
                                        if (!val) return;
                                        setInlineNewSubItem(prev => ({ ...prev, [subtaskId]: { ...prev[subtaskId], saving: true } }));
                                        try {
                                          const payload = {
                                            sectionId: item.id,
                                            itemName: val,
                                            responsibleRole: 'PROJECT_MANAGER',
                                            parentId: subtaskId
                                          };
                                          const resp = await api.post('/workflows/line-items', payload);
                                          if (resp.data?.success) {
                                            const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
                                            if (workflowResponse.data.success) setWorkflowData(workflowResponse.data.data);
                                            setInlineNewSubItem(prev => ({ ...prev, [subtaskId]: undefined }));
                                          }
                                        } catch (err) {
                                          alert(err?.response?.data?.message || 'Failed to add sub-item');
                                          setInlineNewSubItem(prev => ({ ...prev, [subtaskId]: { ...prev[subtaskId], saving: false } }));
                                        }
                                      }}
                                      className="flex items-center gap-2"
                                    >
                                      <input
                                        autoFocus
                                        type="text"
                                        value={inlineNewSubItem[subtaskId]?.name || ''}
                                        onChange={(e) => setInlineNewSubItem(prev => ({ ...prev, [subtaskId]: { ...prev[subtaskId], name: e.target.value } }))}
                                        className="px-2 py-1 border border-gray-300 rounded-md text-xs"
                                        placeholder="Sub-item name"
                                      />
                                      <button type="submit" disabled={inlineNewSubItem[subtaskId]?.saving} className="px-2 py-1 text-xs text-white bg-blue-500 rounded-md disabled:opacity-50">
                                        {inlineNewSubItem[subtaskId]?.saving ? '...' : 'Add'}
                                      </button>
                                      <button type="button" onClick={() => setInlineNewSubItem(prev => ({ ...prev, [subtaskId]: undefined }))} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">
                                        ✕
                                      </button>
                                    </form>
                                  </div>
                                )}
                                {/* Recursive children rendering */}
                                {subtask.children && subtask.children.length > 0 && (
                                  <RecursiveSubItems
                                    children={subtask.children}
                                    depth={1}
                                    phase={phase}
                                    item={item}
                                    projectId={projectId}
                                    isItemChecked={isItemChecked}
                                    handleCheckboxToggle={handleCheckboxToggle}
                                    projectPosition={projectPosition}
                                    highlightedLineItemId={highlightedLineItemId}
                                    api={api}
                                    setWorkflowData={setWorkflowData}
                                    inlineNewSubItem={inlineNewSubItem}
                                    setInlineNewSubItem={setInlineNewSubItem}
                                  />
                                )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                          {/* Inline add line item */}
                          <div className="mt-3">
                            <button
                              onClick={() => setInlineNewLineItem(prev => ({ ...prev, [item.id]: prev[item.id] ? undefined : { name: '', role: 'OFFICE', saving: false } }))}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-[var(--color-success-green)] hover:bg-green-700"
                            >
                              + Add Line Item
                            </button>
                            {inlineNewLineItem[item.id] && (
                              <>
                                <form
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const val = inlineNewLineItem[item.id].name?.trim();
                                    if (!val) return;
                                    setInlineNewLineItem(prev => ({ ...prev, [item.id]: { ...prev[item.id], saving: true } }));
                                    try {
                                      const payload = {
                                        sectionId: item.id,
                                        itemName: val,
                                        responsibleRole: normalizeRoleForServer(inlineNewLineItem[item.id].role || 'OFFICE'),
                                        addToAllWorkflows: inlineNewLineItem[item.id]?.addToAllWorkflows || false
                                      };
                                      const resp = await api.post('/workflows/line-items', payload);
                                      if (resp.data?.success) {
                                        const workflowResponse = await api.get(`/workflow-data/project-workflows/${projectId}`);
                                        if (workflowResponse.data.success) {
                                          setWorkflowData(workflowResponse.data.data);
                                        }
                                        setInlineNewLineItem(prev => ({ ...prev, [item.id]: undefined }));
                                      }
                                    } catch (err) {
                                      alert(err?.response?.data?.message || 'Failed to add line item');
                                      setInlineNewLineItem(prev => ({ ...prev, [item.id]: { ...prev[item.id], saving: false } }));
                                    }
                                  }}
                                  className="flex items-center gap-2 mt-2"
                                >
                                  <input
                                    autoFocus
                                    type="text"
                                    value={inlineNewLineItem[item.id]?.name || ''}
                                    onChange={(e) => setInlineNewLineItem(prev => ({ ...prev, [item.id]: { ...prev[item.id], name: e.target.value } }))}
                                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                    placeholder="Line item name"
                                  />
                                  <select
                                    value={inlineNewLineItem[item.id]?.role || 'OFFICE'}
                                    onChange={(e) => setInlineNewLineItem(prev => ({ ...prev, [item.id]: { ...prev[item.id], role: e.target.value } }))}
                                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                  >
                                    <option value="OFFICE">Office</option>
                                    <option value="ADMINISTRATION">Administration</option>
                                    <option value="PROJECT_MANAGER">Project Manager</option>
                                    <option value="FIELD_DIRECTOR">Field Director</option>
                                    <option value="ROOF_SUPERVISOR">Roof Supervisor</option>
                                    <option value="OFFICE_STAFF">Office Staff</option>
                                  </select>
                                  <button type="submit" disabled={inlineNewLineItem[item.id]?.saving} className="px-2 py-1 text-xs text-white bg-[var(--color-success-green)] rounded-md disabled:opacity-50">
                                    {inlineNewLineItem[item.id]?.saving ? 'Saving...' : 'Save'}
                                  </button>
                                </form>
                                <div className="mt-2">
                                  <label className="flex items-center text-xs">
                                    <input
                                      type="checkbox"
                                      checked={inlineNewLineItem[item.id]?.addToAllWorkflows || false}
                                      onChange={(e) => setInlineNewLineItem(prev => ({ ...prev, [item.id]: { ...prev[item.id], addToAllWorkflows: e.target.checked } }))}
                                      className="mr-1 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-xs text-gray-600">
                                      Add to all workflows permanently
                                    </span>
                                  </label>
                                </div>
                              </>
                            )}
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
                    className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blueprint-blue)] rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <option value="OFFICE">Office</option>
                    <option value="ADMINISTRATION">Administration</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="FIELD_DIRECTOR">Field Director</option>
                    <option value="ROOF_SUPERVISOR">Roof Supervisor</option>
                    <option value="OFFICE_STAFF">Office Staff</option>
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
                
                {/* Add to all workflows checkbox */}
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createLineItemData.addToAllWorkflows}
                      onChange={(e) => setCreateLineItemData(prev => ({ ...prev, addToAllWorkflows: e.target.checked }))}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Add this line item to every workflow permanently
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    When checked, this line item will be added to all existing and future workflows of the same type
                  </p>
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
                        alertDays: 1,
                        addToAllWorkflows: false
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
                    className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-success-green)] rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingLineItem ? 'Creating...' : 'Create Line Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Custom Workflow Modal */}
      {showCreateWorkflowModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[28rem] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                Create Custom Workflow
              </h3>
              <form onSubmit={handleCreateCustomWorkflow}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workflow Name *
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={createWorkflowData.name}
                    onChange={(e) => setCreateWorkflowData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. Solar Panel Installation"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={createWorkflowData.description}
                    onChange={(e) => setCreateWorkflowData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Describe this workflow (optional)"
                    rows="2"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phases
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Define the phases for this workflow. Leave empty to use default phases.
                  </p>
                  <div className="space-y-2">
                    {createWorkflowData.phases.map((phase, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                        <input
                          type="text"
                          value={phase.phaseName}
                          onChange={(e) => {
                            const newPhases = [...createWorkflowData.phases];
                            newPhases[idx] = { phaseName: e.target.value };
                            setCreateWorkflowData(prev => ({ ...prev, phases: newPhases }));
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder={`Phase ${idx + 1} name`}
                        />
                        {createWorkflowData.phases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPhases = createWorkflowData.phases.filter((_, i) => i !== idx);
                              setCreateWorkflowData(prev => ({ ...prev, phases: newPhases }));
                            }}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCreateWorkflowData(prev => ({ ...prev, phases: [...prev.phases, { phaseName: '' }] }))}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Phase
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateWorkflowModal(false);
                      setCreateWorkflowData({ name: '', description: '', phases: [{ phaseName: '' }] });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingWorkflow || !createWorkflowData.name.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingWorkflow ? 'Creating...' : 'Create Workflow'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Custom Workflow Modal */}
      {showEditWorkflowModal && editWorkflowData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[28rem] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </span>
                Edit Custom Workflow
              </h3>
              <form onSubmit={handleSaveWorkflowEdits}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workflow Name *
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={editWorkflowData.name}
                    onChange={(e) => setEditWorkflowData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Workflow name"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editWorkflowData.description}
                    onChange={(e) => setEditWorkflowData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Update description (optional)"
                    rows="2"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phases
                  </label>
                  <div className="space-y-2">
                    {editWorkflowData.phases.map((phase, idx) => (
                      <div 
                        key={phase.id || `new-${idx}`} 
                        className={`flex items-center gap-2 ${phase.isDeleted ? 'opacity-40' : ''}`}
                      >
                        <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                        <input
                          type="text"
                          value={phase.phaseName}
                          disabled={phase.isDeleted}
                          onChange={(e) => {
                            const newPhases = [...editWorkflowData.phases];
                            newPhases[idx] = { ...newPhases[idx], phaseName: e.target.value };
                            setEditWorkflowData(prev => ({ ...prev, phases: newPhases }));
                          }}
                          className={`flex-1 px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                            phase.isDeleted ? 'line-through bg-red-50 border-red-200' : 
                            phase.isNew ? 'border-green-300 bg-green-50' : 'border-gray-300'
                          }`}
                          placeholder={`Phase ${idx + 1} name`}
                        />
                        {phase.isNew && !phase.isDeleted && (
                          <span className="text-xs text-green-600 font-medium">NEW</span>
                        )}
                        {phase.isDeleted ? (
                          <button
                            type="button"
                            onClick={() => {
                              const newPhases = [...editWorkflowData.phases];
                              newPhases[idx] = { ...newPhases[idx], isDeleted: false };
                              setEditWorkflowData(prev => ({ ...prev, phases: newPhases }));
                            }}
                            className="p-1 text-green-500 hover:text-green-700 text-xs font-medium"
                            title="Undo delete"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (phase.isNew) {
                                // Just remove new phases immediately
                                const newPhases = editWorkflowData.phases.filter((_, i) => i !== idx);
                                setEditWorkflowData(prev => ({ ...prev, phases: newPhases }));
                              } else {
                                // Mark existing phases for deletion
                                const activePhases = editWorkflowData.phases.filter(p => !p.isDeleted && p !== phase);
                                if (activePhases.length === 0) {
                                  alert('A workflow must have at least one phase.');
                                  return;
                                }
                                const newPhases = [...editWorkflowData.phases];
                                newPhases[idx] = { ...newPhases[idx], isDeleted: true };
                                setEditWorkflowData(prev => ({ ...prev, phases: newPhases }));
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditWorkflowData(prev => ({ ...prev, phases: [...prev.phases, { id: null, phaseName: '', isNew: true, isDeleted: false }] }))}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Phase
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditWorkflowModal(false);
                      setEditWorkflowData(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingWorkflowEdit || !editWorkflowData.name.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingWorkflowEdit ? 'Saving...' : 'Save Changes'}
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