import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '../common/Icons';
import WorkflowProgressService from '../../services/workflowProgress';

const ProjectChecklistPage = ({ project, onUpdate, onPhaseCompletionChange, targetLineItemId, targetSectionId, selectionNonce }) => {
    const [openPhases, setOpenPhases] = useState({});
    const [openSections, setOpenSections] = useState({});
    const [checkedItems, setCheckedItems] = useState({});

    // Mock workflow data - replace with actual data from your backend
    const mockPhases = [
        {
            id: 'LEAD',
            name: 'Lead Phase',
            color: '#3B82F6',
            sections: [
                {
                    id: 'lead-section-1',
                    name: 'Initial Contact',
                    lineItems: [
                        { id: 'lead-section-1-0', name: 'Customer inquiry received' },
                        { id: 'lead-section-1-1', name: 'Initial response sent' },
                        { id: 'lead-section-1-2', name: 'Follow-up scheduled' }
                    ]
                },
                {
                    id: 'lead-section-2',
                    name: 'Qualification',
                    lineItems: [
                        { id: 'lead-section-2-0', name: 'Budget qualification' },
                        { id: 'lead-section-2-1', name: 'Timeline assessment' },
                        { id: 'lead-section-2-2', name: 'Decision maker identified' }
                    ]
                }
            ]
        },
        {
            id: 'PROSPECT',
            name: 'Prospect Phase',
            color: '#10B981',
            sections: [
                {
                    id: 'prospect-section-1',
                    name: 'Site Assessment',
                    lineItems: [
                        { id: 'prospect-section-1-0', name: 'Site visit scheduled' },
                        { id: 'prospect-section-1-1', name: 'Measurements taken' },
                        { id: 'prospect-section-1-2', name: 'Photos documented' }
                    ]
                }
            ]
        },
        {
            id: 'ESTIMATE',
            name: 'Estimate Phase',
            color: '#F59E0B',
            sections: [
                {
                    id: 'estimate-section-1',
                    name: 'Proposal Development',
                    lineItems: [
                        { id: 'estimate-section-1-0', name: 'Materials calculated' },
                        { id: 'estimate-section-1-1', name: 'Labor estimated' },
                        { id: 'estimate-section-1-2', name: 'Proposal drafted' }
                    ]
                }
            ]
        }
    ];

    // Toggle phase expansion
    const togglePhase = (phaseId) => {
        setOpenPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
    };

    // Toggle section expansion
    const toggleSection = (sectionId) => {
        setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    // Handle checkbox changes
    const handleItemCheck = (itemId, checked) => {
        setCheckedItems(prev => ({ ...prev, [itemId]: checked }));
        // Notify parent component of updates
        if (onUpdate) {
            onUpdate({ ...checkedItems, [itemId]: checked });
        }
    };

    // Highlighting and scrolling effect
    useEffect(() => {
        if (!project) return;

        // 1) Expand the correct phase/section if you keep local open state
        const tli = targetLineItemId || project?.navigationTarget?.lineItemId;
        const targetSec = targetSectionId || project?.navigationTarget?.targetSectionId;
        
        if (tli || targetSec) {
            // Extract phase and section from lineItemId or use targetSectionId
            let phaseId, sectionId;
            
            if (tli) {
                const parts = tli.split('-');
                if (parts.length >= 2) {
                    phaseId = parts[0];
                    sectionId = parts.slice(0, -1).join('-');
                }
            }
            
            if (targetSec) {
                sectionId = targetSec;
                // Try to find the phase for this section
                for (const phase of mockPhases) {
                    if (phase.sections.some(s => s.id === targetSec)) {
                        phaseId = phase.id;
                        break;
                    }
                }
            }

            if (phaseId) {
                setOpenPhases(prev => ({ ...prev, [phaseId]: true }));
            }
            if (sectionId) {
                setOpenSections(prev => ({ ...prev, [sectionId]: true }));
            }
        }

        setTimeout(() => {
            let el = null;
            const tli = targetLineItemId || project?.navigationTarget?.lineItemId;
            if (tli) {
                el = document.getElementById(`lineitem-${tli}`)
                    || document.getElementById(`lineitem-checkbox-${tli}`)?.closest('.workflow-line-item')
                    || null;
            }
            if (!el && (targetSectionId || project?.navigationTarget?.targetSectionId)) {
                const sec = targetSectionId || project.navigationTarget.targetSectionId;
                el = document.getElementById(`item-${sec}`);
            }
            if (!el) return;

            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const enhanced = project?.highlightTarget || project?.navigationTarget;
            const highlightColor = enhanced
                ? (project.highlightTarget?.highlightColor || project.navigationTarget?.highlightColor || '#0066CC')
                : '#F59E0B';

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
        }, 300);
    }, [project?.id, targetLineItemId, targetSectionId, selectionNonce]);

    return (
        <div className="p-6 space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Workflow</h2>
                <p className="text-gray-600">Track progress through project phases and tasks</p>
            </div>

            {mockPhases.map((phase) => (
                <div key={phase.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Phase Header */}
                    <button
                        onClick={() => togglePhase(phase.id)}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: phase.color }}
                            />
                            <span className="font-semibold text-gray-900">{phase.name}</span>
                        </div>
                        {openPhases[phase.id] ? (
                            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                        ) : (
                            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                        )}
                    </button>

                    {/* Phase Sections */}
                    {openPhases[phase.id] && (
                        <div className="bg-white">
                            {phase.sections.map((section) => (
                                <div key={section.id} id={`item-${section.id}`} className="border-t border-gray-100">
                                    {/* Section Header */}
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full px-6 py-3 hover:bg-gray-50 flex items-center justify-between text-left transition-colors"
                                    >
                                        <span className="font-medium text-gray-800">{section.name}</span>
                                        {openSections[section.id] ? (
                                            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>

                                    {/* Line Items */}
                                    {openSections[section.id] && (
                                        <div className="pl-8 pr-6 pb-3 space-y-2">
                                            {section.lineItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    id={`lineitem-${item.id}`}
                                                    className="workflow-line-item flex items-center space-x-3 py-2 px-3 rounded hover:bg-gray-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        id={`lineitem-checkbox-${item.id}`}
                                                        checked={checkedItems[item.id] || false}
                                                        onChange={(e) => handleItemCheck(item.id, e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <label
                                                        htmlFor={`lineitem-checkbox-${item.id}`}
                                                        className={`text-sm cursor-pointer ${
                                                            checkedItems[item.id] ? 'line-through text-gray-500' : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {item.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Add CSS for pulse animation */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            `}</style>
        </div>
    );
};

export default ProjectChecklistPage;
