import React, { useState, useEffect, useMemo, useRef } from 'react';
import WorkflowProgressService from '../../services/workflowProgress';
import { motion, AnimatePresence } from 'framer-motion';

const UnifiedProgressTracker = ({ project, colorMode, onNavigateToWorkflow }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [animateProgress, setAnimateProgress] = useState(false);
    const progressRef = useRef(null);

    // Extract section from step name
    const extractSection = (stepName) => {
        if (!stepName) return 'General';
        if (stepName.includes('Inspection')) return 'Inspection';
        if (stepName.includes('Contract')) return 'Contract & Permitting';
        if (stepName.includes('Material')) return 'Material & Installation';
        if (stepName.includes('Quality')) return 'Quality Control';
        if (stepName.includes('Final')) return 'Final Review';
        if (stepName.includes('Initial')) return 'Initial Assessment';
        if (stepName.includes('Approval')) return 'Approval Process';
        return 'Operations';
    };

    // Calculate all progress metrics
    const progressData = useMemo(() => {
        if (!project) return null;
        
        const currentPhase = WorkflowProgressService.getProjectPhase(project);
        const phaseColors = WorkflowProgressService.getPhaseColor(currentPhase);
        const overallProgress = WorkflowProgressService.calculateProjectProgress(project);
        
        // Get current step details
        const currentStep = project.workflow?.steps?.find(step => !step.isCompleted);
        const completedSteps = project.workflow?.steps?.filter(step => step.isCompleted) || [];
        const totalSteps = project.workflow?.steps?.length || 0;
        
        // Calculate phase-specific progress
        const phases = ['LEAD', 'PROSPECT', 'APPROVED', 'EXECUTION', 'SUPPLEMENT', 'COMPLETION'];
        const phaseProgress = {};
        
        phases.forEach(phase => {
            const phaseSteps = project.workflow?.steps?.filter(step => 
                step.phase === phase || (phase === 'SUPPLEMENT' && step.phase === '2ND SUPP')
            ) || [];
            const phaseCompleted = phaseSteps.filter(step => step.isCompleted).length;
            phaseProgress[phase] = phaseSteps.length > 0 
                ? Math.round((phaseCompleted / phaseSteps.length) * 100) 
                : 0;
        });
        
        // Extract section and line item from current step
        const currentSection = currentStep ? extractSection(currentStep.stepName) : null;
        const currentLineItem = currentStep?.stepName || null;
        
        return {
            currentPhase,
            phaseColors,
            overallProgress,
            currentStep,
            currentSection,
            currentLineItem,
            completedSteps: completedSteps.length,
            totalSteps,
            phaseProgress,
            percentComplete: overallProgress || 0
        };
    }, [project]);

    // Animate progress on mount
    useEffect(() => {
        setTimeout(() => setAnimateProgress(true), 100);
    }, []);

    // Phase configuration
    const PHASES = [
        { id: 'LEAD', name: 'Lead', color: 'from-blue-500 to-blue-600', icon: '🎯' },
        { id: 'PROSPECT', name: 'Prospect', color: 'from-teal-500 to-teal-600', icon: '🔍' },
        { id: 'APPROVED', name: 'Approved', color: 'from-purple-500 to-purple-600', icon: '✅' },
        { id: 'EXECUTION', name: 'Execution', color: 'from-orange-500 to-orange-600', icon: '🔧' },
        { id: 'SUPPLEMENT', name: '2nd Supp', color: 'from-pink-500 to-pink-600', icon: '📋' },
        { id: 'COMPLETION', name: 'Completion', color: 'from-green-500 to-green-600', icon: '🏁' }
    ];

    const getPhaseIndex = (phaseId) => {
        return PHASES.findIndex(p => p.id === phaseId);
    };

    const currentPhaseIndex = progressData ? getPhaseIndex(progressData.currentPhase) : 0;

    if (!progressData) return null;

    return (
        <div className={`${colorMode ? 'bg-slate-800/90' : 'bg-white'} rounded-xl shadow-lg overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[800px]' : 'max-h-[200px]'}`}>
            {/* Main Progress Header - Always Visible */}
            <div 
                className={`p-4 cursor-pointer transition-colors ${colorMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Top Row: Phase Badge, Overall Progress, Current Location */}
                <div className="flex items-center justify-between mb-3">
                    {/* Current Phase Badge with Animation */}
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${PHASES[currentPhaseIndex]?.color || 'from-blue-500 to-blue-600'} text-white font-semibold text-sm shadow-lg`}
                    >
                        <span className="text-lg">{PHASES[currentPhaseIndex]?.icon}</span>
                        <span>{progressData.currentPhase}</span>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </motion.div>

                    {/* Overall Progress Percentage with Animation */}
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <motion.div 
                                className={`text-2xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {progressData.percentComplete}%
                            </motion.div>
                            <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {progressData.completedSteps} of {progressData.totalSteps} steps
                            </div>
                        </div>
                        
                        {/* Expand/Collapse Arrow */}
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <svg className={`w-6 h-6 ${colorMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </motion.div>
                    </div>
                </div>

                {/* Current Location Display - Phase > Section > Line Item */}
                <div className={`flex items-center gap-2 text-sm mb-3 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-medium">Current:</span>
                    <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded ${colorMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                            {progressData.currentPhase}
                        </span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className={`px-2 py-0.5 rounded ${colorMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                            {progressData.currentSection}
                        </span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className={`px-2 py-0.5 rounded font-semibold ${colorMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                            {progressData.currentLineItem || 'Starting...'}
                        </span>
                    </div>
                </div>

                {/* Visual Progress Journey - Interactive Phase Circles */}
                <div className="relative">
                    {/* Progress Line Background */}
                    <div className={`absolute top-5 left-0 right-0 h-1 ${colorMode ? 'bg-slate-700' : 'bg-gray-200'} rounded-full`} />
                    
                    {/* Animated Progress Line */}
                    <motion.div 
                        className="absolute top-5 left-0 h-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: animateProgress ? `${(currentPhaseIndex / (PHASES.length - 1)) * 100}%` : '0%' }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />

                    {/* Phase Circles */}
                    <div className="relative flex justify-between">
                        {PHASES.map((phase, index) => {
                            const isCompleted = index < currentPhaseIndex;
                            const isCurrent = index === currentPhaseIndex;
                            const phasePercent = progressData.phaseProgress[phase.id] || 0;
                            
                            return (
                                <motion.div
                                    key={phase.id}
                                    className="relative flex flex-col items-center cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPhase(phase.id);
                                        setShowDetails(true);
                                    }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {/* Phase Circle with Progress Ring */}
                                    <div className="relative">
                                        {/* Progress Ring for Current Phase */}
                                        {isCurrent && (
                                            <svg className="absolute -inset-2 w-14 h-14 transform -rotate-90">
                                                <circle
                                                    cx="28"
                                                    cy="28"
                                                    r="24"
                                                    stroke={colorMode ? '#475569' : '#e5e7eb'}
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <motion.circle
                                                    cx="28"
                                                    cy="28"
                                                    r="24"
                                                    stroke="#3b82f6"
                                                    strokeWidth="4"
                                                    fill="none"
                                                    strokeDasharray={`${2 * Math.PI * 24}`}
                                                    initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                                                    animate={{ 
                                                        strokeDashoffset: 2 * Math.PI * 24 * (1 - phasePercent / 100)
                                                    }}
                                                    transition={{ duration: 1, delay: 0.5 }}
                                                />
                                            </svg>
                                        )}
                                        
                                        {/* Phase Circle */}
                                        <motion.div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg relative z-10 ${
                                                isCompleted ? 'bg-green-500' : 
                                                isCurrent ? 'bg-blue-500' : 
                                                'bg-gray-400'
                                            }`}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            {isCompleted ? '✓' : phase.id.charAt(0)}
                                        </motion.div>
                                        
                                        {/* Pulse Animation for Current */}
                                        {isCurrent && (
                                            <motion.div
                                                className="absolute inset-0 w-10 h-10 rounded-full bg-blue-500"
                                                animate={{
                                                    scale: [1, 1.3, 1],
                                                    opacity: [0.5, 0, 0.5]
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                            />
                                        )}
                                    </div>
                                    
                                    {/* Phase Label */}
                                    <div className={`mt-2 text-xs font-medium ${
                                        isCurrent ? (colorMode ? 'text-blue-300' : 'text-blue-600') :
                                        isCompleted ? (colorMode ? 'text-green-300' : 'text-green-600') :
                                        (colorMode ? 'text-gray-500' : 'text-gray-400')
                                    }`}>
                                        {phase.name}
                                        {isCurrent && (
                                            <div className="text-[10px] mt-0.5">{phasePercent}%</div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Expanded Details Section */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`border-t ${colorMode ? 'border-slate-700' : 'border-gray-200'}`}
                    >
                        <div className="p-4 space-y-4">
                            {/* Phase Progress Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {PHASES.map((phase) => {
                                    const phasePercent = progressData.phaseProgress[phase.id] || 0;
                                    const isCurrentPhase = phase.id === progressData.currentPhase;
                                    const isPastPhase = getPhaseIndex(phase.id) < currentPhaseIndex;
                                    
                                    return (
                                        <motion.div
                                            key={phase.id}
                                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                                isCurrentPhase 
                                                    ? (colorMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50')
                                                    : isPastPhase
                                                    ? (colorMode ? 'border-green-500/50 bg-green-900/10' : 'border-green-500/50 bg-green-50/50')
                                                    : (colorMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50')
                                            }`}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => {
                                                if (onNavigateToWorkflow) {
                                                    onNavigateToWorkflow(project, phase.id);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-sm font-semibold ${
                                                    colorMode ? 'text-white' : 'text-gray-900'
                                                }`}>
                                                    {phase.icon} {phase.name}
                                                </span>
                                                <span className={`text-xs font-bold ${
                                                    isPastPhase ? 'text-green-500' :
                                                    isCurrentPhase ? 'text-blue-500' :
                                                    colorMode ? 'text-gray-500' : 'text-gray-400'
                                                }`}>
                                                    {phasePercent}%
                                                </span>
                                            </div>
                                            
                                            {/* Phase Progress Bar */}
                                            <div className={`h-2 rounded-full overflow-hidden ${
                                                colorMode ? 'bg-slate-700' : 'bg-gray-200'
                                            }`}>
                                                <motion.div
                                                    className={`h-full rounded-full ${
                                                        isPastPhase ? 'bg-green-500' :
                                                        isCurrentPhase ? 'bg-blue-500' :
                                                        'bg-gray-400'
                                                    }`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${phasePercent}%` }}
                                                    transition={{ duration: 0.5, delay: getPhaseIndex(phase.id) * 0.1 }}
                                                />
                                            </div>
                                            
                                            {/* Status Text */}
                                            <div className={`mt-1 text-[10px] ${
                                                colorMode ? 'text-gray-400' : 'text-gray-600'
                                            }`}>
                                                {isPastPhase ? 'Completed' :
                                                 isCurrentPhase ? 'In Progress' :
                                                 'Not Started'}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Trade Progress Section */}
                            <div className={`rounded-lg p-3 ${colorMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                <div className={`text-sm font-semibold mb-3 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                    Trade Progress
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { name: 'Materials', value: 85, color: 'from-green-400 to-green-600', icon: '📦' },
                                        { name: 'Labor', value: 72, color: 'from-blue-400 to-blue-600', icon: '👷' },
                                        { name: 'Roofing', value: 90, color: 'from-purple-400 to-purple-600', icon: '🏠' },
                                        { name: 'Siding', value: 65, color: 'from-orange-400 to-orange-600', icon: '🏗️' }
                                    ].map((trade, index) => (
                                        <motion.div
                                            key={trade.name}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="space-y-1"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs flex items-center gap-1 ${
                                                    colorMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                    <span>{trade.icon}</span>
                                                    {trade.name}
                                                </span>
                                                <span className={`text-xs font-bold ${
                                                    colorMode ? 'text-white' : 'text-gray-900'
                                                }`}>
                                                    {trade.value}%
                                                </span>
                                            </div>
                                            <div className={`h-1.5 rounded-full overflow-hidden ${
                                                colorMode ? 'bg-slate-800' : 'bg-gray-200'
                                            }`}>
                                                <motion.div
                                                    className={`h-full bg-gradient-to-r ${trade.color} rounded-full`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${trade.value}%` }}
                                                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onNavigateToWorkflow && onNavigateToWorkflow(project, progressData.currentPhase)}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                                        colorMode 
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                >
                                    View Current Workflow
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border-2 ${
                                        colorMode 
                                            ? 'border-slate-600 text-gray-300 hover:bg-slate-700' 
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    View Details
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Phase Detail Modal */}
            <AnimatePresence>
                {showDetails && selectedPhase && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={() => setShowDetails(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={`${colorMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className={`text-lg font-bold mb-4 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                                {PHASES.find(p => p.id === selectedPhase)?.name} Phase Details
                            </h3>
                            <div className={`space-y-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <p>Progress: {progressData.phaseProgress[selectedPhase]}%</p>
                                <p>Status: {selectedPhase === progressData.currentPhase ? 'In Progress' : 
                                           getPhaseIndex(selectedPhase) < currentPhaseIndex ? 'Completed' : 'Not Started'}</p>
                            </div>
                            <button
                                onClick={() => setShowDetails(false)}
                                className={`mt-4 px-4 py-2 rounded-lg font-medium ${
                                    colorMode ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-800'
                                }`}
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UnifiedProgressTracker;