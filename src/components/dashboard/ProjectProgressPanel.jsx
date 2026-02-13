import React, { useRef } from 'react';

const ProjectProgressPanel = ({
  open,
  onClose,
  project,
  colorMode,
  getProjectProgress,
  expandedTrades,
  toggleTrades,
  expandedAdditionalTrades,
  toggleAdditionalTrades,
}) => {
  const panelRef = useRef(null);
  const overallProgress = getProjectProgress(project);

  return (
    <div
      ref={panelRef}
      className={`fixed z-50 top-0 right-0 h-full w-96 ${colorMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'} shadow-2xl border-l ${colorMode ? 'border-slate-600' : 'border-gray-200'} transform transition-transform duration-300 ease-out`}
      style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      data-section="project-progress-panel"
    >
      <div className={`px-6 py-4 border-b ${colorMode ? 'border-slate-600' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Project Progress</h3>
            <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
              {project?.name} (
              <span className={`${colorMode ? 'text-blue-300' : 'text-blue-600'}`}>
                #{String(project?.projectNumber || '').padStart(5, '0')}
              </span>
              )
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-opacity-10 transition-colors ${colorMode ? 'hover:bg-white' : 'hover:bg-gray-100'}`}
            aria-label="Close Progress Panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto h-full">
        {/* Overall Progress */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Progress</span>
              <p className="text-xs text-gray-500 mt-0.5">Complete project status</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${overallProgress === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                {Math.round(overallProgress || 0)}%
              </span>
              <div className={`text-xs ${overallProgress === 100 ? 'text-green-500' : 'text-blue-500'}`}>
                {overallProgress === 100 ? 'Complete' : 'In Progress'}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className={`w-full h-3 rounded-full overflow-hidden shadow-inner ${colorMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  overallProgress === 100 ? 'bg-[#F8FAFC]' : 'bg-[#F8FAFC]'
                }`}
                style={{ width: `${Math.min(overallProgress || 0, 100)}%` }}
              >
                {overallProgress > 15 && (
                  <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full" />
                )}
              </div>
            </div>

            {overallProgress > 0 && (
              <div
                className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full border-2 shadow-lg transition-all duration-700 ${
                  overallProgress === 100 ? 'bg-green-500 border-green-300' : 'bg-blue-500 border-blue-300'
                }`}
                style={{ left: `calc(${Math.min(overallProgress || 0, 100)}% - 6px)` }}
              />
            )}
          </div>
        </div>

        {/* Phase Breakdown */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phase Breakdown</span>
              <p className="text-xs text-gray-500 mt-0.5">Materials and labor progress</p>
            </div>
            <button
              onClick={() => toggleTrades(project.id)}
              className={`flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity px-2 py-1 rounded ${
                colorMode ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{expandedTrades.has(project.id) ? 'Hide' : 'Show'} Details</span>
              <svg className={`w-3 h-3 transition-transform duration-200 ${expandedTrades.has(project.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Materials */}
          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Materials</span>
              </div>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{getProjectProgress(project)}%</span>
            </div>
            <div className={`${colorMode ? 'bg-slate-700' : 'bg-gray-200'} w-full h-2 rounded-full overflow-hidden shadow-inner`}>
              <div
                className="h-full rounded-full bg-[#F8FAFC] transition-all duration-500 ease-out"
                style={{ width: `${getProjectProgress(project)}%` }}
              >
                {getProjectProgress(project) > 15 && (
                  <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full" />
                )}
              </div>
            </div>
          </div>

          {/* Labor */}
          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Labor</span>
              </div>
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{getProjectProgress(project)}%</span>
            </div>
            <div className={`${colorMode ? 'bg-slate-700' : 'bg-gray-200'} w-full h-2 rounded-full overflow-hidden shadow-inner`}>
              <div
                className="h-full rounded-full bg-[#F8FAFC] transition-all duration-500 ease-out"
                style={{ width: `${getProjectProgress(project)}%` }}
              >
                {getProjectProgress(project) > 15 && (
                  <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Trades Breakdown */}
        {expandedTrades.has(project.id) && (
          <div className="space-y-3 pt-2 border-t border-gray-200/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trade Progress</span>
              <button
                onClick={() => toggleAdditionalTrades(project.id)}
                className={`flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}
              >
                <span>{expandedAdditionalTrades.has(project.id) ? 'Less' : 'More'}</span>
                <svg className={`w-3 h-3 transition-transform ${expandedAdditionalTrades.has(project.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Roofing', progress: getProjectProgress(project) },
                { name: 'Siding', progress: getProjectProgress(project) },
                ...(expandedAdditionalTrades.has(project.id)
                  ? [
                      { name: 'Windows', progress: getProjectProgress(project) },
                      { name: 'Gutters', progress: getProjectProgress(project) },
                    ]
                  : []),
              ].map((trade) => (
                <div key={trade.name} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium group-hover:text-blue-500 transition-colors">{trade.name}</span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{trade.progress}%</span>
                  </div>
                  <div className={`${colorMode ? 'bg-slate-600' : 'bg-gray-200'} w-full h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        trade.name === 'Roofing'
                          ? 'bg-purple-500'
                          : trade.name === 'Siding'
                          ? 'bg-pink-500'
                          : trade.name === 'Windows'
                          ? 'bg-yellow-500'
                          : trade.name === 'Gutters'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${trade.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectProgressPanel;
