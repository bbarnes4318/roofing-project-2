import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { projectsService, workflowAlertsService } from '../../services/api';
import { ChevronDownIcon, PlusCircleIcon } from '../common/Icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useWorkflowUpdate } from '../../hooks/useWorkflowUpdate';


const checklistPhases = [
  {
    id: 'LEAD',
    label: '🟨 Lead Phase',
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
    label: '🟧 Prospect Phase',
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
    id: 'PROSPECT_NON_INSURANCE',
    label: '🟪 Prospect: Non-Insurance Phase',
    items: [
      {
        id: 'write-estimate-non-insurance',
        label: 'Write Estimate – Project Manager 👷🏼',
        subtasks: [
          'Fill out Estimate Forms',
          'Write initial estimate in AL and send customer for approval',
          'Follow up with customer for approval',
          'Let Office know the agreement is ready to sign'
        ]
      },
      {
        id: 'agreement-signing-non-insurance',
        label: 'Agreement Signing – Administration 📝',
        subtasks: [
          'Review agreement with customer and send a signature request',
          'Record in QuickBooks',
          'Process deposit',
          'Send and collect signatures for any applicable disclaimers'
        ]
      }
    ]
  },
  {
    id: 'APPROVED',
    label: '🟩 Approved Phase',
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
    label: '🔧 Execution Phase',
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
    id: 'SUPPLEMENT',
    label: '🌀 2nd Supplement Phase',
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
    label: '🏁 Completion Phase',
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
  const [phases, setPhases] = useState(checklistPhases);
  const [highlightedStep, setHighlightedStep] = useState(null);
  const [navigationSuccess, setNavigationSuccess] = useState(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState(new Set());
  
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
          setWorkflowData(response.data || response.workflow);
          console.log('✅ WORKFLOW: Refreshed data after alert completion');
          
          // Log the completed steps for debugging
          const completedSteps = (response.data || response.workflow)?.steps?.filter(s => s.isCompleted || s.completed) || [];
          console.log('✅ WORKFLOW: Currently completed steps:', completedSteps.map(s => s.stepName || s.name));
        } catch (error) {
          console.error('❌ WORKFLOW: Error refreshing after completion:', error);
          // Don't show error to user for background refresh
        }
      };
      
      // Refresh immediately
      refreshWorkflowData();
      
      // Also refresh after a delay to ensure backend processing is complete
      setTimeout(refreshWorkflowData, 1500);
    }
  }, [project?.completedStep, project?.highlightStep]);

  // Enhanced step highlighting from alert navigation with precise targeting
  useEffect(() => {
    if (project?.highlightStep || project?.navigationTarget) {
      const navigationTarget = project?.navigationTarget;
      const stepToFind = project?.highlightStep || navigationTarget?.lineItem;
      const targetPhase = navigationTarget?.phase || project?.alertPhase;
      const targetSection = navigationTarget?.section || project?.alertSection;
      const targetLineItem = navigationTarget?.lineItem;
      
      console.log('🎯 WORKFLOW: Enhanced navigation targeting:');
      console.log('🎯 WORKFLOW: Step to find:', stepToFind);
      console.log('🎯 WORKFLOW: Target phase:', targetPhase);
      console.log('🎯 WORKFLOW: Target section:', targetSection);
      console.log('🎯 WORKFLOW: Target line item:', targetLineItem);
      console.log('🎯 WORKFLOW: Navigation target:', navigationTarget);
      
      setHighlightedStep(stepToFind);
      
      // Enhanced matching system with precise targeting
      const normalizeStepName = (name) => {
        return name
          ? name.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
          : '';
      };
      
      const normalizedStepToFind = normalizeStepName(stepToFind);
      const normalizedTargetPhase = normalizeStepName(targetPhase);
      const normalizedTargetSection = normalizeStepName(targetSection);
      const normalizedTargetLineItem = normalizeStepName(targetLineItem);
      
      console.log('🔍 WORKFLOW: Normalized search terms:');
      console.log('🔍 WORKFLOW: Step:', normalizedStepToFind);
      console.log('🔍 WORKFLOW: Phase:', normalizedTargetPhase);
      console.log('🔍 WORKFLOW: Section:', normalizedTargetSection);
      console.log('🔍 WORKFLOW: Line item:', normalizedTargetLineItem);
      
      let foundMatch = false;
      let matchedPhase = null;
      let matchedItem = null;
      let matchedSubtask = null;
      let matchedSubheading = null;
      
      // First, try to find the exact phase
      const targetPhaseObj = phases.find(phase => {
        const phaseName = normalizeStepName(phase.label.split(' ').slice(1).join(' ')); // Remove emoji
        return phaseName.includes(normalizedTargetPhase) || normalizedTargetPhase.includes(phaseName);
      });
      
      if (targetPhaseObj) {
        console.log('✅ WORKFLOW: Found target phase:', targetPhaseObj.label);
        
        // Look for the specific section within the phase
        for (const item of targetPhaseObj.items) {
          const itemNameBase = item.label.split(' –')[0].trim();
          const normalizedItemName = normalizeStepName(itemNameBase);
          
          // Check if this item matches the target section
          const sectionMatch = normalizedItemName.includes(normalizedTargetSection) || 
                             normalizedTargetSection.includes(normalizedItemName) ||
                             normalizedStepToFind.includes(normalizedItemName) ||
                             normalizedItemName.includes(normalizedStepToFind);
          
          if (sectionMatch) {
            console.log('✅ WORKFLOW: Found matching section:', item.label);
            matchedPhase = targetPhaseObj;
            matchedItem = item;
            
            // If we have a specific line item, try to find it in the subtasks
            if (normalizedTargetLineItem && item.subtasks) {
              for (let subIdx = 0; subIdx < item.subtasks.length; subIdx++) {
                const subtask = item.subtasks[subIdx];
                const normalizedSubtask = normalizeStepName(subtask);
                
                if (normalizedSubtask.includes(normalizedTargetLineItem) || 
                    normalizedTargetLineItem.includes(normalizedSubtask)) {
                  console.log('✅ WORKFLOW: Found matching subtask:', subtask);
                  matchedSubtask = { subtask, index: subIdx };
                  foundMatch = true;
                  break;
                }
              }
            }
            
            // Also check subheadings if no subtask match found
            if (!matchedSubtask && item.subheadings) {
              for (const subheading of item.subheadings) {
                for (let subIdx = 0; subIdx < subheading.subtasks.length; subIdx++) {
                  const subtask = subheading.subtasks[subIdx];
                  const normalizedSubtask = normalizeStepName(subtask);
                  
                  if (normalizedSubtask.includes(normalizedTargetLineItem) || 
                      normalizedTargetLineItem.includes(normalizedSubtask)) {
                    console.log('✅ WORKFLOW: Found matching subheading subtask:', subtask);
                    matchedSubtask = { subtask, index: subIdx };
                    matchedSubheading = subheading;
                    foundMatch = true;
                    break;
                  }
                }
                if (foundMatch) break;
              }
            }
            
            // If no specific subtask match, still mark as found
            if (!foundMatch) {
              foundMatch = true;
            }
            break;
          }
        }
      }
      
      if (foundMatch && matchedPhase && matchedItem) {
        // Set the phase and item to open
        setOpenPhase(matchedPhase.id);
        setOpenItem({ [matchedItem.id]: true });
        
        // Enhanced scrolling with precise targeting
        const scrollToHighlightedStep = () => {
          let attempts = 0;
          const maxAttempts = 15;
          
          const attemptScroll = () => {
            attempts++;
            
            // First try to scroll to the phase
            const phaseElement = document.querySelector(`[data-phase-id="${matchedPhase.id}"]`);
            if (phaseElement) {
              console.log('📜 WORKFLOW: Found phase element, scrolling...');
              phaseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              
              // Wait for phase scroll to complete, then scroll to item
              setTimeout(() => {
                const itemElement = document.querySelector(`[data-item-id="${matchedItem.id}"]`);
                if (itemElement) {
                  console.log('📜 WORKFLOW: Found item element, scrolling to specific item...');
                  itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  
                  // Add enhanced visual feedback
                  itemElement.style.transition = 'all 0.3s ease';
                  itemElement.style.transform = 'scale(1.02)';
                  itemElement.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
                  
                  setTimeout(() => {
                    itemElement.style.transform = 'scale(1)';
                    itemElement.style.boxShadow = '';
                  }, 1000);
                  
                  // If we found a specific subtask, try to highlight it
                  if (matchedSubtask) {
                    setTimeout(() => {
                      const subtaskElements = itemElement.querySelectorAll('li');
                      for (const subtaskEl of subtaskElements) {
                        if (subtaskEl.textContent.toLowerCase().includes(matchedSubtask.subtask.toLowerCase())) {
                          subtaskEl.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                          subtaskEl.style.borderRadius = '4px';
                          subtaskEl.style.padding = '2px 4px';
                          subtaskEl.style.transition = 'all 0.3s ease';
                          
                          setTimeout(() => {
                            subtaskEl.style.backgroundColor = '';
                            subtaskEl.style.borderRadius = '';
                            subtaskEl.style.padding = '';
                          }, 3000);
                          break;
                        }
                      }
                    }, 500);
                  }
                  
                  console.log('✅ WORKFLOW: Successfully scrolled to and highlighted item');
                  

                } else {
                  console.log('⚠️ WORKFLOW: Item element not found, retrying...');
                  if (attempts < maxAttempts) {
                    setTimeout(attemptScroll, 200);
                  }
                }
              }, 300);
            } else {
              console.log('⚠️ WORKFLOW: Phase element not found, retrying...');
              if (attempts < maxAttempts) {
                setTimeout(attemptScroll, 200);
              }
            }
          };
          
          // Start the scroll attempts after a brief delay to ensure DOM is ready
          setTimeout(attemptScroll, 100);
        };
        
        // Execute the enhanced scrolling
        scrollToHighlightedStep();
        
        // Clear highlighting after 15 seconds (longer to give user time to see)
        setTimeout(() => {
          setHighlightedStep(null);
          console.log('🔄 WORKFLOW: Cleared highlighting');
        }, 15000);
              } else {
          console.log('❌ WORKFLOW: No matching step found for:', stepToFind);
          console.log('❌ WORKFLOW: Target phase:', targetPhase);
          console.log('❌ WORKFLOW: Target section:', targetSection);
          console.log('❌ WORKFLOW: Available phases:', phases.map(p => p.label));
          console.log('❌ WORKFLOW: Available items:', phases.map(p => p.items.map(i => i.label.split(' –')[0].trim())).flat());
        }
    }
  }, [project?.highlightStep, project?.navigationTarget, phases]);

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

  const updateWorkflowStep = async (stepId, completed) => {
    console.log(`🔄 UPDATE: Updating workflow step ${stepId} to ${completed}`);
    
    // Store original data for rollback
    const originalWorkflowData = workflowData;
    
    // Track this optimistic update
    setOptimisticUpdates(prev => new Set([...prev, stepId]));
    
    // CRITICAL: Immediate optimistic update that persists
    setWorkflowData(prevData => {
      if (!prevData) {
        // Initialize workflow data if it doesn't exist
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
          updatedAt: new Date().toISOString()
        };
      }
      
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
      } else {
        // Replace the step entirely to force re-render
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          completed: completed,
          isCompleted: completed,
          completedAt: completed ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        };
      }
      
      // Return completely new object
      return {
        ...prevData,
        steps: updatedSteps,
        updatedAt: new Date().toISOString(),
        // Add a timestamp to ensure re-render
        _optimisticUpdate: Date.now()
      };
    });

    const projectId = project._id || project.id;
    
    console.log(`🌐 CHECKBOX: Making API call to update workflow step`);
    console.log(`🌐 CHECKBOX: Request payload:`, { completed });
    
    try {
      // CRITICAL: Use the new workflow update API that also updates project.phase
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
    updateWorkflowStep(stepId, newCompletedState);
  };

  // Helper function to check if a step is completed
  const isStepCompleted = (stepId) => {
    console.log(`🔍 CHECKING: isStepCompleted for "${stepId}"`);
    
    if (!workflowData || !workflowData.steps) {
      console.log(`🔍 CHECKING: No workflow data or steps, returning false`);
      return false;
    }
    
    // First try direct ID matching (for backwards compatibility)
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
      return result;
    }
    
    // Parse the stepId format: "phase-id-item-id-sub-index"
    const stepIdParts = stepId.split('-');
    if (stepIdParts.length >= 4) {
      const phaseId = stepIdParts[0]; // e.g., "lead"
      const itemId = stepIdParts.slice(1, -1).join('-'); // e.g., "customer-info"
      const subIndex = parseInt(stepIdParts[stepIdParts.length - 1]); // e.g., 0
      
      // Find the checklist phase and item
      const checklistPhase = phases.find(p => p.id === phaseId);
      if (checklistPhase) {
        const checklistItem = checklistPhase.items.find(i => i.id === itemId);
        if (checklistItem && checklistItem.subtasks[subIndex]) {
          const subtaskName = checklistItem.subtasks[subIndex];
          
          // Map phase IDs to workflow phases
          const phaseMapping = {
            'lead': 'LEAD',
            'prospect': 'PROSPECT', 
            'prospect-non-insurance': 'PROSPECT_NON_INSURANCE',
            'approved': 'APPROVED',
            'execution': 'EXECUTION',
            'supplement': 'SUPPLEMENT',
            'completion': 'COMPLETION'
          };
          
          const workflowPhase = phaseMapping[phaseId];
          
          if (!workflowPhase) {
            console.log(`🔍 CHECKING: No phase mapping for ${phaseId}`);
            return false;
          }
          
          // Find matching workflow step by phase and subtask name
          const matchingStep = workflowData.steps.find(step => {
            // Check if step is in the right phase
            if (step.phase !== workflowPhase) return false;
            
            // Check if any of the step's subtasks match our subtask
            if (step.subTasks && Array.isArray(step.subTasks)) {
              return step.subTasks.some(subTask => {
                const subTaskName = subTask.subTaskName || subTask.name || '';
                const normalizedSubTask = subTaskName.toLowerCase().replace(/[^\w\s]/g, '').trim();
                const normalizedTarget = subtaskName.toLowerCase().replace(/[^\w\s]/g, '').trim();
                
                // Check for exact match or partial match
                return normalizedSubTask === normalizedTarget || 
                       normalizedSubTask.includes(normalizedTarget) ||
                       normalizedTarget.includes(normalizedSubTask);
              });
            }
            
            // Also check the main step name as fallback
            const stepName = step.stepName || step.name || '';
            const normalizedStepName = stepName.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const normalizedSubtask = subtaskName.toLowerCase().replace(/[^\w\s]/g, '').trim();
            
            return normalizedStepName.includes(normalizedSubtask) || 
                   normalizedSubtask.includes(normalizedStepName);
          });
          
          if (matchingStep) {
            console.log(`🔗 CHECKLIST: Mapped checklist item "${subtaskName}" to workflow step "${matchingStep.stepName}"`);
            return matchingStep.completed || matchingStep.isCompleted;
          } else {
            console.log(`🔍 CHECKING: No matching workflow step found for "${subtaskName}" in phase "${workflowPhase}"`);
          }
        }
      }
    }
    
    // If no mapping found, check for partial name matches across all workflow steps
    const stepNameToMatch = stepId.replace(/-/g, ' ').toLowerCase();
    const fuzzyMatch = workflowData.steps.find(step => {
      const stepName = (step.stepName || step.name || '').toLowerCase();
      const words = stepNameToMatch.split(' ').filter(w => w.length > 2);
      return words.some(word => stepName.includes(word));
    });
    
    if (fuzzyMatch) {
      console.log(`🔗 CHECKLIST: Fuzzy matched "${stepId}" to workflow step "${fuzzyMatch.stepName}"`);
      return fuzzyMatch.completed || fuzzyMatch.isCompleted;
    }
    
    console.log(`🔍 CHECKING: No match found for "${stepId}"`);
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
      </div>
      
      {/* Navigation Error Message */}


      <div className="flex-1 overflow-y-auto px-3 py-2 text-left">
        <div className="space-y-2 text-left">
          {phases.map((phase) => {
            // Determine if all tasks in this phase are completed
            const allTasksCompleted = phase.items.every(item => {
              // Check regular subtasks
              const regularSubtasksCompleted = !item.subtasks || item.subtasks.length === 0 || item.subtasks.every((_, subIdx) => {
                const stepId = `${phase.id}-${item.id}-${subIdx}`;
                return isStepCompleted(stepId);
              });
              
              // Check subheading subtasks
              const subheadingSubtasksCompleted = !item.subheadings || item.subheadings.length === 0 || item.subheadings.every(subheading =>
                subheading.subtasks.every((_, subIdx) => {
                  const stepId = `${phase.id}-${item.id}-${subheading.id}-${subIdx}`;
                  return isStepCompleted(stepId);
                })
              );
              
              return regularSubtasksCompleted && subheadingSubtasksCompleted;
            });
            return (
              <div key={phase.id} data-phase-id={phase.id} className="bg-white p-2 rounded border border-gray-200 shadow-sm text-left">
                <div
                  className="flex justify-between items-start cursor-pointer select-none text-left"
                  onClick={() => handlePhaseClick(phase.id)}
                >
                  <h3 className={`text-xs font-semibold text-gray-800 text-left transition-all duration-200 ${allTasksCompleted ? 'line-through text-green-700' : ''}`}
                  >
                    {phase.label} {allTasksCompleted && <span title="Phase Complete" className="ml-1">🎉</span>}
                  </h3>
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
                                return isStepCompleted(stepId);
                              });
                              
                              // Check subheading subtasks
                              const subheadingSubtasksCompleted = !item.subheadings || item.subheadings.length === 0 || item.subheadings.every(subheading =>
                                subheading.subtasks.every((_, subIdx) => {
                                  const stepId = `${phase.id}-${item.id}-${subheading.id}-${subIdx}`;
                                  return isStepCompleted(stepId);
                                })
                              );
                              
                              return regularSubtasksCompleted && subheadingSubtasksCompleted;
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
                                          )) ? 'bg-gradient-to-r from-yellow-300 to-orange-200 text-blue-900 font-bold px-2 py-1 rounded border-2 border-blue-500 shadow-lg animate-pulse' :
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
                                                <li key={subIdx} className="flex items-center gap-1 text-left font-normal">
                                                  <input
                                                    type="checkbox"
                                                    className="h-2.5 w-2.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                    checked={completed}
                                                    onChange={(e) => {
                                                      e.stopPropagation();
                                                      handleCheck(phase.id, item.id, subIdx);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                  />
                                                  <span className={completed ? 'line-through text-gray-400' : ''}>{sub}</span>
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
                                                  <li key={subIdx} className="flex items-center gap-1 text-left font-normal">
                                                    <input
                                                      type="checkbox"
                                                      className="h-2.5 w-2.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
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
                                                    <span className={completed ? 'line-through text-gray-400' : ''}>{sub}</span>
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