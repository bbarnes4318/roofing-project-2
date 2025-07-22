import React, { useState } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';

const ActivityCard = ({ activity, onProjectSelect, projects, colorMode }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        // Compact format: "Dec 15, 2:30 PM"
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
        }) + ', ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className={`${colorMode ? 'bg-[#1e293b] hover:bg-[#232b4d]' : 'bg-white hover:bg-[#F8F9FA]'} rounded-lg shadow-sm border transition-all duration-200 cursor-pointer`}>
            {/* Top line - always visible */}
            <div 
                className="flex items-center gap-2 p-2 hover:bg-opacity-80 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Avatar */}
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[8px] shadow-sm">
                    {activity.avatar}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* First row - timestamp and author */}
                    <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {activity.author}
                        </span>
                        <span className={`text-[8px] font-medium ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatTimestamp(activity.timestamp)}
                        </span>
                    </div>
                    
                    {/* Second row - project and subject */}
                    <div className="flex items-center gap-2">
                        {activity.projectId && (
                            <button
                                className={`text-[8px] font-semibold underline-offset-1 hover:underline transition-all duration-200 flex-shrink-0 font-medium hover:bg-blue-50 hover:px-1 hover:rounded ${colorMode ? 'text-[#60a5fa]' : 'text-[#2563eb]'}`}
                                onClick={(e) => {
                                    console.log('🔍 ACTIVITY_CARD: Project name clicked!');
                                    console.log('🔍 ACTIVITY_CARD: activity:', activity);
                                    console.log('🔍 ACTIVITY_CARD: onProjectSelect exists:', !!onProjectSelect);
                                    console.log('🔍 ACTIVITY_CARD: projects exists:', !!projects);
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (onProjectSelect && projects) {
                                        const project = projects.find(p => p.id === activity.projectId);
                                        console.log('🔍 ACTIVITY_CARD: found project:', project);
                                        if (project) {
                                            // Pass the project with a flag to indicate it should be highlighted on the Projects page
                                            const projectWithHighlight = {
                                                ...project,
                                                highlightOnProjectsPage: true,
                                                scrollToProjectId: String(project.id) // Ensure it's a string to match data-project-id
                                            };
                                            console.log('🔍 ACTIVITY_CARD: calling onProjectSelect with:', projectWithHighlight);
                                            onProjectSelect(projectWithHighlight, 'Projects', null, 'Activity Feed');
                                        } else {
                                            console.error('❌ ACTIVITY_CARD: No project found for activity.projectId:', activity.projectId);
                                        }
                                    } else {
                                        console.error('❌ ACTIVITY_CARD: onProjectSelect or projects not available');
                                    }
                                }}
                            >
                                📋 {activity.project}
                            </button>
                        )}
                        <span className={`text-[9px] font-medium flex-1 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
                            {(() => {
                                const subject = activity.subject || 'General Update';
                                if (subject.length <= 15) return subject;
                                
                                // Smart shortening for common activity patterns
                                if (subject.includes('inspection')) {
                                    return subject.replace('inspection', 'insp');
                                }
                                if (subject.includes('coordination')) {
                                    return subject.replace('coordination', 'coord');
                                }
                                if (subject.includes('documentation')) {
                                    return subject.replace('documentation', 'docs');
                                }
                                if (subject.includes('notification')) {
                                    return subject.replace('notification', 'notif');
                                }
                                if (subject.includes('maintenance')) {
                                    return subject.replace('maintenance', 'maint');
                                }
                                if (subject.includes('scheduled')) {
                                    return subject.replace('scheduled', 'sched');
                                }
                                if (subject.includes('required')) {
                                    return subject.replace('required', 'req');
                                }
                                if (subject.includes('delivery')) {
                                    return subject.replace('delivery', 'deliv');
                                }
                                if (subject.includes('violation')) {
                                    return subject.replace('violation', 'viol');
                                }
                                if (subject.includes('complaint')) {
                                    return subject.replace('complaint', 'compl');
                                }
                                
                                // If still too long, take first 15 characters
                                return subject.substring(0, 15);
                            })()}
                        </span>
                    </div>
                </div>
                
                {/* Expand arrow */}
                <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            
            {/* Collapsible content with notes */}
            {isExpanded && (
                <div className={`px-2 pb-2 border-t ${colorMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    {/* Notes Section */}
                    <div className={`pt-2 pb-2 mb-2 rounded-lg border transition-colors ${colorMode ? 'bg-[#1e293b] border-[#3b82f6]/30' : 'bg-white border-gray-300'}`}>
                        <div className="px-2">
                            {/* Header */}
                            <div className="flex items-center gap-1.5 mb-2">
                                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className={`text-[7px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Notes</span>
                            </div>
                            
                            {/* Notes Content */}
                            <div className={`text-[7px] leading-relaxed ${colorMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                {activity.content || 'No notes available.'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityCard; 