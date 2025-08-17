import React, { useState, useEffect, useMemo, useRef } from 'react';
import WorkflowProgressService from '../../services/workflowProgress';
import { motion, AnimatePresence } from 'framer-motion';

const UnifiedProgressTracker = ({ project, colorMode, onNavigateToWorkflow }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [animateProgress, setAnimateProgress] = useState(false);
    const progressRef = useRef(null);

    // Calculate all progress metrics using NEW SYSTEM
    const progressData = useMemo(() => {
        if (!project) return null;
        
        // Use the updated WorkflowProgressService that uses currentWorkflowItem
        const progressResult = WorkflowProgressService.calculateProjectProgress(project);
        const workflowStatus = WorkflowProgressService.getWorkflowStatus(project);
        
        // Get current workflow info from currentWorkflowItem
        const currentWorkflow = project.currentWorkflowItem;
        const currentPhase = currentWorkflow?.phase || 'LEAD';
        const currentPhaseDisplay = currentWorkflow?.phaseDisplay || 'Lead';
        const phaseColor = WorkflowProgressService.getPhaseColor(currentPhase);
        
        return {
            overallProgress: progressResult.overall || 0,
            currentPhase,
            currentPhaseDisplay,
            currentSection: currentWorkflow?.section || 'Not Started',
            currentLineItem: currentWorkflow?.lineItem || 'No active task',
            phaseColor,
            phaseBreakdown: progressResult.phaseBreakdown || {},
            totalPhases: progressResult.totalPhases || 6,
            completedPhases: progressResult.completedPhases || 0,
            isComplete: currentWorkflow?.isComplete || false,
            status: workflowStatus.status,
            nextPhase: WorkflowProgressService.getNextPhase(currentPhase)
        };
    }, [project]);

    // Animate progress changes
    useEffect(() => {
        if (progressData?.overallProgress > 0) {
            setAnimateProgress(true);
            const timer = setTimeout(() => setAnimateProgress(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [progressData?.overallProgress]);

    // Handle phase selection
    const handlePhaseClick = (phase) => {
        setSelectedPhase(selectedPhase === phase ? null : phase);
        setShowDetails(selectedPhase !== phase);
    };

    // Handle navigation to workflow
    const handleNavigateToWorkflow = () => {
        if (onNavigateToWorkflow && progressData?.currentPhase) {
            onNavigateToWorkflow(progressData.currentPhase);
        }
    };

    if (!progressData) {
        return (
            <div className={`p-4 rounded-lg ${colorMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="text-center text-gray-500">No workflow data available</div>
            </div>
        );
    }

    const phases = [
        { key: 'LEAD', name: 'Lead', color: '#3B82F6' },          // Blue
        { key: 'PROSPECT', name: 'Prospect', color: '#F59E0B' },  // Amber/Yellow
        { key: 'APPROVED', name: 'Approved', color: '#10B981' },  // Emerald Green
        { key: 'EXECUTION', name: 'Execution', color: '#EF4444' }, // Red
        { key: 'SECOND_SUPPLEMENT', name: '2nd Supplement', color: '#8B5CF6' }, // Vivid Violet
        { key: 'COMPLETION', name: 'Completion', color: '#0EA5E9' } // Bright Cyan-Teal
    ];

    return (
        <div className={`transition-all duration-300 rounded-lg ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
            {/* Header */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: progressData.phaseColor }}
                        />
                        <div>
                            <h3 className={`font-semibold text-lg ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                {progressData.currentPhaseDisplay}
                            </h3>
                            <p className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {progressData.status} • {progressData.overallProgress}% Complete
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        {progressData.overallProgress > 0 && (
                            <span className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                {progressData.overallProgress}%
                            </span>
                        )}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`p-2 rounded-md transition-colors ${
                                colorMode 
                                    ? 'hover:bg-gray-700 text-gray-300' 
                                    : 'hover:bg-gray-100 text-gray-600'
                            }`}
                        >
                            <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                ▼
                            </motion.div>
                        </button>
                    </div>
                </div>

                {/* Main Progress Bar */}
                <div className={`w-full bg-gray-200 rounded-full h-2 ${colorMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <motion.div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ backgroundColor: progressData.phaseColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressData.overallProgress}%` }}
                        transition={{ duration: animateProgress ? 1 : 0.3 }}
                    />
                </div>

                {/* Current Task Info */}
                <div className="mt-3 space-y-1">
                    <div className={`text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Current Section: {progressData.currentSection}
                    </div>
                    <div className={`text-sm ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Active Task: {progressData.currentLineItem}
                    </div>
                </div>
            </div>

            {/* Expanded View */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className={`px-4 pb-4 border-t ${colorMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className="pt-4">
                                <h4 className={`font-medium mb-3 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                    Phase Progress
                                </h4>
                                
                                {/* Phase Progress Bars */}
                                <div className="space-y-3">
                                    {phases.map((phase) => {
                                        const phaseData = progressData.phaseBreakdown[phase.key];
                                        const progress = phaseData?.progress || 0;
                                        const isCurrent = phaseData?.isCurrent || false;
                                        const isCompleted = phaseData?.isCompleted || false;
                                        
                                        return (
                                            <div 
                                                key={phase.key}
                                                className={`p-2 rounded-md cursor-pointer transition-colors ${
                                                    isCurrent
                                                        ? colorMode ? 'bg-gray-700' : 'bg-blue-50'
                                                        : colorMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
                                                }`}
                                                onClick={() => handlePhaseClick(phase.key)}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center space-x-2">
                                                        <div 
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: phase.color }}
                                                        />
                                                        <span className={`text-sm font-medium ${
                                                            colorMode ? 'text-gray-300' : 'text-gray-700'
                                                        }`}>
                                                            {phase.name}
                                                        </span>
                                                        {isCurrent && (
                                                            <span className={`text-xs px-2 py-1 rounded ${
                                                                colorMode 
                                                                    ? 'bg-blue-900 text-blue-300' 
                                                                    : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {progress}%
                                                    </span>
                                                </div>
                                                <div className={`w-full bg-gray-200 rounded-full h-1.5 ${
                                                    colorMode ? 'bg-gray-600' : 'bg-gray-200'
                                                }`}>
                                                    <motion.div
                                                        className="h-1.5 rounded-full"
                                                        style={{ backgroundColor: phase.color }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.5, delay: 0.1 }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Navigation Button */}
                                <div className="mt-4">
                                    <button
                                        onClick={handleNavigateToWorkflow}
                                        className={`w-full py-2 px-4 rounded-md transition-colors ${
                                            colorMode
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                    >
                                        View Full Workflow →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UnifiedProgressTracker;