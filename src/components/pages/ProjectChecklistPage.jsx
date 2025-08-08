import React, { useState, useEffect, useRef } from 'react';
import { useSocket, useRealTimeUpdates } from '../../hooks/useSocket';
import { projectsService, workflowAlertsService } from '../../services/api';
import workflowService from '../../services/workflowService';
import { ChevronDownIcon, PlusCircleIcon } from '../common/Icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useWorkflowUpdate } from '../../hooks/useWorkflowUpdate';
import PhaseOverrideButton from '../ui/PhaseOverrideButton';
import WorkflowProgressService from '../../services/workflowProgress';


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
      },
      {
        id: 'insurance-process',
        label: 'Insurance Process – Administration 📝',
        subtasks: [
          'Compare field vs insurance estimates',
          'Identify supplemental items',
          'Draft estimate in Xactimate'
        ]
      },
      {
        id: 'agreement-prep',
        label: 'Agreement Preparation – Administration 📝',
        subtasks: [
          'Trade cost analysis',
          'Prepare Estimate Forms',
          'Match AL estimates',
          'Calculate customer pay items',
          'Send shingle/class4 email – PDF'
        ]
      },
      {
        id: 'agreement-signing',
        label: 'Agreement Signing – Administration 📝',
        subtasks: [
          'Review and send signature request',
          'Record in QuickBooks',
          'Process deposit',
          'Collect signed disclaimers'
        ]
      }
    ]
  },
  {
    id: 'APPROVED',
    label: 'Approved Phase',
    items: [
      {
        id: 'admin-setup',
        label: 'Administrative Setup – Administration 📝',
        subtasks: [
          'Confirm shingle choice',
          'Order materials',
          'Create labor orders',
          'Send labor order to roofing crew'
        ]
      },
      {
        id: 'pre-job',
        label: 'Pre-Job Actions – Office 👩🏼‍💻',
        subtasks: [
          'Pull permits'
        ]
      },
      {
        id: 'prepare-production',
        label: 'Prepare for Production – Administration 📝',
        subtasks: [
          'All pictures in Job (Gutter, Ventilation, Elevation)'
        ],
        subheadings: [
          {
            id: 'verify-labor',
            label: 'Verify Labor Order in Scheduler',
            subtasks: [
              'Correct Dates',
              'Correct crew',
              'Send install schedule email to customer'
            ]
          },
          {
            id: 'verify-materials',
            label: 'Verify Material Orders',
            subtasks: [
              'Confirmations from supplier',
              'Call if no confirmation',
              'Provide special crew instructions'
            ]
          },
          {
            id: 'subcontractor-work-prep',
            label: 'Subcontractor Work',
            subtasks: [
              'Work order in scheduler',
              'Schedule subcontractor',
              'Communicate with customer'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'EXECUTION',
    label: 'Execution Phase',
    items: [
      {
        id: 'installation',
        label: 'Installation – Field Director 🛠️',
        subtasks: [
          'Document work start',
          'Capture progress photos',
          'Upload Pictures'
        ],
        subheadings: [
          {
            id: 'daily-progress',
            label: 'Daily Job Progress Note',
            subtasks: [
              'Work started/finished',
              'Days and people needed',
              'Format: 2 Guys for 4 hours'
            ]
          }
        ]
      },
      {
        id: 'quality-check',
        label: 'Quality Check – Field + Admin',
        subtasks: [
          'Completion photos – Roof Supervisor 🛠️',
          'Complete inspection – Roof Supervisor 🛠️',
          'Upload Roof Packet',
          'Verify Packet is complete – Admin 📝'
        ]
      },
      {
        id: 'multiple-trades',
        label: 'Multiple Trades – Administration 📝',
        subtasks: [
          'Confirm start date',
          'Confirm material/labor for all trades'
        ]
      },
      {
        id: 'subcontractor-work',
        label: 'Subcontractor Work – Administration 📝',
        subtasks: [
          'Confirm dates',
          'Communicate with customer'
        ]
      },
      {
        id: 'update-customer',
        label: 'Update Customer – Administration 📝',
        subtasks: [
          'Notify of completion',
          'Share photos',
          'Send 2nd half payment link'
        ]
      }
    ]
  },
  {
    id: 'SECOND_SUPPLEMENT',
    label: '2nd Supplement Phase',
    items: [
      {
        id: 'create-supp',
        label: 'Create Supp in Xactimate – Administration 📝',
        subtasks: [
          'Check Roof Packet & Checklist',
          'Label photos',
          'Add to Xactimate',
          'Submit to insurance'
        ]
      },
      {
        id: 'followup-calls',
        label: 'Follow-Up Calls – Administration 📝',
        subtasks: [
          'Call 2x/week until updated estimate'
        ]
      },
      {
        id: 'review-approved',
        label: 'Review Approved Supp – Administration 📝',
        subtasks: [
          'Update trade cost',
          'Prepare counter-supp or email',
          'Add to AL Estimate'
        ]
      },
      {
        id: 'customer-update',
        label: 'Customer Update – Administration',
        subtasks: [
          'Share 2 items minimum',
          'Let them know next steps'
        ]
      }
    ]
  },
  {
    id: 'COMPLETION',
    label: 'Completion Phase',
    items: [
      {
        id: 'financial-processing',
        label: 'Financial Processing – Administration 📝',
        subtasks: [
          'Verify worksheet',
          'Final invoice & payment link',
          'AR follow-up calls'
        ]
      },
      {
        id: 'project-closeout',
        label: 'Project Closeout – Office 👩🏼‍💻',
        subtasks: [
          'Register warranty',
          'Send documentation',
          'Submit insurance paperwork',
          'Send final receipt and close job'
        ]
      }
    ]
  }
];

const ProjectChecklistPage = ({ project, onUpdate, onPhaseCompletionChange }) => {
  const [openPhase, setOpenPhase] = useState(null);
  const [openItem, setOpenItem] = useState({});
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addItemFor, setAddItemFor] = useState(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  
  // Phase override handler
  const handlePhaseOverride = async (newPhase, reason) => {
    try {
      console.log(`🔄 PHASE OVERRIDE: Updating project phase to ${newPhase}`);
      
      // Refresh workflow data after override
      setTimeout(() => {
        const refreshWorkflowData = async () => {
          if (!project) return;
          
          try {
            const projectId = project._id || project.id;
            const response = await projectsService.getWorkflow(projectId);
            const newWorkflowData = {
              ...(response.data || response.workflow),
              _forceRender: Date.now(),
              _phaseOverride: true
            };
            setWorkflowData(newWorkflowData);
            console.log('✅ WORKFLOW: Refreshed data after phase override');
          } catch (error) {
            console.error('❌ WORKFLOW: Error refreshing after override:', error);
          }
        };
        
        refreshWorkflowData();
      }, 1000);
      
    } catch (error) {
      console.error('❌ PHASE OVERRIDE: Error handling phase override:', error);
    }
  };
  const [phases, setPhases] = useState(checklistPhases);
  const [highlightedStep, setHighlightedStep] = useState(null);
  const [navigationSuccess, setNavigationSuccess] = useState(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState(new Set());
  
  // Get phase colors from WorkflowProgressService to match dashboard
  const getPhaseColor = (phaseId) => {
    // Map phase IDs to the color service's expected format
    const phaseMap = {
      'LEAD': 'LEAD',
      'PROSPECT': 'PROSPECT', 
      'APPROVED': 'APPROVED',
      'EXECUTION': 'EXECUTION',
      'SECOND_SUPPLEMENT': 'SECOND_SUPPLEMENT',
      'COMPLETION': 'COMPLETION'
    };
    
    const mappedPhase = phaseMap[phaseId] || 'LEAD';
    return WorkflowProgressService.getPhaseColor(mappedPhase);
  };
  
  // Real-time updates for phase override
  const { updates } = useRealTimeUpdates(project?._id || project?.id);
  
  // Use the workflow update hook
  const { updateWorkflowStep: updateWorkflowStepAPI, updating: workflowUpdating } = useWorkflowUpdate();

  // Fetch workflow data from database
  useEffect(() => {
    const fetchWorkflowData = async () => {
      if (!project) return;
      
      try {
        // Use the correct project ID - prefer _id over id, and ensure it's a valid ObjectId
        const projectId = project._id || project.id;
        
        // If we have a simple numeric ID, we need to find the actual project in the database
        if (projectId && typeof projectId === 'number') {
          console.log('⚠️ WARNING: Using numeric project ID, this may not work with MongoDB');
          // For now, let's try to use a mock ObjectId based on the numeric ID
          const mockObjectId = `686b4df0fa7c227b285aba0${(projectId || '').toString().padStart(2, '0')}`;
          console.log(`🔄 CONVERTING: Numeric ID ${projectId} to mock ObjectId ${mockObjectId}`);
          
          const response = await projectsService.getWorkflow(mockObjectId);
          console.log(`🌐 FETCH: Received workflow data:`, response);
          setWorkflowData(response.data || response.workflow);
        } else {
          console.log(`🌐 FETCH: Fetching workflow data for project: ${projectId}`);
          
          // Use the actual API service instead of debugger functions
          const response = await projectsService.getWorkflow(projectId);
          
          console.log(`🌐 FETCH: Received workflow data:`, response);
          const newWorkflowData = response.data || response.workflow;
          
          // Preserve optimistic updates
          setWorkflowData(prevData => {
            if (!prevData || optimisticUpdates.size === 0) {
              return newWorkflowData;
            }
            
            // Merge new data while preserving optimistic updates
            const mergedSteps = [...(newWorkflowData.steps || [])];
            if (prevData.steps) {
              prevData.steps.forEach(prevStep => {
                const stepId = prevStep.id || prevStep.stepId || prevStep._id;
                if (optimisticUpdates.has(stepId)) {
                  const existingIndex = mergedSteps.findIndex(s => 
                    s.id === stepId || s.stepId === stepId || s._id === stepId
                  );
                  if (existingIndex >= 0) {
                    // Keep optimistic state
                    mergedSteps[existingIndex] = {
                      ...mergedSteps[existingIndex],
                      completed: prevStep.completed,
                      isCompleted: prevStep.isCompleted,
                      completedAt: prevStep.completedAt
                    };
                  }
                }
              });
            }
            
            return {
              ...newWorkflowData,
              steps: mergedSteps
            };
          });
        }
      } catch (error) {
        console.error('❌ FETCH: Error fetching workflow data:', error);
        
        // Don't show navigation errors to the user - just log them
        console.warn('Workflow data fetch failed, using default workflow structure');
        
        // Set default workflow data instead of showing errors
        setWorkflowData({
          project: project._id || project.id,
          steps: [],
          completedSteps: [],
          progress: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowData();
  }, [project]);

  // Refresh workflow data when coming from alert completion
  useEffect(() => {
    if (project?.completedStep) {
      console.log('🔄 WORKFLOW: Project has completedStep flag, refreshing data');
      console.log('🔄 WORKFLOW: Completed step:', project.highlightStep);
      
      // Immediate refresh
      const refreshWorkflowData = async () => {
        if (!project) return;
        
        try {
          const projectId = project._id || project.id;
          
          console.log(`🌐 REFRESH: Refreshing workflow data for project: ${projectId}`);
          
          const response = await projectsService.getWorkflow(projectId);
          
          console.log(`🌐 REFRESH: Received workflow data:`, response);
          
          // ENHANCED: Force a complete state refresh
          const newWorkflowData = {
            ...(response.data || response.workflow),
            _forceRender: Date.now(),
            _refreshedAt: new Date().toISOString()
          };
          
          setWorkflowData(newWorkflowData);
          console.log('✅ WORKFLOW: Refreshed data after alert completion');
          
          // Log the completed steps for debugging
          const completedSteps = (response.data || response.workflow)?.steps?.filter(s => s.isCompleted || s.completed) || [];
          console.log('✅ WORKFLOW: Currently completed steps:', completedSteps.map(s => s.stepName || s.name));
          
          // ENHANCED: Force component re-render by updating a dummy state
          setNavigationSuccess({
            message: 'Workflow updated from alert completion',
            details: {
              completedSteps: completedSteps.length,
              refreshedAt: new Date().toLocaleTimeString()
            }
          });
          
          // Clear the success message quickly
          setTimeout(() => {
            setNavigationSuccess(null);
          }, 100);
          
        } catch (error) {
          console.error('❌ WORKFLOW: Error refreshing after completion:', error);
          // Don't show error to user for background refresh
        }
      };
      
      // Refresh immediately
      refreshWorkflowData();
      
      // Also refresh after a delay to ensure backend processing is complete
      setTimeout(refreshWorkflowData, 1500);
      
      // ENHANCED: Additional refresh after 3 seconds to catch any delayed updates
      setTimeout(refreshWorkflowData, 3000);
    }
  }, [project?.completedStep, project?.highlightStep]);

  // ENHANCED: Force re-render when workflow data changes to ensure strikethroughs appear
  useEffect(() => {
    if (workflowData && workflowData._forceRender) {
      console.log('🔄 FORCE RENDER: Workflow data changed, forcing component re-render');
      const completedSteps = workflowData.steps?.filter(s => s.completed || s.isCompleted) || [];
      console.log('✅ FORCE RENDER: Completed steps count:', completedSteps.length);
      console.log('✅ FORCE RENDER: Step completion states:', 
        workflowData.steps?.map(s => ({
          id: s.id || s.stepId || s._id,
          completed: s.completed || s.isCompleted || false
        })) || []
      );
    }
  }, [workflowData?._forceRender, workflowData?.steps]);

  // ENHANCED: Listen for global workflow updates from alert completions
  useEffect(() => {
    const handleWorkflowStepCompleted = (event) => {
      const { projectId: eventProjectId, stepId: eventStepId, stepName } = event.detail || {};
      const currentProjectId = project?.id || project?._id;
      
      console.log('🔊 GLOBAL EVENT: Received workflow step completed event:', event.detail);
      
      // Only refresh if this event is for the current project
      if (eventProjectId && currentProjectId && String(eventProjectId) === String(currentProjectId)) {
        console.log('🔄 GLOBAL REFRESH: Event matches current project, refreshing workflow data');
        
        const refreshFromEvent = async () => {
          try {
            const response = await projectsService.getWorkflow(currentProjectId);
            const newWorkflowData = {
              ...(response.data || response.workflow),
              _forceRender: Date.now(),
              _globalEventRefresh: true,
              _eventStepId: eventStepId
            };
            
            setWorkflowData(newWorkflowData);
            console.log('✅ GLOBAL REFRESH: Updated workflow data from global event');
            
            // Show brief success message
            setNavigationSuccess({
              message: `Step completed: ${stepName || eventStepId}`,
              details: {
                source: 'Global Event',
                refreshedAt: new Date().toLocaleTimeString()
              }
            });
            
            setTimeout(() => setNavigationSuccess(null), 2000);
            
          } catch (error) {
            console.error('❌ GLOBAL REFRESH: Failed to refresh from global event:', error);
          }
        };
        
        // Refresh immediately and with delays
        refreshFromEvent();
        setTimeout(refreshFromEvent, 1000);
      }
    };
    
    // Listen for custom workflow completion events
    window.addEventListener('workflowStepCompleted', handleWorkflowStepCompleted);
    
    return () => {
      window.removeEventListener('workflowStepCompleted', handleWorkflowStepCompleted);
    };
  }, [project?.id, project?._id]);

  // ENHANCED: Direct line item navigation with phase/section/lineitem mapping
  useEffect(() => {
    if (project?.highlightStep || project?.highlightLineItem || project?.targetLineItem || project?.navigationTarget) {
      const navigationTarget = project?.navigationTarget;
      const stepToFind = project?.highlightStep || project?.highlightLineItem || navigationTarget?.lineItem || project?.targetLineItem;
      const targetPhase = navigationTarget?.phase || project?.targetPhase || project?.alertPhase;
      const targetSection = navigationTarget?.section || project?.targetSection || project?.alertSection;
      const targetLineItem = navigationTarget?.lineItem || project?.targetLineItem;
      
      console.log('🎯 WORKFLOW NAVIGATION: Starting enhanced navigation');
      console.log('🎯 Step to find:', stepToFind);
      console.log('🎯 Target phase:', targetPhase);
      console.log('🎯 Target section:', targetSection);
      console.log('🎯 Target line item:', targetLineItem);
      console.log('🎯 Navigation target:', navigationTarget);
      
      setHighlightedStep(stepToFind);
      
      // ENHANCED: Direct phase ID mapping instead of fuzzy matching
      const phaseIdMapping = {
        'LEAD': 'LEAD',
        'Lead': 'LEAD',
        'PROSPECT': 'PROSPECT', 
        'Prospect': 'PROSPECT',
        'PROSPECT_NON_INSURANCE': 'PROSPECT_NON_INSURANCE',
        'APPROVED': 'APPROVED',
        'Approved': 'APPROVED',
        'EXECUTION': 'EXECUTION',
        'Execution': 'EXECUTION',
        'SECOND_SUPPLEMENT': 'SECOND_SUPPLEMENT',
        '2ND_SUPP': 'SECOND_SUPPLEMENT',
        '2nd Supplement': 'SECOND_SUPPLEMENT',
        'COMPLETION': 'COMPLETION',
        'Completion': 'COMPLETION'
      };
      
      // Find target phase using direct mapping
      const mappedPhaseId = phaseIdMapping[targetPhase] || targetPhase;
      const targetPhaseObj = phases.find(phase => phase.id === mappedPhaseId);
      
      if (targetPhaseObj) {
        console.log('✅ DIRECT MAPPING: Found target phase:', targetPhaseObj.label);
        
        // ENHANCED: Direct section matching by multiple strategies
        let matchedItem = null;
        
        // Strategy 1: Direct ID matching (if available)
        if (navigationTarget?.sectionId) {
          matchedItem = targetPhaseObj.items.find(item => item.id === navigationTarget.sectionId);
        }
        
        // Strategy 2: Exact section name matching
        if (!matchedItem && targetSection) {
          matchedItem = targetPhaseObj.items.find(item => {
            const itemBaseName = item.label.split(' –')[0].trim();
            return itemBaseName === targetSection || item.label === targetSection;
          });
        }
        
        // Strategy 3: Contains matching (fallback)
        if (!matchedItem && targetSection) {
          matchedItem = targetPhaseObj.items.find(item => {
            const itemBaseName = item.label.split(' –')[0].trim().toLowerCase();
            const targetLower = targetSection.toLowerCase();
            return itemBaseName.includes(targetLower) || targetLower.includes(itemBaseName);
          });
        }
        
        // Strategy 4: Match by step name if no section match
        if (!matchedItem && stepToFind) {
          matchedItem = targetPhaseObj.items.find(item => {
            const itemBaseName = item.label.split(' –')[0].trim().toLowerCase();
            const stepLower = stepToFind.toLowerCase();
            return itemBaseName.includes(stepLower) || stepLower.includes(itemBaseName);
          });
        }
        
        if (matchedItem) {
          console.log('✅ DIRECT MAPPING: Found target section:', matchedItem.label);
          
          // CRITICAL: Always open the phase and item
          setOpenPhase(targetPhaseObj.id);
          setOpenItem({ [matchedItem.id]: true });
          
          // Execute navigation and highlighting
          const executeNavigation = () => {
            let attempts = 0;
            const maxAttempts = 20;
            
            const attemptNavigation = () => {
              attempts++;
              console.log(`📍 NAVIGATION ATTEMPT ${attempts}: Looking for elements`);
              
              // Find phase element
              const phaseElement = document.querySelector(`[data-phase-id="${targetPhaseObj.id}"]`);
              
              if (phaseElement) {
                console.log('✅ Found phase element, scrolling to phase');
                phaseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Wait for phase scroll, then find item
                setTimeout(() => {
                  const itemElement = document.querySelector(`[data-item-id="${matchedItem.id}"]`);
                  
                  if (itemElement) {
                    console.log('✅ Found item element, applying blue highlighting');
                    
                    // Scroll to center the item
                    itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // ENHANCED: Apply blue highlighting exactly as requested
                    itemElement.style.transition = 'all 0.4s ease';
                    itemElement.style.backgroundColor = '#3B82F6'; // Blue background
                    itemElement.style.color = 'white';
                    itemElement.style.borderRadius = '8px';
                    itemElement.style.padding = '8px';
                    itemElement.style.transform = 'scale(1.02)';
                    itemElement.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.8)';
                    itemElement.style.zIndex = '10';
                    itemElement.style.position = 'relative';
                    
                    console.log('🔥 BLUE HIGHLIGHT APPLIED to section:', matchedItem.label);
                    
                    // Remove highlighting after 5 seconds
                    setTimeout(() => {
                      itemElement.style.backgroundColor = '';
                      itemElement.style.color = '';
                      itemElement.style.borderRadius = '';
                      itemElement.style.padding = '';
                      itemElement.style.transform = '';
                      itemElement.style.boxShadow = '';
                      itemElement.style.zIndex = '';
                      itemElement.style.position = '';
                      console.log('🔄 Blue highlighting removed');
                    }, 5000);
                    
                    // ENHANCED: Instead of highlighting section, find and highlight specific subtask
                    if (targetLineItem) {
                      setTimeout(() => {
                        // Remove section highlighting and focus on subtask
                        itemElement.style.backgroundColor = '';
                        itemElement.style.color = '';
                        itemElement.style.borderRadius = '';
                        itemElement.style.padding = '';
                        itemElement.style.transform = '';
                        itemElement.style.boxShadow = '';
                        
                        // Find all subtask elements (checkboxes and text)
                        const subtaskElements = itemElement.querySelectorAll('li, span');
                        for (const subtaskEl of subtaskElements) {
                          const subtaskText = subtaskEl.textContent.toLowerCase();
                          const targetText = targetLineItem.toLowerCase();
                          
                          if (subtaskText.includes(targetText) || targetText.includes(subtaskText)) {
                            console.log('🎯 HIGHLIGHTING specific subtask:', subtaskEl.textContent);
                            
                            // Apply bright highlighting to the specific subtask
                            subtaskEl.style.backgroundColor = '#F59E0B'; // Orange/amber for visibility
                            subtaskEl.style.color = 'white';
                            subtaskEl.style.padding = '4px 8px';
                            subtaskEl.style.borderRadius = '6px';
                            subtaskEl.style.fontWeight = 'bold';
                            subtaskEl.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.6)';
                            subtaskEl.style.border = '2px solid #D97706';
                            
                            // Scroll specifically to this subtask
                            subtaskEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            setTimeout(() => {
                              subtaskEl.style.backgroundColor = '';
                              subtaskEl.style.color = '';
                              subtaskEl.style.padding = '';
                              subtaskEl.style.borderRadius = '';
                              subtaskEl.style.fontWeight = '';
                              subtaskEl.style.boxShadow = '';
                              subtaskEl.style.border = '';
                            }, 7000);
                            break;
                          }
                        }
                      }, 600);
                    }
                    
                  } else {
                    console.log(`⏳ Item element not found (attempt ${attempts}), retrying...`);
                    if (attempts < maxAttempts) {
                      setTimeout(attemptNavigation, 300);
                    } else {
                      console.log('❌ Failed to find item element after maximum attempts');
                    }
                  }
                }, 500);
                
              } else {
                console.log(`⏳ Phase element not found (attempt ${attempts}), retrying...`);
                if (attempts < maxAttempts) {
                  setTimeout(attemptNavigation, 300);
                } else {
                  console.log('❌ Failed to find phase element after maximum attempts');
                }
              }
            };
            
            // Start navigation after DOM settles
            setTimeout(attemptNavigation, 200);
          };
          
          // Execute the navigation
          executeNavigation();
          
          // Clear highlighting flag after navigation
          setTimeout(() => {
            setHighlightedStep(null);
          }, 10000);
          
        } else {
          console.log('❌ No matching section found in phase:', targetPhaseObj.label);
          console.log('❌ Available sections:', targetPhaseObj.items.map(i => i.label.split(' –')[0].trim()));
        }
        
      } else {
        console.log('❌ No matching phase found for:', targetPhase);
        console.log('❌ Available phases:', phases.map(p => ({ id: p.id, label: p.label })));
      }
    }
  }, [project?.highlightStep, project?.navigationTarget, project?.targetLineItem, phases]);

  // Enhanced real-time listening for workflow step completions
  useEffect(() => {
    const handleStepCompleted = (data) => {
      console.log('🔄 WORKFLOW: Received step completion notification:', data);
      
      // Check if this completion is for the current project
      const currentProjectId = project?.id || project?._id;
      if (data.workflowId && currentProjectId) {
        // Refresh workflow data to show the completion
        const refreshWorkflowData = async () => {
          try {
            const projectId = project.id || project._id;
            
            console.log(`🌐 REFRESH: Refreshing workflow data for project: ${projectId}`);
            
            const response = await projectsService.getWorkflow(projectId);
            
            console.log(`🌐 REFRESH: Received workflow data:`, response);
            setWorkflowData(response.data || response.workflow);
            console.log('✅ WORKFLOW: Refreshed workflow data after real-time step completion');
            
            // Force a re-render by updating a dummy state
            setHighlightedStep(prev => prev === null ? '' : null);
          } catch (error) {
            console.error('❌ WORKFLOW: Error refreshing workflow data:', error);
          }
        };
        
        refreshWorkflowData();
      }
    };

    // Listen for socket events (if socket is available)
    if (window.io && window.io.connected) {
      window.io.on('step_completed', handleStepCompleted);
      
      return () => {
        window.io.off('step_completed', handleStepCompleted);
      };
    }
    
    // Also listen for general workflow updates
    const handleWorkflowUpdate = () => {
      console.log('🔄 WORKFLOW: Received general workflow update');
      if (project) {
        const refreshWorkflowData = async () => {
          try {
            const projectId = project.id || project._id;
            
            console.log(`🌐 REFRESH: Refreshing workflow data for project: ${projectId}`);
            
            const response = await projectsService.getWorkflow(projectId);
            
            console.log(`🌐 REFRESH: Received workflow data:`, response);
            setWorkflowData(response.data || response.workflow);
            console.log('✅ WORKFLOW: Refreshed workflow data after general update');
          } catch (error) {
            console.error('❌ WORKFLOW: Error refreshing workflow data:', error);
          }
        };
        
        refreshWorkflowData();
      }
    };

    if (window.io && window.io.connected) {
      window.io.on('workflow_updated', handleWorkflowUpdate);
      
      return () => {
        window.io.off('workflow_updated', handleWorkflowUpdate);
      };
    }
  }, [project]);

  // Auto-refresh workflow data periodically when on this page
  // Disabled to prevent overwriting optimistic checkbox updates
  // useEffect(() => {
  //   if (!project) return;
  //   
  //   const refreshInterval = setInterval(async () => {
  //     try {
  //       const projectId = project._id || project.id;
  //       const response = await projectsService.getWorkflow(projectId);
  //       setWorkflowData(response.data || response.workflow);
  //     } catch (error) {
  //       console.error('❌ WORKFLOW: Auto-refresh failed:', error);
  //       // Don't show error to user for background refresh
  //     }
  //   }, 30000); // Refresh every 30 seconds
  //   
  //   return () => clearInterval(refreshInterval);
  // }, [project]);

  // Helper function to find the next workflow item
  const findNextWorkflowItem = (completedStepId) => {
    console.log(`🔍 NEXT_ITEM: Looking for next item after ${completedStepId}`);
    
    // Create a flat list of all workflow items in order
    const allWorkflowItems = [];
    
    phases.forEach(phase => {
      phase.items.forEach(item => {
        // Add main item
        const mainStepId = `${phase.id}-${item.id}`;
        allWorkflowItems.push({
          stepId: mainStepId,
          phase: phase.id,
          phaseLabel: phase.label,
          itemId: item.id,
          itemLabel: item.label,
          type: 'main'
        });
        
        // Add subtasks
        if (item.subtasks) {
          item.subtasks.forEach((subtask, subIdx) => {
            const subtaskStepId = `${phase.id}-${item.id}-${subIdx}`;
            allWorkflowItems.push({
              stepId: subtaskStepId,
              phase: phase.id,
              phaseLabel: phase.label,
              itemId: item.id,
              itemLabel: item.label,
              subtask: subtask,
              type: 'subtask'
            });
          });
        }
        
        // Add subheadings and their subtasks
        if (item.subheadings) {
          item.subheadings.forEach(subheading => {
            const subheadingStepId = `${phase.id}-${item.id}-${subheading.id}`;
            allWorkflowItems.push({
              stepId: subheadingStepId,
              phase: phase.id,
              phaseLabel: phase.label,
              itemId: item.id,
              itemLabel: item.label,
              subheading: subheading.label,
              type: 'subheading'
            });
            
            if (subheading.subtasks) {
              subheading.subtasks.forEach((subtask, subIdx) => {
                const subtaskStepId = `${phase.id}-${item.id}-${subheading.id}-${subIdx}`;
                allWorkflowItems.push({
                  stepId: subtaskStepId,
                  phase: phase.id,
                  phaseLabel: phase.label,
                  itemId: item.id,
                  itemLabel: item.label,
                  subheading: subheading.label,
                  subtask: subtask,
                  type: 'subheading_subtask'
                });
              });
            }
          });
        }
      });
    });
    
    console.log(`🔍 NEXT_ITEM: All workflow items:`, allWorkflowItems.map(item => item.stepId));
    
    // Find current item index
    const currentIndex = allWorkflowItems.findIndex(item => item.stepId === completedStepId);
    console.log(`🔍 NEXT_ITEM: Current item index: ${currentIndex}`);
    
    if (currentIndex === -1) {
      console.log(`❌ NEXT_ITEM: Could not find completed step ${completedStepId} in workflow`);
      return null;
    }
    
    // Get next item
    const nextIndex = currentIndex + 1;
    if (nextIndex >= allWorkflowItems.length) {
      console.log(`✅ NEXT_ITEM: Workflow completed! No more items.`);
      return null;
    }
    
    const nextItem = allWorkflowItems[nextIndex];
    console.log(`✅ NEXT_ITEM: Found next item:`, nextItem);
    
    return nextItem;
  };

  // Helper function to create alert for next workflow item
  const createNextWorkflowAlert = async (nextItem) => {
    if (!nextItem) return;
    
    console.log(`🔔 ALERT: Creating alert for next workflow item:`, nextItem);
    
    try {
      // Determine alert title and description based on item type
      let alertTitle = '';
      let alertDescription = '';
      
      if (nextItem.type === 'main') {
        alertTitle = nextItem.itemLabel;
        alertDescription = `Please complete the next workflow step: ${nextItem.itemLabel}`;
      } else if (nextItem.type === 'subtask') {
        alertTitle = `${nextItem.itemLabel} - ${nextItem.subtask}`;
        alertDescription = `Please complete: ${nextItem.subtask} in ${nextItem.itemLabel}`;
      } else if (nextItem.type === 'subheading') {
        alertTitle = `${nextItem.itemLabel} - ${nextItem.subheading}`;
        alertDescription = `Please complete: ${nextItem.subheading} in ${nextItem.itemLabel}`;
      } else if (nextItem.type === 'subheading_subtask') {
        alertTitle = `${nextItem.subheading} - ${nextItem.subtask}`;
        alertDescription = `Please complete: ${nextItem.subtask} in ${nextItem.subheading}`;
      }
      
      // Create alert data
      const alertData = {
        title: alertTitle,
        message: alertDescription,
        priority: 'medium',
        projectId: project._id || project.id,
        stepId: nextItem.stepId,
        metadata: {
          stepName: alertTitle,
          cleanTaskName: alertTitle,
          phase: nextItem.phase,
          phaseLabel: nextItem.phaseLabel,
          projectId: project._id || project.id,
          projectNumber: project.projectNumber || project.number || '12345',
          projectName: project.name || project.projectName || 'Unknown Project',
          workflowId: workflowData?._id || 'unknown',
          stepId: nextItem.stepId,
          autoGenerated: true,
          generatedAt: new Date().toISOString()
        },
        type: 'workflow_progression',
        status: 'pending'
      };
      
      console.log(`🔔 ALERT: Creating alert with data:`, alertData);
      
      // Create the alert
      const response = await workflowAlertsService.create(alertData);
      console.log(`✅ ALERT: Successfully created alert:`, response);
      
      return response;
    } catch (error) {
      console.error(`❌ ALERT: Error creating next workflow alert:`, error);
      // Don't throw error - we don't want to break workflow completion if alert creation fails
    }
  };

  // Helper function to update UI from database response
  const updateWorkflowUIFromDatabaseResponse = (updatedData) => {
    console.log('🔄 Updating UI from database response:', updatedData);
    
    // Transform database format to frontend format
    const transformedSteps = updatedData.lineItems?.map(item => ({
      id: item.id,
      stepId: `${item.sectionNumber}${item.itemLetter}`,
      stepName: item.itemName,
      name: item.itemName,
      phase: item.phase,
      section: item.section,
      lineItem: item.itemName,
      completed: item.isCompleted,
      isCompleted: item.isCompleted,
      isCurrent: item.isCurrent,
      completedAt: item.completedAt,
      completedBy: item.completedBy
    })) || [];
    
    // Update workflow data
    setWorkflowData({
      steps: transformedSteps,
      overallProgress: updatedData.overallProgress || 0,
      currentPosition: updatedData.currentPosition,
      phaseCompletion: updatedData.phaseCompletion || {},
      sectionCompletion: updatedData.sectionCompletion || {},
      _forceRender: Date.now(),
      _databaseUpdate: true
    });
    
    // Trigger phase completion callback if available
    if (onPhaseCompletionChange && updatedData.phaseCompletion) {
      const completedPhases = {};
      Object.keys(updatedData.phaseCompletion).forEach(phase => {
        completedPhases[phase] = updatedData.phaseCompletion[phase].isCompleted;
      });
      
      onPhaseCompletionChange({
        completedPhases,
        progress: updatedData.overallProgress || 0
      });
    }
  };

  const updateWorkflowStep = async (stepId, completed) => {
    console.log(`🔄 UPDATE: Updating workflow step ${stepId} to ${completed} using NEW DATABASE SYSTEM`);
    
    // Store original data for rollback
    const originalWorkflowData = workflowData;
    
    // Track this optimistic update
    setOptimisticUpdates(prev => new Set([...prev, stepId]));
    
    // CRITICAL: Immediate optimistic update for visual feedback
    setWorkflowData(prevData => {
      if (!prevData) {
        // Initialize workflow data with optimistic updates
        return {
          project: project._id || project.id,
          steps: [{
            id: stepId,
            stepId: stepId,
            _id: stepId,
            completed: completed,
            isCompleted: completed,
            createdAt: new Date().toISOString()
          }],
          completedSteps: completed ? [stepId] : [],
          progress: completed ? 100 : 0,
          updatedAt: new Date().toISOString(),
          _forceRender: Date.now(),
          _optimisticUpdates: { [stepId]: completed }
        };
      }
      
      // Create optimistic updates object to store immediate UI state
      const optimisticUpdates = {
        ...(prevData._optimisticUpdates || {}),
        [stepId]: completed
      };
      
      // Create completely new object to force re-render
      const updatedSteps = [...(prevData.steps || [])];
      let stepIndex = updatedSteps.findIndex(s => 
        s.id === stepId || 
        s.stepId === stepId || 
        s._id === stepId
      );
      
      if (stepIndex === -1) {
        // Create new step if it doesn't exist
        const newStep = {
          id: stepId,
          stepId: stepId,
          _id: stepId,
          completed: completed,
          isCompleted: completed,
          completedAt: completed ? new Date().toISOString() : null,
          createdAt: new Date().toISOString()
        };
        updatedSteps.push(newStep);
        console.log(`✅ OPTIMISTIC: Created new step ${stepId} with completed: ${completed}`);
      } else {
        // Update existing step
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          completed: completed,
          isCompleted: completed,
          completedAt: completed ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        };
        console.log(`✅ OPTIMISTIC: Updated existing step ${stepId} with completed: ${completed}`);
      }
      
      // Return completely new object with optimistic state
      return {
        ...prevData,
        steps: updatedSteps,
        updatedAt: new Date().toISOString(),
        _optimisticUpdate: Date.now(),
        _forceRender: Date.now(),
        _optimisticUpdates: optimisticUpdates
      };
    });

    const projectId = project._id || project.id;
    
    console.log(`🌐 CHECKBOX: Making API call to update workflow step`);
    console.log(`🌐 CHECKBOX: Request payload:`, { completed });
    
    try {
      // CRITICAL: Use NEW database-driven workflow system for completions
      if (completed) {
        try {
          console.log(`🚀 Using NEW completion handler for step ${stepId}`);
          const response = await workflowService.completeLineItem(projectId, stepId, '', null);
          console.log('✅ NEW SYSTEM: Line item completed successfully:', response);
          
          // Update UI from database response
          if (response.updatedData) {
            updateWorkflowUIFromDatabaseResponse(response.updatedData);
          }
          
          // Update project progress
          if (onUpdate && response.updatedData?.overallProgress !== undefined) {
            onUpdate({
              ...project,
              progress: response.updatedData.overallProgress,
              phase: response.updatedData.currentPosition?.phase
            });
          }
          
          return; // Skip old system processing
        } catch (newSystemError) {
          console.warn('⚠️ NEW SYSTEM: Failed, falling back to old system:', newSystemError);
          // Continue to old system fallback below
        }
      }
      
      // Fallback to old system for unchecking (temporary)
      const response = await updateWorkflowStepAPI(projectId, stepId, completed);
      
      console.log('✅ CHECKBOX: API call successful, server confirmed the update');
      console.log('✅ CHECKBOX: Server response:', response);
      console.log(`✅ CHECKBOX: New project phase: ${response.phase}, Progress: ${response.progress}%`);
      
      // Update the project with new phase and progress if onUpdate is available
      if (onUpdate && response.project) {
        onUpdate({
          ...project,
          phase: response.phase,
          progress: response.progress
        });
      }
      
      // Clear optimistic update tracking
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
      
      // DON'T overwrite the optimistic update - it's already correct
      // Just ensure the server state matches our optimistic update
      if (response?.data?.step) {
        setWorkflowData(prevData => {
          const updatedSteps = [...(prevData.steps || [])];
          let stepIndex = updatedSteps.findIndex(s => 
            s.id === stepId || 
            s.stepId === stepId || 
            s._id === stepId
          );
          
          if (stepIndex >= 0) {
            // Merge server response with optimistic update
            updatedSteps[stepIndex] = {
              ...updatedSteps[stepIndex],
              ...response.data.step,
              completed: completed, // Keep our optimistic state
              isCompleted: completed // Keep our optimistic state
            };
          }
          
          return {
            ...prevData,
            steps: updatedSteps,
            _serverConfirmed: Date.now()
          };
        });
      }
      
      // CRITICAL: Emit global event for other components to refresh
      window.dispatchEvent(new CustomEvent('workflowStepCompleted', {
        detail: {
          projectId: projectId,
          stepId: stepId,
          stepName: response?.data?.step?.stepName || stepId,
          completed: completed
        }
      }));
      
      // Enhanced logging for successful completion
      console.log('🎉 WORKFLOW COMPLETION SUCCESS:');
      console.log(`   ✅ Step: ${stepId}`);
      console.log(`   ✅ Project: ${projectId}`);
      console.log(`   ✅ Completed: ${completed}`);
      console.log(`   ✅ New Phase: ${response.phase}`);
      console.log(`   ✅ New Progress: ${response.progress}%`);
      console.log(`   ✅ Server Response:`, response);
      
      // Handle automatic section and phase completion
      handleAutomaticCompletion(stepId, completed);
      
      // Generate alert for next workflow item when step is completed
      if (completed) {
        console.log(`🔔 ALERT: Step ${stepId} completed, checking for next workflow item`);
        const nextItem = findNextWorkflowItem(stepId);
        if (nextItem) {
          console.log(`🔔 ALERT: Found next item, creating alert:`, nextItem);
          // Create alert asynchronously - don't wait for it to complete
          createNextWorkflowAlert(nextItem).catch(error => {
            console.error(`❌ ALERT: Failed to create next workflow alert:`, error);
          });
        } else {
          console.log(`🎉 WORKFLOW: No more items - project workflow completed!`);
        }
      }
      
      // Don't automatically refresh - preserve optimistic updates
      // Only refresh if there's an error or explicit user action
      
    } catch (error) {
      console.error('❌ CHECKBOX: Failed to update workflow step:', error);
      
      // Clear optimistic update tracking
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
      
      // Revert optimistic update only on error
      setWorkflowData(originalWorkflowData);
      
      // Show user-friendly error
      console.warn('Failed to save checkbox state. Please try again.');
    }
  };

  const handlePhaseClick = (phaseId) => {
    setOpenPhase(openPhase === phaseId ? null : phaseId);
    setOpenItem({});
  };

  const handleItemClick = (itemId) => {
    setOpenItem((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleCheck = (phaseId, itemId, subIdx) => {
    // Prevent rapid double-clicks
    if (workflowUpdating) {
      console.log('⏳ CHECKBOX: Update in progress, ignoring click');
      return;
    }
    
    const stepId = `${phaseId}-${itemId}-${subIdx}`;
    const currentlyCompleted = isStepCompleted(stepId);
    const newCompletedState = !currentlyCompleted;
    
    console.log(`🔄 CHECKBOX: User clicked checkbox for ${stepId}, changing from ${currentlyCompleted} to ${newCompletedState}`);
    console.log(`🔄 CHECKBOX: Current workflow data:`, workflowData);
    console.log(`🔄 CHECKBOX: Project:`, project);
    
    // Validate inputs
    if (!phaseId || !itemId || subIdx === undefined) {
      console.error('❌ CHECKBOX: Invalid parameters for checkbox update:', { phaseId, itemId, subIdx });
      return;
    }
    
    // Check if we have a valid project
    if (!project || (!project.id && !project._id)) {
      console.error('❌ CHECKBOX: No valid project available for checkbox update');
      return;
    }
    
    // Update the workflow step
    updateWorkflowStep(stepId, newCompletedState).catch(error => {
      console.error('❌ CHECKBOX: Unhandled error in updateWorkflowStep:', error);
      // Don't let the error propagate and cause navigation issues
    });
  };

  // Helper function to check if a step is completed
  const isStepCompleted = (stepId) => {
    console.log(`🔍 CHECKING: isStepCompleted for "${stepId}"`);
    
    if (!workflowData || !workflowData.steps) {
      console.log(`🔍 CHECKING: No workflow data or steps, returning false`);
      return false;
    }
    
    // First try direct ID matching (for optimistic updates)
    const directMatch = workflowData.steps.find(s => 
      s.id === stepId || 
      s.stepId === stepId || 
      s._id === stepId ||
      s.stepName === stepId
    );
    
    if (directMatch) {
      console.log(`🔍 CHECKING: Found direct match:`, directMatch);
      const result = directMatch.completed || directMatch.isCompleted;
      console.log(`🔍 CHECKING: Direct match result: ${result}`);
      
      if (result) {
        console.log(`✅ STRIKETHROUGH: Step ${stepId} should show strikethrough`);
      }
      
      return result;
    }
    
    // For frontend-generated stepIds (format: "PHASE-item-id-subIndex"), 
    // we need to create a mapping since the database uses different IDs
    console.log(`🔍 CHECKING: Trying frontend stepId mapping for "${stepId}"`);
    
    // Keep a simple in-memory completion state for frontend stepIds
    // This provides immediate visual feedback while backend processes
    if (workflowData._optimisticUpdates && workflowData._optimisticUpdates[stepId] !== undefined) {
      const optimisticResult = workflowData._optimisticUpdates[stepId];
      console.log(`✅ OPTIMISTIC: Found optimistic update for ${stepId}: ${optimisticResult}`);
      return optimisticResult;
    }
    
    console.log(`🔍 CHECKING: No match found for "${stepId}"`);
    
    // ENHANCED: Log all available step IDs for debugging (limited to prevent spam)
    if (process.env.NODE_ENV === 'development') {
      const availableSteps = workflowData.steps.slice(0, 5).map(s => ({
        id: s.id || 'no-id',
        stepId: s.stepId || 'no-stepId',
        stepName: s.stepName || 'no-stepName',
        completed: s.completed || s.isCompleted || false
      }));
      console.log(`🔍 CHECKING: Sample available steps:`, availableSteps);
    }
    
    return false;
  };

  // Helper function to check if all subtasks in a section are completed
  const isSectionCompleted = (phaseId, itemId) => {
    const checklistPhase = phases.find(p => p.id === phaseId);
    if (!checklistPhase) return false;
    
    const checklistItem = checklistPhase.items.find(i => i.id === itemId);
    if (!checklistItem) return false;
    
    // Check regular subtasks
    const regularSubtasksCompleted = !checklistItem.subtasks || checklistItem.subtasks.length === 0 || 
      checklistItem.subtasks.every((_, subIdx) => {
        const stepId = `${phaseId}-${itemId}-${subIdx}`;
        return isStepCompleted(stepId);
      });
    
    // Check subheading subtasks
    const subheadingSubtasksCompleted = !checklistItem.subheadings || checklistItem.subheadings.length === 0 || 
      checklistItem.subheadings.every(subheading =>
        subheading.subtasks.every((_, subIdx) => {
          const stepId = `${phaseId}-${itemId}-${subheading.id}-${subIdx}`;
          return isStepCompleted(stepId);
        })
      );
    
    return regularSubtasksCompleted && subheadingSubtasksCompleted;
  };

  // Helper function to check if all sections in a phase are completed
  const isPhaseCompleted = (phaseId) => {
    const checklistPhase = phases.find(p => p.id === phaseId);
    if (!checklistPhase) return false;
    
    return checklistPhase.items.every(item => isSectionCompleted(phaseId, item.id));
  };

  // Function to handle automatic section and phase completion
  const handleAutomaticCompletion = (stepId, completed) => {
    if (!completed) return; // Only handle completion, not uncompletion
    
    // Parse the stepId to get phase and item info
    const stepIdParts = stepId.split('-');
    if (stepIdParts.length < 4) return;
    
    const phaseId = stepIdParts[0];
    const itemId = stepIdParts.slice(1, -1).join('-');
    
    console.log(`🎯 COMPLETION: Checking automatic completion for phase: ${phaseId}, item: ${itemId}`);
    
    // Check if section is now completed
    if (isSectionCompleted(phaseId, itemId)) {
      console.log(`✅ COMPLETION: Section "${itemId}" in phase "${phaseId}" is now completed!`);
      
      // Show section completion feedback
      setNavigationSuccess({
        message: `Section "${itemId}" completed!`,
        details: {
          phase: phases.find(p => p.id === phaseId)?.label || phaseId,
          section: itemId,
          lineItem: 'All subtasks completed'
        }
      });
      
      // Clear success message after 4 seconds
      setTimeout(() => {
        setNavigationSuccess(null);
      }, 4000);
    }
    
    // Check if phase is now completed
    if (isPhaseCompleted(phaseId)) {
      console.log(`🎉 COMPLETION: Phase "${phaseId}" is now completed!`);
      

    }
  };

  const handleDragEnd = (result, phaseId) => {
    if (!result.destination) return;
    const phaseIdx = phases.findIndex(p => p.id === phaseId);
    if (phaseIdx === -1) return;
    const items = Array.from(phases[phaseIdx].items);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    const newPhases = [...phases];
    newPhases[phaseIdx] = { ...newPhases[phaseIdx], items };
    setPhases(newPhases);
    // TODO: Update phase order in database
  };

  useEffect(() => {
    // Calculate phase completion and progress using database data
    if (!workflowData) return;
    
    const completedPhases = {};
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    phases.forEach(phase => {
      let phaseTotal = 0;
      let phaseCompleted = 0;
      phase.items.forEach(item => {
        // Count regular subtasks
        if (item.subtasks) {
          phaseTotal += item.subtasks.length;
          item.subtasks.forEach((_, subIdx) => {
            const stepId = `${phase.id}-${item.id}-${subIdx}`;
            if (isStepCompleted(stepId)) phaseCompleted++;
          });
        }
        
        // Count subheading subtasks
        if (item.subheadings) {
          item.subheadings.forEach(subheading => {
            phaseTotal += subheading.subtasks.length;
            subheading.subtasks.forEach((_, subIdx) => {
              const stepId = `${phase.id}-${item.id}-${subheading.id}-${subIdx}`;
              if (isStepCompleted(stepId)) phaseCompleted++;
            });
          });
        }
      });
      totalSubtasks += phaseTotal;
      completedSubtasks += phaseCompleted;
      completedPhases[phase.id] = phaseTotal > 0 && phaseTotal === phaseCompleted;
    });
    const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    if (onPhaseCompletionChange) {
      onPhaseCompletionChange({ completedPhases, progress });
    }
  }, [workflowData, onPhaseCompletionChange, phases]);

  // Listen for real-time phase override updates
  useEffect(() => {
    const phaseOverrideUpdate = updates.find(update => update.type === 'phase_override');
    
    if (phaseOverrideUpdate && project) {
      console.log('🔄 REAL-TIME: Received phase override update:', phaseOverrideUpdate);
      
      // Refresh workflow data
      const refreshWorkflowData = async () => {
        try {
          const projectId = project._id || project.id;
          const response = await projectsService.getWorkflow(projectId);
          const newWorkflowData = {
            ...(response.data || response.workflow),
            _forceRender: Date.now(),
            _phaseOverrideUpdate: true
          };
          setWorkflowData(newWorkflowData);
          console.log('✅ REAL-TIME: Refreshed workflow data after phase override');
        } catch (error) {
          console.error('❌ REAL-TIME: Error refreshing workflow after phase override:', error);
        }
      };
      
      refreshWorkflowData();
    }
  }, [updates, project]);

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="text-left">
            <h1 className="text-sm font-semibold text-gray-800 mb-1">Project Workflow</h1>
            <p className="text-xs text-gray-600">Loading workflow data...</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-xs text-gray-600">Loading workflow...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Compact Header */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="text-left">
            <h1 className="text-sm font-semibold text-gray-800 mb-1">Project Workflow</h1>
            <p className="text-xs text-gray-600">Actionable roadmap for every project phase</p>
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => {
                  console.log('🧪 DEBUG: Current workflow data:', workflowData);
                  console.log('🧪 DEBUG: Current project:', project);
                  console.log('🧪 DEBUG: API base URL:', window.location.hostname.includes('localhost') ? 'http://localhost:5000/api' : `${window.location.protocol}//${window.location.host}/api`);
                }}
                className="mt-1 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Debug Info
              </button>
            )}
          </div>
          
          {/* Override Phase Button */}
          <PhaseOverrideButton project={project} onPhaseUpdate={handlePhaseOverride} />
        </div>
      </div>
      
      {/* Current Workflow Status Indicator */}
      {(() => {
        // Find current phase, section, and line item
        let currentPhase = null;
        let currentSection = null;
        let currentLineItem = null;
        let nextIncompleteTask = null;

        for (const phase of phases) {
          let phaseHasIncomplete = false;
          
          for (const item of phase.items) {
            let sectionHasIncomplete = false;
            
            // Check subtasks for incomplete items
            if (item.subtasks) {
              for (let subIdx = 0; subIdx < item.subtasks.length; subIdx++) {
                const stepId = `${phase.id}-${item.id}-${subIdx}`;
                const isCompleted = isStepCompleted(stepId);
                
                if (!isCompleted) {
                  if (!nextIncompleteTask) {
                    nextIncompleteTask = {
                      phase: phase.label,
                      section: item.label.split(' – ')[0], // Section = numbered items (1,2,3)
                      lineItem: item.subtasks[subIdx], // Line Item = lettered items (a,b,c)
                      phaseColor: WorkflowProgressService.getPhaseColor(phase.id)
                    };
                  }
                  sectionHasIncomplete = true;
                  phaseHasIncomplete = true;
                }
              }
            }
            
            // If section has incomplete, mark it as current
            if (sectionHasIncomplete && !currentSection) {
              currentPhase = phase.label;
              currentSection = item.label.split(' – ')[0];
            }
          }
          
          // If phase has incomplete, mark it as current
          if (phaseHasIncomplete && !currentPhase) {
            currentPhase = phase.label;
          }
        }

        return nextIncompleteTask ? (
          <div className="mx-3 mb-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Phase Indicator */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 ${nextIncompleteTask.phaseColor.bg} rounded-full shadow-sm`}></div>
                  <div className="text-xs font-semibold text-gray-700">
                    Current Phase: <span className={`${nextIncompleteTask.phaseColor.text} font-bold`}>{nextIncompleteTask.phase}</span>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="w-px h-6 bg-gray-300"></div>
                
                {/* Section Indicator */}
                <div className="text-xs font-medium text-gray-600">
                  Section: <span className="font-semibold text-gray-800">{nextIncompleteTask.section}</span>
                </div>
              </div>
              
              {/* Current Line Item Indicator */}
              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-blue-200 shadow-sm">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <div className="text-xs font-medium text-gray-700">
                  Line Item: <span className="font-semibold text-blue-700">{nextIncompleteTask.lineItem}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-3 mb-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="text-xs font-semibold text-green-700">All workflow tasks completed!</div>
            </div>
          </div>
        );
      })()}

      <div className="flex-1 overflow-y-auto px-3 py-2 text-left" key={`workflow-${workflowData?._forceRender || 0}`}>
        <div className="space-y-2 text-left">
          {phases.map((phase) => {
            // Determine if all tasks in this phase are completed
            const allTasksCompleted = phase.items.every(item => {
              // Check regular subtasks
              const regularSubtasksCompleted = !item.subtasks || item.subtasks.length === 0 || item.subtasks.every((_, subIdx) => {
                const stepId = `${phase.id}-${item.id}-${subIdx}`;
                const completed = isStepCompleted(stepId);
                console.log(`🔍 PHASE COMPLETION: Step ${stepId} completed: ${completed}`);
                return completed;
              });
              
              // Check subheading subtasks
              const subheadingSubtasksCompleted = !item.subheadings || item.subheadings.length === 0 || item.subheadings.every(subheading =>
                subheading.subtasks.every((_, subIdx) => {
                  const stepId = `${phase.id}-${item.id}-${subheading.id}-${subIdx}`;
                  const completed = isStepCompleted(stepId);
                  console.log(`🔍 PHASE COMPLETION: Subheading step ${stepId} completed: ${completed}`);
                  return completed;
                })
              );
              
              const itemCompleted = regularSubtasksCompleted && subheadingSubtasksCompleted;
              console.log(`🔍 PHASE COMPLETION: Item ${item.id} completed: ${itemCompleted}`);
              return itemCompleted;
            });
            console.log(`🔍 PHASE COMPLETION: Phase ${phase.id} all tasks completed: ${allTasksCompleted}`);
            return (
              <div key={`${phase.id}-${workflowData?._forceRender || 0}`} data-phase-id={phase.id} className="p-2 rounded border shadow-sm text-left bg-white">
                <div
                  className="flex justify-between items-start cursor-pointer select-none text-left"
                  onClick={() => handlePhaseClick(phase.id)}
                >
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${getPhaseColor(phase.id).bg}`}></div>
                    <h3 className={`text-xs font-semibold text-left transition-all duration-200 ${allTasksCompleted ? 'line-through text-green-700' : 'text-gray-800'}`}>
                      {phase.label} {allTasksCompleted && <span title="Phase Complete" className="ml-1">🎉</span>}
                    </h3>
                  </div>
                </div>
                {openPhase === phase.id && (
                  <DragDropContext onDragEnd={result => handleDragEnd(result, phase.id)}>
                    <Droppable droppableId={phase.id}>
                      {(provided) => (
                        <div className="mt-2 space-y-1 text-left" ref={provided.innerRef} {...provided.droppableProps}>
                          {phase.items.map((item, idx) => {
                            const allMicrotasksChecked = (() => {
                              // Check regular subtasks
                              const regularSubtasksCompleted = !item.subtasks || item.subtasks.length === 0 || item.subtasks.every((_, subIdx) => {
                                const stepId = `${phase.id}-${item.id}-${subIdx}`;
                                const completed = isStepCompleted(stepId);
                                console.log(`🔍 SECTION COMPLETION: Step ${stepId} completed: ${completed}`);
                                return completed;
                              });
                              
                              // Check subheading subtasks
                              const subheadingSubtasksCompleted = !item.subheadings || item.subheadings.length === 0 || item.subheadings.every(subheading =>
                                subheading.subtasks.every((_, subIdx) => {
                                  const stepId = `${phase.id}-${item.id}-${subheading.id}-${subIdx}`;
                                  const completed = isStepCompleted(stepId);
                                  console.log(`🔍 SECTION COMPLETION: Subheading step ${stepId} completed: ${completed}`);
                                  return completed;
                                })
                              );
                              
                              const sectionCompleted = regularSubtasksCompleted && subheadingSubtasksCompleted;
                              console.log(`🔍 SECTION COMPLETION: Section ${item.id} all microtasks checked: ${sectionCompleted}`);
                              return sectionCompleted;
                            })();
                            return (
                              <Draggable key={item.id} draggableId={item.id} index={idx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    data-item-id={item.id}
                                    className={`hover:bg-gray-50 rounded transition-colors ${snapshot.isDragging ? 'bg-blue-50' : ''}`}
                                  >
                                    <div className="flex items-start cursor-pointer group text-left" {...provided.dragHandleProps}>
                                      <span 
                                        className={`flex-1 text-[10px] font-medium group-hover:text-blue-700 transition-all duration-300 text-left ${
                                          allMicrotasksChecked ? 'line-through text-green-600' : 
                                          (highlightedStep && (
                                            item.label.toLowerCase().includes(highlightedStep.toLowerCase()) ||
                                            highlightedStep.toLowerCase().includes(item.label.split(' –')[0].toLowerCase().trim())
                                          )) ? 'bg-blue-50 text-blue-800 font-semibold px-2 py-1 rounded border border-blue-200 shadow-sm' :
                                          'text-gray-700'
                                        }`}
                                        onClick={() => handleItemClick(item.id)}
                                      >
                                        {item.label}
                                      </span>
                                      <button
                                        className="ml-1 text-primary-600 hover:text-primary-800 p-0.5 focus:outline-none"
                                        title="Add item after this"
                                        onClick={e => { e.stopPropagation(); setAddItemFor(item.id); setNewItemLabel(''); }}
                                      >
                                        <PlusCircleIcon className="w-3 h-3" />
                                      </button>
                                      <button
                                        className="ml-0.5 text-gray-500 hover:text-gray-700 p-0.5 focus:outline-none transition-colors"
                                        onClick={(e) => { e.stopPropagation(); handleItemClick(item.id); }}
                                        title="Expand/Collapse"
                                      >
                                      <ChevronDownIcon
                                          className={`w-3 h-3 transform transition-transform ${openItem[item.id] ? 'rotate-180' : ''}`}
                                      />
                                      </button>
                                    </div>
                                    {addItemFor === item.id && (
                                      <div className="flex items-center gap-2 mt-1 ml-6">
                                        <input
                                          type="text"
                                          className="border rounded px-2 py-1 flex-1"
                                          placeholder="New item label"
                                          value={newItemLabel}
                                          onChange={e => setNewItemLabel(e.target.value)}
                                          autoFocus
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                              if (newItemLabel.trim()) {
                                                const phaseIdx = phases.findIndex(p => p.id === openPhase);
                                                if (phaseIdx !== -1) {
                                                  phase.items.splice(idx + 1, 0, {
                                                    id: `custom-${Date.now()}`,
                                                    label: newItemLabel,
                                                    subtasks: []
                                                  });
                                                }
                                                setNewItemLabel('');
                                                setAddItemFor(null);
                                              }
                                            } else if (e.key === 'Escape') {
                                              setAddItemFor(null);
                                              setNewItemLabel('');
                                            }
                                          }}
                                        />
                                        <button
                                          className="bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700"
                                          onClick={() => {
                                            if (newItemLabel.trim()) {
                                              const phaseIdx = phases.findIndex(p => p.id === openPhase);
                                              if (phaseIdx !== -1) {
                                                phase.items.splice(idx + 1, 0, {
                                                  id: `custom-${Date.now()}`,
                                                  label: newItemLabel,
                                                  subtasks: []
                                                });
                                              }
                                              setNewItemLabel('');
                                              setAddItemFor(null);
                                            }
                                          }}
                                        >Add</button>
                                        <button className="text-gray-500 px-2 py-1" onClick={() => { setAddItemFor(null); setNewItemLabel(''); }}>Cancel</button>
                                      </div>
                                    )}
                                    {openItem[item.id] && (
                                      <div className="ml-2 mt-1 space-y-1 text-[9px] text-left">
                                        {/* Regular subtasks */}
                                        {item.subtasks && item.subtasks.length > 0 && (
                                          <ul className="space-y-0.5 list-disc text-gray-600">
                                            {item.subtasks.map((sub, subIdx) => {
                                              const stepId = `${phase.id}-${item.id}-${subIdx}`;
                                              const completed = isStepCompleted(stepId);
                                              return (
                                                <li key={`${subIdx}-${stepId}-${completed}-${workflowData?._forceRender || 0}-${workflowData?._optimisticUpdate || 0}`} className="flex items-center gap-1 text-left font-normal">
                                                  <div className="relative inline-flex items-center">
                                                    <input
                                                      type="checkbox"
                                                      className="h-3 w-3 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 checked:bg-blue-600 checked:border-blue-600"
                                                      checked={completed}
                                                      onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleCheck(phase.id, item.id, subIdx);
                                                      }}
                                                      onClick={(e) => e.stopPropagation()}
                                                    />
                                                    {completed && (
                                                      <svg 
                                                        className="absolute inset-0 w-3 h-3 text-white pointer-events-none" 
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
                                                  <span className={`ml-1 transition-all duration-200 ${completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{sub}</span>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        )}
                                        
                                        {/* Subheadings with their subtasks */}
                                        {item.subheadings && item.subheadings.map((subheading, subHeadingIdx) => (
                                          <div key={subheading.id} className="mt-2">
                                            <div className="font-semibold text-blue-700 text-[9px] mb-1">
                                              * {subheading.label}
                                            </div>
                                            <ul className="ml-3 space-y-0.5 list-disc text-gray-600">
                                              {subheading.subtasks.map((sub, subIdx) => {
                                                const stepId = `${phase.id}-${item.id}-${subheading.id}-${subIdx}`;
                                                const completed = isStepCompleted(stepId);
                                                return (
                                                  <li key={`${subIdx}-${stepId}-${completed}-${workflowData?._forceRender || 0}-${workflowData?._optimisticUpdate || 0}`} className="flex items-center gap-1 text-left font-normal">
                                                    <div className="relative inline-flex items-center">
                                                      <input
                                                        type="checkbox"
                                                        className="h-3 w-3 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 checked:bg-blue-600 checked:border-blue-600"
                                                        checked={completed}
                                                        onChange={(e) => {
                                                          e.stopPropagation();
                                                          const stepId = `${phase.id}-${item.id}-${subheading.id}-${subIdx}`;
                                                          const currentlyCompleted = isStepCompleted(stepId);
                                                          const newCompletedState = !currentlyCompleted;
                                                          console.log(`🔄 CHECKBOX SUBHEADING: User clicked checkbox for ${stepId}, changing from ${currentlyCompleted} to ${newCompletedState}`);
                                                          updateWorkflowStep(stepId, newCompletedState);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                      />
                                                      {completed && (
                                                        <svg 
                                                          className="absolute inset-0 w-3 h-3 text-white pointer-events-none" 
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
                                                    <span className={`ml-1 transition-all duration-200 ${completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{sub}</span>
                                                  </li>
                                                );
                                              })}
                                            </ul>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProjectChecklistPage;