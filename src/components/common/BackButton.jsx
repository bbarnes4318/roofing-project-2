import React from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useNavigation } from '../../contexts/NavigationContext';

const BackButton = ({ 
  className = '',
  variant = 'default',
  showLabel = true,
  customLabel = null,
  onClick = null,
  disabled = false
}) => {
  const { 
    navigateBack, 
    canNavigateBack, 
    currentContext, 
    getPreviousContext 
  } = useNavigation();

  // If custom onClick is provided, use it instead of context navigation
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    
    if (canNavigateBack()) {
      navigateBack();
    }
  };

  // Generate contextual label based on previous context
  const getContextualLabel = () => {
    if (customLabel) return customLabel;
    if (!showLabel) return null;

    const previousContext = getPreviousContext();
    
    if (!previousContext) {
      return 'Back to Dashboard';
    }

    switch (previousContext.section) {
      case 'Current Projects by Phase':
        if (previousContext.selectedPhase) {
          return `Back to ${previousContext.selectedPhase} Projects`;
        }
        return 'Back to Projects by Phase';
      
      case 'My Project Messages':
        if (previousContext.type === 'message' && previousContext.selectedData) {
          return `Back to Messages`;
        }
        return 'Back to Project Messages';
      
      case 'Current Alerts':
        if (previousContext.type === 'alert' && previousContext.selectedData) {
          return `Back to Alerts`;
        }
        return 'Back to Current Alerts';
      
      case 'Current Project Access':
        if (previousContext.type === 'project-cube' && previousContext.selectedData) {
          return `Back to Project Access`;
        }
        return 'Back to Project Access';
      
      default:
        return 'Back';
    }
  };

  // Style variants
  const getVariantStyles = () => {
    const baseStyles = 'inline-flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed`;
      
      case 'secondary':
        return `${baseStyles} px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400`;
      
      case 'ghost':
        return `${baseStyles} px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded focus:ring-gray-500 disabled:text-gray-400 disabled:cursor-not-allowed`;
      
      case 'minimal':
        return `${baseStyles} text-blue-600 hover:text-blue-800 focus:ring-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed`;
      
      default: // 'default'
        return `${baseStyles} px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-blue-500 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed`;
    }
  };

  // Check if button should be disabled
  const isDisabled = disabled || (!onClick && !canNavigateBack());

  const label = getContextualLabel();

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`${getVariantStyles()} ${className}`}
      title={label || 'Go back'}
    >
      <ChevronLeftIcon 
        className={`h-5 w-5 ${label ? 'mr-2' : ''}`}
        aria-hidden="true" 
      />
      {label && (
        <span className="text-sm font-medium">
          {label}
        </span>
      )}
    </button>
  );
};

// Specialized back button components for different contexts
export const HeaderBackButton = ({ className = '' }) => (
  <BackButton
    variant="ghost"
    className={`mr-4 ${className}`}
  />
);

export const CardBackButton = ({ className = '' }) => (
  <BackButton
    variant="secondary"
    className={`mb-4 ${className}`}
  />
);

export const MinimalBackButton = ({ className = '', showLabel = false }) => (
  <BackButton
    variant="minimal"
    showLabel={showLabel}
    className={className}
  />
);

// Context-aware back button that shows different styles based on current context
export const ContextAwareBackButton = ({ className = '' }) => {
  const { currentContext } = useNavigation();

  if (!currentContext) {
    return null;
  }

  // Choose variant based on context type
  const getContextVariant = () => {
    switch (currentContext.type) {
      case 'project':
        return 'primary';
      case 'message':
        return 'secondary';
      case 'alert':
        return 'ghost';
      case 'project-cube':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <BackButton
      variant={getContextVariant()}
      className={className}
    />
  );
};

export default BackButton;