import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  SparklesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CogIcon,
  DocumentDuplicateIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import { workflowService } from '../../services/api';

const WORKFLOW_OPTIONS = [
  {
    id: 'default',
    title: 'Use Default Roofing Workflow',
    description: 'Start with our proven roofing workflow that includes all standard phases and line items',
    icon: CheckCircleIcon,
    color: 'bg-green-500',
    features: [
      '15 workflow phases from Lead to Completion',
      '86 professionally named line items',
      'Automated alerts and progression',
      'Ready to use immediately'
    ],
    recommended: true
  },
  {
    id: 'customize',
    title: 'Customize Default Workflow',
    description: 'Start with the default workflow but modify phases, sections, and line items to fit your process',
    icon: PencilSquareIcon,
    color: 'bg-blue-500',
    features: [
      'Built on proven foundation',
      'Add or remove phases',
      'Customize line item names',
      'Tailor to your specific needs'
    ]
  },
  {
    id: 'create',
    title: 'Create New Workflow',
    description: 'Build a completely custom workflow from scratch with your own phases and processes',
    icon: SparklesIcon,
    color: 'bg-purple-500',
    features: [
      'Complete creative control',
      'Define your own phases',
      'Custom line items and sections',
      'Advanced workflow design'
    ],
    advanced: true
  }
];

const OwnerOnboardingFlow = ({ onComplete, onBack, currentUser }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [customWorkflowName, setCustomWorkflowName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflowPreview, setWorkflowPreview] = useState(null);

  // Step 1: Workflow Selection
  const WorkflowSelectionStep = () => (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <div className="mx-auto w-16 h-16 bg-[var(--color-primary-blueprint-blue)] rounded-full flex items-center justify-center mb-6">
          <CogIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Set Up Your Project Workflow
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Choose how you'd like to configure your project workflow system. This determines how your projects will be managed and tracked.
        </p>
      </div>

      {/* Workflow Options */}
      <div className="grid gap-6 mb-8">
        {WORKFLOW_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          const isSelected = selectedOption === option.id;
          
          return (
            <div
              key={option.id}
              className={`
                relative bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-300
                hover:shadow-lg transform hover:scale-[1.02]
                ${isSelected 
                  ? 'border-blue-500 ring-4 ring-blue-200 shadow-xl' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => setSelectedOption(option.id)}
            >
              {/* Badges */}
              <div className="absolute top-4 right-4 flex space-x-2">
                {option.recommended && (
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                    RECOMMENDED
                  </span>
                )}
                {option.advanced && (
                  <span className="bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">
                    ADVANCED
                  </span>
                )}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              <div className="flex items-start space-x-6">
                {/* Icon */}
                <div className={`w-16 h-16 ${option.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {option.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {option.description}
                  </p>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-2">
                    {option.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Workflow Name Input */}
      {selectedOption === 'create' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workflow Name
          </label>
          <input
            type="text"
            value={customWorkflowName}
            onChange={(e) => setCustomWorkflowName(e.target.value)}
            placeholder="Enter a name for your custom workflow (e.g., 'Premium Roofing Process')"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-2">
            Give your workflow a descriptive name that reflects your business process.
          </p>
        </div>
      )}
    </div>
  );

  // Step 2: Workflow Preview/Configuration
  const WorkflowPreviewStep = () => {
    const selectedWorkflowOption = WORKFLOW_OPTIONS.find(opt => opt.id === selectedOption);
    
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Workflow Setup Complete!
          </h2>
          <p className="text-lg text-gray-600">
            Your {selectedWorkflowOption?.title.toLowerCase()} is ready to use.
          </p>
        </div>

        {/* Workflow Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-12 h-12 ${selectedWorkflowOption?.color} rounded-lg flex items-center justify-center`}>
              <selectedWorkflowOption.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedOption === 'create' && customWorkflowName 
                  ? customWorkflowName 
                  : selectedWorkflowOption?.title
                }
              </h3>
              <p className="text-gray-600">
                {selectedWorkflowOption?.description}
              </p>
            </div>
          </div>

          {/* Workflow Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">15</div>
              <div className="text-sm text-gray-600">Workflow Phases</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">86</div>
              <div className="text-sm text-gray-600">Line Items</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">Auto</div>
              <div className="text-sm text-gray-600">Alert System</div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-3">What happens next:</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 mr-2 text-blue-600" />
                Your workflow system will be activated
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 mr-2 text-blue-600" />
                All projects will use this workflow structure
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 mr-2 text-blue-600" />
                Automatic alerts will be enabled for line items
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 mr-2 text-blue-600" />
                You can customize workflows anytime in Settings
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!selectedOption) return;
      
      if (selectedOption === 'create' && !customWorkflowName.trim()) {
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Here we would normally create/configure the workflow via API
        // For now, we'll simulate the process
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentStep(2);
      } catch (error) {
        console.error('Error setting up workflow:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Complete onboarding
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Save the workflow choice and complete onboarding
      const onboardingData = {
        workflowOption: selectedOption,
        customWorkflowName: selectedOption === 'create' ? customWorkflowName : null,
        completedAt: new Date().toISOString()
      };
      
      // Here we would save this to the user's profile
      console.log('Completing onboarding with:', onboardingData);
      
      // Mark onboarding as complete
      if (onComplete) {
        onComplete(onboardingData);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      if (!selectedOption) return false;
      if (selectedOption === 'create' && !customWorkflowName.trim()) return false;
      return true;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      {/* Progress Bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-[var(--color-primary-blueprint-blue)] text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className="text-sm font-medium text-gray-700">Workflow Selection</span>
          </div>
          <div className={`flex-1 h-1 rounded ${currentStep >= 2 ? 'bg-[var(--color-primary-blueprint-blue)]' : 'bg-gray-200'}`}></div>
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-[var(--color-primary-blueprint-blue)] text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className="text-sm font-medium text-gray-700">Setup Complete</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {currentStep === 1 ? <WorkflowSelectionStep /> : <WorkflowPreviewStep />}
      </div>

      {/* Navigation */}
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <button
          onClick={currentStep === 1 ? onBack : () => setCurrentStep(1)}
          className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed() || isLoading}
          className={`
            flex items-center space-x-2 px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300
            transform hover:scale-105 disabled:transform-none
            ${canProceed() && !isLoading
              ? 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Setting up...</span>
            </>
          ) : currentStep === 1 ? (
            <>
              <span>Continue</span>
              <ArrowRightIcon className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Complete Setup</span>
              <CheckCircleIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OwnerOnboardingFlow;