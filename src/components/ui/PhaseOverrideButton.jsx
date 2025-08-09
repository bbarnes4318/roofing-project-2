import React, { useState, useEffect } from 'react';
import { ChevronDownIcon } from '../common/Icons';
import { phaseOverrideService } from '../../services/api';

const PhaseOverrideButton = ({ project, onPhaseUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availablePhases, setAvailablePhases] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [reason, setReason] = useState('');

  // Get user ID from localStorage
  const getUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?._id || user?.id || 'demo-user-id';
    } catch {
      return 'demo-user-id';
    }
  };
  
  const userId = getUserId();

  useEffect(() => {
    fetchAvailablePhases();
    fetchCurrentPhase();
  }, [project]);

  const fetchAvailablePhases = async () => {
    try {
      const result = await phaseOverrideService.getAvailablePhases();
      
      if (result.success) {
        setAvailablePhases(result.data);
      }
    } catch (error) {
      console.error('❌ Error fetching available phases:', error);
    }
  };

  const fetchCurrentPhase = async () => {
    try {
      const projectId = project._id || project.id;
      const result = await phaseOverrideService.getProjectPhaseStatus(projectId);
      
      if (result.success) {
        setCurrentPhase(result.data.currentPhase);
      }
    } catch (error) {
      console.error('❌ Error fetching current phase:', error);
    }
  };

  const handlePhaseSelect = (phase) => {
    if (phase.value === currentPhase) {
      alert(`Project is already in ${phase.label} phase`);
      return;
    }
    
    setSelectedPhase(phase);
    setShowConfirmation(true);
    setIsOpen(false);
  };

  const handleConfirmOverride = async () => {
    if (!selectedPhase) return;
    
    setLoading(true);
    
    try {
      const projectId = project._id || project.id;
      
      const result = await phaseOverrideService.overrideProjectPhase(
        projectId,
        selectedPhase.value,
        reason || `Manual phase override to ${selectedPhase.label}`,
        userId
      );
      
      if (result.success) {
        console.log('✅ Phase override successful:', result);
        
        // Update current phase
        setCurrentPhase(selectedPhase.value);
        
        // Call parent handler
        if (onPhaseUpdate) {
          onPhaseUpdate(selectedPhase.value, reason);
        }
        
        // Show success message
        alert(`Project phase successfully updated to ${selectedPhase.label}`);
        
        // Close confirmation
        setShowConfirmation(false);
        setSelectedPhase(null);
        setReason('');
        
      } else {
        throw new Error(result.message || 'Failed to override phase');
      }
    } catch (error) {
      console.error('❌ Error overriding phase:', error);
      alert(`Failed to override phase: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOverride = () => {
    setShowConfirmation(false);
    setSelectedPhase(null);
    setReason('');
  };

  const getCurrentPhaseDisplay = () => {
    const phase = availablePhases.find(p => p.value === currentPhase);
    return phase ? phase.label : currentPhase || 'Unknown';
  };

  return (
    <div className="relative">
      {/* Override Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost flex items-center gap-1 text-xs font-medium !text-brand-primary"
        title="Override project phase"
      >
        <span>Override Phase</span>
        <ChevronDownIcon className={`w-3 h-3 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 modal-content z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-600 mb-1">Current Phase:</div>
            <div className="text-xs text-gray-800">{getCurrentPhaseDisplay()}</div>
          </div>
          
          <div className="p-2">
            <div className="text-xs font-medium text-gray-600 mb-2">Select New Phase:</div>
            <div className="space-y-1">
              {availablePhases.map(phase => (
                <button
                  key={phase.value}
                  onClick={() => handlePhaseSelect(phase)}
                  disabled={phase.value === currentPhase}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                    phase.value === currentPhase
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                  }`}
                  title={phase.description}
                >
                  <div className="font-medium">{phase.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{phase.description}</div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-2 border-t border-gray-100">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="modal-overlay z-50">
          <div className="modal-content max-w-md w-full mx-4">
            <div className="text-lg font-semibold text-gray-800 mb-2">
              Confirm Phase Override
            </div>
            
            <div className="text-sm text-gray-600 mb-4">
              Are you sure you want to override the project phase to{' '}
              <span className="font-medium text-gray-800">{selectedPhase?.label}</span>?
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <div className="text-xs font-medium text-yellow-800 mb-1">
                ⚠️ Warning
              </div>
              <div className="text-xs text-yellow-700">
                This will suppress alerts for skipped phases and create an automatic log entry.
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason (optional):
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for override..."
                className="input-modern text-xs resize-none"
                rows="3"
                maxLength="500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelOverride}
                className="btn-secondary flex-1 text-xs font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                disabled={loading}
                className="btn-primary flex-1 text-xs font-medium"
              >
                {loading ? 'Overriding...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default PhaseOverrideButton;