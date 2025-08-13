import React, { useState, useEffect, useRef } from 'react';
import { formatPhoneNumber } from '../../utils/helpers';
import WorkflowProgressService from '../../services/workflowProgress';
import api from '../../services/api';
import { formatProjectType } from '../../utils/projectTypeFormatter';

const ProjectProfileTab = ({ project, colorMode, onProjectSelect }) => {
  const [activeSection] = useState('overview');
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [tradesExpanded, setTradesExpanded] = useState(false);

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
    
    const parts = address.split(',');
    if (parts.length >= 2) {
      return (
        <div className="text-sm text-gray-700">
          <div className="font-medium">{parts[0]?.trim()}</div>
          <div className="text-gray-600">{parts.slice(1).join(',').trim()}</div>
        </div>
      );
    }
    return <div className="text-sm text-gray-700">{address}</div>;
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
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-1 truncate">
              {project.name || project.projectName || 'Project Profile'}
            </h1>
            {/* Row: Project Number + Project Type */}
            <div className="flex items-center gap-3 mb-1">
              <span className="text-base font-bold text-gray-900">
                {String(project.projectNumber || project.id || '').padStart(5, '0')}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-700">
                {formatProjectType(project.projectType) || project.jobType || 'Project'}
              </span>
            </div>
            {/* Row: Phase / Section / Line Item */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 text-xs font-medium">
                {WorkflowProgressService.getPhaseName(WorkflowProgressService.getProjectPhase(project))}
              </span>
              <span className="text-gray-400">•</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200 text-xs font-medium">
                {project.currentWorkflowItem?.sectionDisplayName || project.currentWorkflowItem?.section || 'Not Available'}
              </span>
              <span className="text-gray-400">•</span>
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
                    const phase = WorkflowProgressService.getProjectPhase(project);
                    const section = project.currentWorkflowItem?.section;
                    const fallbackId = `${phase}-${section || 'unknown'}-0`;
                    onProjectSelect(project, 'Project Workflow', null, 'Project Profile', fallbackId, section || null);
                  }
                }}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-medium"
              >
                {project.currentWorkflowItem?.lineItem || 'View Workflow'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview content only - compact, professional layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Overview</h3>
            {/* Definition list style for compactness with embedded contacts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              {/* Left: Project Number and Address inline for compactness */}
              <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <div>
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Project Number</div>
                  <button
                    onClick={() => onProjectSelect && onProjectSelect(project, 'Profile', null, 'Project Profile')}
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {String(project.projectNumber || project.id || '').padStart(5, '0')}
                  </button>
                </div>
                <div className="sm:flex-1">
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide sm:mt-0 mt-2">Project Address</div>
                  <div className="mt-1 text-sm text-gray-900">
                    {formatAddress(project.customer?.address || project.clientAddress || project.address)}
                  </div>
                </div>
              </div>

              {/* Right: Optional slot kept empty (prevents wasted space on large screens) */}
              <div className="hidden md:block"></div>
            </div>

            {/* Progress (EXACT same visual and structure as Projects by Phase / Project Cubes) */}
            <div className="mt-4">
              {(() => {
                // Reproduce Project Cubes summary + layered details
                const trades = getProjectTrades(project);
                const overall = Math.round(trades.reduce((s,t)=> s + (t.laborProgress||0), 0) / (trades.length||1));
                return (
                  <div className={`rounded-lg transition-all duration-300 relative ${colorMode ? 'bg-slate-700/20 border border-slate-600/30' : 'bg-gray-50/90 border border-gray-200/50'}`}>
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>Overall Project Progress</span>
                        <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{overall}%</span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                        <div className="bg-brand-500 h-2 rounded-full transition-all duration-500" style={{ width: `${overall}%` }}></div>
                      </div>
                    </div>

                    {/* Layered details matching Projects by Phase structure */}
                    <div className="px-2 pb-2">
                      <button
                        onClick={() => setProgressExpanded(!progressExpanded)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {progressExpanded ? 'Hide details' : 'Show details'}
                      </button>
                      {progressExpanded && (
                        <div className="space-y-2 mt-2">
                          {/* Materials */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[11px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Materials Progress</span>
                              <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{Math.round((trades.filter(t=>t.materialsDelivered).length / trades.length) * 100)}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                              <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.round((trades.filter(t=>t.materialsDelivered).length / trades.length) * 100)}%` }}></div>
                            </div>
                          </div>
                          {/* Labor */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[11px] font-semibold ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>Labor Progress</span>
                              <span className={`text-[11px] font-bold ${colorMode ? 'text-white' : 'text-gray-800'}`}>{overall}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${colorMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                              <div className="bg-orange-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${overall}%` }}></div>
                            </div>
                          </div>
                          {/* Trades */}
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

        {/* Sidebar - moved up and made sticky to remain visible */}
        <div className="lg:col-span-4 space-y-3 lg:sticky lg:top-4 self-start">
          {/* Customer Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Customer Contact Info</h3>
            <div className="space-y-1.5 text-sm">
              <div className="font-semibold text-gray-900">{project.customer?.primaryName || project.customer?.name || project.clientName || 'Not provided'}</div>
              {project.customer?.primaryPhone && (
                <div className="flex items-center gap-2">
                  <span>📞</span>
                  <a href={`tel:${project.customer.primaryPhone.replace(/[^\d+]/g, '')}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {formatPhoneNumber(project.customer.primaryPhone)}
                  </a>
                </div>
              )}
              {project.customer?.primaryEmail && (
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <a href={`mailto:${project.customer.primaryEmail}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {project.customer.primaryEmail}
                  </a>
                </div>
              )}
            </div>
            {(project.customer?.secondaryName || project.customer?.secondaryPhone || project.customer?.secondaryEmail) && (
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="font-semibold text-gray-900">{project.customer?.secondaryName}</div>
                {project.customer?.secondaryPhone && (
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    <a href={`tel:${project.customer.secondaryPhone.replace(/[^\d+]/g, '')}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                      {formatPhoneNumber(project.customer.secondaryPhone)}
                    </a>
                  </div>
                )}
                {project.customer?.secondaryEmail && (
                  <div className="flex items-center gap-2">
                    <span>✉️</span>
                    <a href={`mailto:${project.customer.secondaryEmail}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                      {project.customer.secondaryEmail}
                    </a>
        </div>
      )}
              </div>
            )}
          </div>

          {/* Project Manager */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Project Manager</h3>
            <div className="space-y-1.5 text-sm">
              <div className="font-semibold text-gray-900">
                {project.projectManager?.firstName || project.projectManager?.lastName
                  ? `${project.projectManager?.firstName || ''} ${project.projectManager?.lastName || ''}`.trim()
                  : project.projectManager?.name || 'Not Assigned'}
              </div>
              {project.projectManager?.phone && (
                <div className="flex items-center gap-2">
                  <span>📞</span>
                  <a href={`tel:${project.projectManager.phone.replace(/[^\d+]/g, '')}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {formatPhoneNumber(project.projectManager.phone)}
                  </a>
              </div>
              )}
              {project.projectManager?.email && (
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <a href={`mailto:${project.projectManager.email}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {project.projectManager.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectProfileTab;