import React, { useState } from "react";

export default function ProjectTimeline({ timeline = [], currentStep = 0 }) {
  const [expandedPhases, setExpandedPhases] = useState(new Set());

  const togglePhaseExpansion = (phaseId) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const totalPhases = timeline.length;
  const completedPhases = Math.min(Math.max(currentStep, 0), totalPhases);
  const hasActivePhase = totalPhases > 0 && currentStep < totalPhases;
  const activePhaseIndex = hasActivePhase
    ? Math.min(Math.max(currentStep, 0), totalPhases - 1)
    : -1;
  const activePhase = activePhaseIndex >= 0 ? timeline[activePhaseIndex] : null;
  const currentProgress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

  return (
    <div className="card-surface rounded-xl shadow-soft border border-gray-200/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(26, 90, 153, 0.95), rgba(26, 90, 153, 0.7))',
            color: 'var(--color-surface-white)'
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-800">Project Timeline</h3>
        </div>
      </div>
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
          <span>Overall Progress</span>
          <span className="text-gray-800">{Math.round(currentProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500 ease-out"
            style={{
              background: 'linear-gradient(90deg, var(--color-primary-blueprint-blue), var(--color-success-green))',
              width: `${currentProgress}%`
            }}
          ></div>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="relative">
        {/* Timeline Scale */}
        <div className="flex items-center mb-3">
          <div className="w-20 text-xs font-medium text-gray-600">Phases</div>
          <div className="flex-1 flex items-center justify-between text-xs text-gray-500">
            {timeline.map((_, idx) => (
              <span key={idx} className="text-center">
                {idx + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Gantt Bars */}
        <div className="space-y-3">
          {timeline.map((step, idx) => {
            const isExpanded = expandedPhases.has(step.phase);
            const isCompleted = idx < completedPhases;
            const isCurrent = idx === activePhaseIndex;
            
            return (
              <div key={step.phase} className="group">
                {/* Phase Row */}
                <div className="flex items-center gap-3">
                  {/* Phase Label */}
                  <div className="w-20 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border-2 transition-all duration-200"
                        style={{
                          backgroundColor: isCompleted
                            ? 'var(--color-success-green)'
                            : isCurrent
                              ? 'var(--color-primary-blueprint-blue)'
                              : 'var(--color-background-gray)',
                          borderColor: isCompleted
                            ? 'var(--color-success-green)'
                            : isCurrent
                              ? 'var(--color-primary-blueprint-blue)'
                              : 'var(--color-border-gray)',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(26, 90, 153, 0.15)' : 'none'
                        }}
                      ></div>
                      <span className="text-xs font-semibold text-gray-800 truncate">
                        {step.phase}
                      </span>
                    </div>
                  </div>

                  {/* Gantt Bar */}
                  <div className="flex-1 relative">
                    <div className="relative h-8 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-background-gray)' }}>
                      {/* Progress Bar */}
                      <div
                        className="h-full transition-all duration-500 ease-out rounded-lg"
                        style={{
                          background: isCompleted
                            ? 'linear-gradient(90deg, var(--color-success-green), rgba(16, 185, 129, 0.8))'
                            : isCurrent
                              ? 'linear-gradient(90deg, var(--color-primary-blueprint-blue), rgba(26, 90, 153, 0.75))'
                              : 'var(--color-border-gray)',
                          width: isCompleted ? '100%' : isCurrent ? '50%' : '0%'
                        }}
                      ></div>
                      
                      {/* Phase Info Overlay */}
                      <div className="absolute inset-0 flex items-center justify-between px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white drop-shadow-sm">
                            {step.phase}
                          </span>
                          {isCurrent && (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-white drop-shadow-sm">
                            {step.date}
                          </div>
                          <div className="text-xs text-white/80 drop-shadow-sm">
                            {step.responsible}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => togglePhaseExpansion(step.phase)}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isExpanded ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="ml-20 mt-2 bg-gray-50/80 rounded-lg p-3 border border-gray-100">
                    <div className="mb-2">
                      <h5 className="text-xs font-semibold text-gray-700 mb-1">{step.label}</h5>
                      <p className="text-xs text-gray-600 leading-relaxed">{step.detail}</p>
                    </div>
                    
                    {/* Tasks List */}
                    <div className="space-y-1">
                      <h6 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Key Tasks:</h6>
                      <div className="space-y-0.5">
                        {(step.tasks || []).map((task, taskIdx) => (
                          <div key={taskIdx} className="flex items-center gap-1.5 text-xs">
                            <div
                              className="w-1 h-1 rounded-full"
                              style={{
                                backgroundColor: isCompleted
                                  ? 'var(--color-success-green)'
                                  : isCurrent
                                    ? 'var(--color-primary-blueprint-blue)'
                                    : 'var(--color-border-gray)'
                              }}
                            ></div>
                            <span className="text-gray-700">{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                                  <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: isCompleted
                            ? 'var(--color-success-green)'
                            : isCurrent
                              ? 'var(--color-primary-blueprint-blue)'
                              : 'var(--color-border-gray)',
                          animation: isCurrent ? 'pulse 2s infinite' : 'none'
                        }}
                      ></div>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: isCompleted
                            ? 'var(--color-success-green)'
                            : isCurrent
                              ? 'var(--color-primary-blueprint-blue)'
                              : 'var(--color-text-slate-gray)'
                        }}
                      >
                        {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Phase Summary */}
        <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          className="rounded-lg p-2 border"
          style={{
            backgroundColor: 'var(--color-primary-light-tint)',
            borderColor: 'color-mix(in srgb, var(--color-primary-blueprint-blue) 35%, var(--color-surface-white) 65%)'
          }}
        >
          <div className="flex items-center gap-1 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-primary-blueprint-blue)' }}></div>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-primary-blueprint-blue)' }}>Current Phase</span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-primary-blueprint-blue)' }}>
            {activePhase?.phase || 'Project Complete'}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-primary-blueprint-blue)' }}>
            {activePhase?.responsible || 'All phases complete'}
          </p>
        </div>

        <div
          className="rounded-lg p-2 border"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderColor: 'rgba(16, 185, 129, 0.25)'
          }}
        >
          <div className="flex items-center gap-1 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success-green)' }}></div>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-success-green)' }}>Completed</span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-success-green)' }}>
            {completedPhases} of {totalPhases} phases
          </p>
          <p className="text-xs" style={{ color: 'var(--color-success-green)' }}>
            {Math.round(currentProgress)}% complete
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}