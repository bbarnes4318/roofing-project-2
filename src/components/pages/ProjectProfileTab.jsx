import React, { useState, useEffect, useRef } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import WorkflowProgressService from '../../services/workflowProgress';
import api from '../../services/api';
import { formatProjectType } from '../../utils/projectTypeFormatter';
import WorkflowDataService from '../../services/workflowDataService';

const ProjectProfileTab = ({ project, colorMode, onProjectSelect }) => {
  const [activeSection] = useState('overview');
  // Match Projects by Phase progress behavior (keyed expansion + visibility management)
  const progressChartRefs = useRef({});
  const [expandedProgress, setExpandedProgress] = useState({});
  const [progressExpanded, setProgressExpanded] = useState(false);

  const toggleProgressExpansion = (projectId, section) => {
    const expandedKey = `${projectId || 'project'}-${section}`;
    setExpandedProgress(prev => ({
      ...prev,
      [expandedKey]: !prev[expandedKey]
    }));
  };

  const ensureProgressChartVisibility = (projectId, section) => {
    const key = `${projectId || 'project'}-${section}`;
    const chartRef = progressChartRefs.current[key];
    if (!chartRef) return;

    const rect = chartRef.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const buffer = 20;

    if (rect.bottom > viewportHeight - buffer) {
      const scrollAmount = rect.bottom - viewportHeight + buffer;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }

    if (rect.top < buffer) {
      const scrollAmount = rect.top - buffer;
      window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    }

    if (rect.bottom > viewportHeight - buffer || rect.top < buffer) {
      chartRef.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  };

  const handleChartPositioning = (projectId, section, isExpanded) => {
    if (!isExpanded) return;
    requestAnimationFrame(() => {
      ensureProgressChartVisibility(projectId, section);
    });
  };

  const getProjectTrades = (proj) => {
    if (proj?.trades && proj.trades.length > 0) return proj.trades;
    const tradeName = proj?.projectType || proj?.type || 'General';
    return [
      {
        name: tradeName,
        laborProgress: proj?.progress || 0,
        materialsDelivered: proj?.materialsDelivered || false
      }
    ];
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-500">Please select a project to view its profile information.</p>
        </div>
      </div>
    );
  }

  const formatAddress = (address) => {
    if (!address) return 'Address not provided';
    
    const parts = address.split(',').map(part => part.trim());
    if (parts.length >= 3) {
      // Format: Street, City, State ZIP
      return (
        <div className="text-sm text-gray-700">
          <div className="font-medium">{parts[0]}</div>
          <div className="text-gray-600">{parts.slice(1).join(', ')}</div>
        </div>
      );
    } else if (parts.length === 2) {
      // Format: Street, State ZIP (missing city - fix this)
      return (
        <div className="text-sm text-gray-700">
          <div className="font-medium">{parts[0]}</div>
          <div className="text-gray-600">{parts[1]}</div>
        </div>
      );
    }
    return <div className="text-sm text-gray-700">{address}</div>;
  };

  const getProjectAddress = (proj) => {
    if (!proj) return null;
    const addr = (proj.address || '').trim();
    const name = (proj.projectName || '').trim();
    if (addr && addr !== name) return addr;
    // Fallbacks when legacy data mapped projectName into address
    return proj.customer?.address || proj.client?.address || addr || null;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left column: Primary Details */}
        <div className="lg:col-span-7 space-y-4">
          {/* Primary Details card: Name, Number|Type, Address, Phase|Section|Line Item */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 truncate">
              {project.name || project.projectName || 'Project Profile'}
            </h1>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-base font-bold text-gray-900">{String(project.projectNumber || project.id || '').padStart(5, '0')}</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-700">{formatProjectType(project.projectType) || project.jobType || 'Project'}</span>
            </div>
            <div className="mb-2">
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Address</div>
              <div className="mt-1 text-sm text-gray-900">{formatAddress(getProjectAddress(project))}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center">
                <span className="text-gray-500 font-medium text-[10px] uppercase tracking-wide w-12 flex-shrink-0">Phase:</span>
                <span className="text-gray-900 font-medium ml-1 truncate">{WorkflowProgressService.getPhaseName(project.currentWorkflowItem?.phase || WorkflowProgressService.getProjectPhase(project))}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 font-medium text-[10px] uppercase tracking-wide w-14 flex-shrink-0">Section:</span>
                <span className="text-gray-900 font-medium ml-1 truncate">{WorkflowDataService.getCurrentSection(project) || project.currentWorkflowItem?.section || 'Not Available'}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 font-medium text-[10px] uppercase tracking-wide w-16 flex-shrink-0">Line Item:</span>
                <button
                  onClick={async () => {
                    if (!onProjectSelect) return;
                    try {
                      const projectId = project._id || project.id;
                      const res = await api.get(`/workflow-data/project-position/${projectId}`);
                      const pos = res?.data?.data || {};
                      const targetLineItemId = pos.currentLineItem || `${pos.currentPhase}-${pos.currentSection}-0`;
                      const targetSectionId = pos.currentSection || null;
                      onProjectSelect(project, 'Project Workflow', null, 'Project Profile', targetLineItemId, targetSectionId);
                    } catch (e) {
                      const phase = project.currentWorkflowItem?.phase || WorkflowProgressService.getProjectPhase(project);
                      const section = project.currentWorkflowItem?.section;
                      const fallbackId = `${phase}-${section || 'unknown'}-0`;
                      onProjectSelect(project, 'Project Workflow', null, 'Project Profile', fallbackId, section || null);
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline ml-1 truncate text-left flex-1"
                >
                  {WorkflowDataService.getCurrentLineItem(project)?.name || project.currentWorkflowItem?.lineItem || 'View Workflow'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Primary Customer</div>
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900 text-lg">
                      {project.customer?.primaryName || project.customer?.name || project.clientName || 'Not Available'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-medium">{project.customer?.primaryPhone ? formatPhoneNumber(project.customer.primaryPhone) : 'Not Available'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{project.customer?.primaryEmail || 'Not Available'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                  <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Project Manager</div>
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900 text-lg">
                      {project.projectManager?.firstName || project.projectManager?.lastName
                        ? `${project.projectManager?.firstName || ''} ${project.projectManager?.lastName || ''}`.trim()
                        : project.projectManager?.name || 'Not Available'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-medium">{project.projectManager?.phone ? formatPhoneNumber(project.projectManager.phone) : 'Not Available'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{project.projectManager?.email || 'Not Available'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {(project.customer?.secondaryName || project.customer?.secondaryPhone || project.customer?.secondaryEmail) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="border-l-4 border-gray-400 bg-gray-50 p-4 rounded-r-lg">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Secondary Contact</div>
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900">
                      {project.customer?.secondaryName || 'Not Available'}
                    </div>
                    {project.customer?.secondaryPhone && (
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="font-medium">{formatPhoneNumber(project.customer.secondaryPhone)}</span>
                        </div>
                      </div>
                    )}
                    {project.customer?.secondaryEmail && (
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">{project.customer.secondaryEmail}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Progress + Project Manager */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:min-h-[420px]">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Project Progress</h3>
            {(() => {
              const trades = getProjectTrades(project);
              const overall = Math.round(trades.reduce((s,t)=> s + (t.laborProgress||0), 0) / (trades.length||1));
              return (
                <div className={`rounded-lg transition-all duration-300 relative ${colorMode ? 'bg-slate-700/20 border border-slate-600/30' : 'bg-gray-50/90 border border-gray-200/50'}`}>
                  <button
                    onClick={() => setProgressExpanded(!progressExpanded)}
                    className={`w-full text-left transition-all duration-200 ${colorMode ? 'hover:bg-slate-600/40' : 'hover:bg-gray-100'} rounded p-2`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Overall Project Progress</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{overall}%</span>
                        <svg className={`w-3 h-3 ${colorMode ? 'text-gray-300' : 'text-gray-600'} ${progressExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                      <div className="bg-brand-500 h-2 rounded-full transition-all duration-500" style={{ width: `${overall}%` }}></div>
                    </div>
                  </button>
                  <div className="px-2 pb-2">
                    {progressExpanded && (
                      <div className="space-y-2 mt-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[11px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Materials Progress</span>
                            <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round((trades.filter(t=>t.materialsDelivered).length / trades.length) * 100)}%</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                            <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.round((trades.filter(t=>t.materialsDelivered).length / trades.length) * 100)}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[11px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Labor Progress</span>
                            <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{overall}%</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                            <div className="bg-orange-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${overall}%` }}></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {trades.map((trade, idx) => {
                            const colors = ['bg-purple-500','bg-pink-500','bg-yellow-500','bg-teal-500','bg-red-500','bg-indigo-500','bg-cyan-500','bg-amber-500','bg-lime-500','bg-fuchsia-500'];
                            const barColor = colors[idx % colors.length];
                            return (
                              <div key={idx}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`${colorMode ? 'text-white' : 'text-gray-800'} text-[11px] font-semibold truncate`}>{trade.name}</span>
                                  <span className={`${colorMode ? 'text-white' : 'text-gray-800'} text-[11px] font-bold`}>{trade.laborProgress}%</span>
                                </div>
                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                  <div className={`${barColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${trade.laborProgress}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ProjectProfileTab;