import React, { memo } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useNavigation } from '../../contexts/NavigationContext';
import { useNavigationHistory } from '../../hooks/useNavigationHistory';

const BackButton = memo(({ 
  className = '',
  variant = 'default',
  showLabel = true,
  customLabel = null,
  onClick = null,
  disabled = false,
  colorMode = false,
  size = 'medium',
  preservePosition = true
}) => {
  const { 
    navigateBack, 
    canNavigateBack, 
    currentContext, 
    getPreviousContext 
  } = useNavigation();
  
  const { 
    goBack, 
    getPrevious, 
    canGoBack, 
    restorePageState,
    capturePageState 
  } = useNavigationHistory();

  // Enhanced click handler with position preservation
  const handleClick = () => {
    if (onClick) {
      // Capture current state before custom navigation
      if (preservePosition) {
        capturePageState();
      }
      onClick();
      return;
    }
    
    // Try navigation history first (preferred for position preservation)
    if (preservePosition && canGoBack()) {
      const previousNavigation = goBack();
      if (previousNavigation) {
        // Navigation history handles position restoration automatically
        return;
      }
    }
    
    // Fallback to context navigation
    if (canNavigateBack()) {
      navigateBack();
    } else {
      // Final fallback to browser back
      window.history.back();
    }
  };

  // Enhanced contextual label with navigation history integration
  const getContextualLabel = () => {
    if (customLabel) return customLabel;
    if (!showLabel) return null;

    // Try to get label from navigation history first
    const historyPrevious = getPrevious();
    if (historyPrevious?.pageName && preservePosition) {
      return `Back to ${historyPrevious.pageName}`;
    }

    // Fallback to context-based labels
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

  // Enhanced style variants with color mode and size support
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-1 text-xs';
      case 'large':
        return 'px-5 py-3 text-base';
      default: // medium
        return 'px-3 py-2 text-sm';
    }
  };

  const getVariantStyles = () => {
    const baseStyles = `inline-flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${getSizeClasses()}`;
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} ${colorMode 
          ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 disabled:bg-slate-600' 
          : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 disabled:bg-gray-300'} rounded-lg disabled:cursor-not-allowed`;
      
      case 'secondary':
        return `${baseStyles} ${colorMode 
          ? 'bg-slate-600 hover:bg-slate-700 text-white focus:ring-slate-500 disabled:bg-slate-800 disabled:text-slate-500' 
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-400'} rounded-lg disabled:cursor-not-allowed`;
      
      case 'ghost':
        return `${baseStyles} ${colorMode 
          ? 'text-slate-300 hover:text-white hover:bg-slate-700 focus:ring-slate-500 disabled:text-slate-600' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500 disabled:text-gray-400'} rounded disabled:cursor-not-allowed`;
      
      case 'minimal':
        return `${baseStyles} ${colorMode 
          ? 'text-blue-400 hover:text-blue-300 focus:ring-blue-500 disabled:text-slate-600' 
          : 'text-blue-600 hover:text-blue-800 focus:ring-blue-500 disabled:text-gray-400'} disabled:cursor-not-allowed`;
      
      default: // 'default'
        return `${baseStyles} ${colorMode 
          ? 'bg-slate-700 border border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-slate-500 focus:ring-blue-500 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500' 
          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-blue-500 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400'} rounded-md disabled:cursor-not-allowed`;
    }
  };

  // Enhanced disabled check with navigation history
  const isDisabled = disabled || (!onClick && !canNavigateBack() && !canGoBack());

  const label = getContextualLabel();

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'h-3 w-3';
      case 'large':
        return 'h-6 w-6';
      default: // medium
        return 'h-4 w-4';
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`${getVariantStyles()} ${className}`}
      title={label || 'Go back'}
      aria-label={label || 'Go back'}
    >
      <ChevronLeftIcon 
        className={`${getIconSize()} ${label ? 'mr-2' : ''}`}
        aria-hidden="true" 
      />
      {label && (
        <span className="font-medium">
          {label}
        </span>
      )}
    </button>
  );
});

// Responsive BackButton that adapts to screen size
export const ResponsiveBackButton = memo((props) => {
  return (
    <>
      {/* Mobile: Show only icon */}
      <div className="block sm:hidden">
        <BackButton 
          {...props}
          size="small"
          showLabel={false}
          className={`${props.className || ''}`}
        />
      </div>
      
      {/* Tablet: Show icon + short text */}
      <div className="hidden sm:block lg:hidden">
        <BackButton 
          {...props}
          size="medium"
          showLabel={true}
          customLabel="Back"
          className={`${props.className || ''}`}
        />
      </div>
      
      {/* Desktop: Show full text */}
      <div className="hidden lg:block">
        <BackButton 
          {...props}
          size="medium"
          showLabel={true}
          className={`${props.className || ''}`}
        />
      </div>
    </>
  );
});

// Specialized back button components for different contexts
export const HeaderBackButton = memo(({ className = '', colorMode = false, ...props }) => (
  <BackButton
    variant="ghost"
    size="medium"
    colorMode={colorMode}
    className={`mr-4 ${className}`}
    {...props}
  />
));

export const CardBackButton = memo(({ className = '', colorMode = false, ...props }) => (
  <BackButton
    variant="secondary"
    size="medium"
    colorMode={colorMode}
    className={`mb-4 ${className}`}
    {...props}
  />
));

export const MinimalBackButton = memo(({ className = '', showLabel = false, colorMode = false, ...props }) => (
  <BackButton
    variant="minimal"
    size="small"
    showLabel={showLabel}
    colorMode={colorMode}
    className={className}
    {...props}
  />
));

// Floating BackButton for overlay/modal scenarios
export const FloatingBackButton = memo(({ position = "top-left", colorMode = false, ...props }) => {
  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4", 
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4"
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <BackButton
        {...props}
        variant="primary"
        size="medium"
        colorMode={colorMode}
        className={`shadow-lg ${props.className || ''}`}
      />
    </div>
  );
});

// Compact BackButton for tight spaces
export const CompactBackButton = memo(({ colorMode = false, ...props }) => {
  return (
    <BackButton
      {...props}
      size="small"
      showLabel={false}
      variant="ghost"
      colorMode={colorMode}
      className={`rounded-full ${props.className || ''}`}
    />
  );
});

// Context-aware back button that shows different styles based on current context
export const ContextAwareBackButton = memo(({ className = '', colorMode = false }) => {
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
      colorMode={colorMode}
      className={className}
    />
  );
});

// BackButton with breadcrumb context
export const BreadcrumbBackButton = memo(({ showBreadcrumbs = false, colorMode = false, ...props }) => {
  const { getBreadcrumbs } = useNavigationHistory();
  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex items-center gap-2">
      <BackButton colorMode={colorMode} {...props} />
      {showBreadcrumbs && breadcrumbs.length > 1 && (
        <div className={`hidden md:flex items-center gap-1 text-sm ${
          colorMode ? 'text-slate-400' : 'text-gray-500'
        }`}>
          {breadcrumbs.slice(-3).map((crumb, index, arr) => (
            <React.Fragment key={crumb.id}>
              {index > 0 && <span>/</span>}
              <span className={index === arr.length - 1 ? 
                colorMode ? "font-medium text-slate-300" : "font-medium text-gray-700" : ""
              }>
                {crumb.pageName}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
});

// Set display names for better debugging
BackButton.displayName = 'BackButton';
ResponsiveBackButton.displayName = 'ResponsiveBackButton';
HeaderBackButton.displayName = 'HeaderBackButton';
CardBackButton.displayName = 'CardBackButton';
MinimalBackButton.displayName = 'MinimalBackButton';
FloatingBackButton.displayName = 'FloatingBackButton';
CompactBackButton.displayName = 'CompactBackButton';
ContextAwareBackButton.displayName = 'ContextAwareBackButton';
BreadcrumbBackButton.displayName = 'BreadcrumbBackButton';

export default BackButton;