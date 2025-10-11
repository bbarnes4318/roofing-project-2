import React, { useState } from 'react';

const GranularTimingControls = ({ 
  colorMode, 
  timing, 
  onTimingChange, 
  showFollowUp = false, 
  followUpTiming, 
  onFollowUpTimingChange,
  label = "Timing"
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTimingChange = (field, value) => {
    const newTiming = { ...timing, [field]: parseInt(value) || 0 };
    onTimingChange(newTiming);
  };

  const handleFollowUpTimingChange = (field, value) => {
    const newFollowUpTiming = { ...followUpTiming, [field]: parseInt(value) || 0 };
    onFollowUpTimingChange(newFollowUpTiming);
  };

  const formatTimingDisplay = (timing) => {
    const parts = [];
    if (timing.days > 0) parts.push(`${timing.days} day${timing.days !== 1 ? 's' : ''}`);
    if (timing.hours > 0) parts.push(`${timing.hours} hour${timing.hours !== 1 ? 's' : ''}`);
    if (timing.minutes > 0) parts.push(`${timing.minutes} minute${timing.minutes !== 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(', ') : 'No timing set';
  };

  return (
    <div className="space-y-3">
      {/* Main Timing Controls */}
      <div className="border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <label className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              colorMode 
                ? 'text-blue-400 hover:bg-blue-900' 
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            {showAdvanced ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        {!showAdvanced ? (
          <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {formatTimingDisplay(timing)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Days
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={timing.days}
                onChange={(e) => handleTimingChange('days', e.target.value)}
                className={`w-full p-2 rounded border text-sm ${
                  colorMode 
                    ? 'bg-[#181f3a] border-[#3b82f6] text-white' 
                    : 'border-gray-300 bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Hours
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={timing.hours}
                onChange={(e) => handleTimingChange('hours', e.target.value)}
                className={`w-full p-2 rounded border text-sm ${
                  colorMode 
                    ? 'bg-[#181f3a] border-[#3b82f6] text-white' 
                    : 'border-gray-300 bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={timing.minutes}
                onChange={(e) => handleTimingChange('minutes', e.target.value)}
                className={`w-full p-2 rounded border text-sm ${
                  colorMode 
                    ? 'bg-[#181f3a] border-[#3b82f6] text-white' 
                    : 'border-gray-300 bg-white'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Follow-up Timing Controls (Optional) */}
      {showFollowUp && (
        <div className="border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <label className={`text-sm font-semibold ${colorMode ? 'text-white' : 'text-gray-800'}`}>
              Follow-up Timing (Optional)
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={followUpTiming.enabled}
                onChange={(e) => onFollowUpTimingChange({ ...followUpTiming, enabled: e.target.checked })}
                className="mr-2"
              />
              <span className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Override default follow-up timing
              </span>
            </div>
          </div>
          
          {followUpTiming.enabled && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Days
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={followUpTiming.days}
                  onChange={(e) => handleFollowUpTimingChange('days', e.target.value)}
                  className={`w-full p-2 rounded border text-sm ${
                    colorMode 
                      ? 'bg-[#181f3a] border-[#3b82f6] text-white' 
                      : 'border-gray-300 bg-white'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Hours
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={followUpTiming.hours}
                  onChange={(e) => handleFollowUpTimingChange('hours', e.target.value)}
                  className={`w-full p-2 rounded border text-sm ${
                    colorMode 
                      ? 'bg-[#181f3a] border-[#3b82f6] text-white' 
                      : 'border-gray-300 bg-white'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Minutes
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={followUpTiming.minutes}
                  onChange={(e) => handleFollowUpTimingChange('minutes', e.target.value)}
                  className={`w-full p-2 rounded border text-sm ${
                    colorMode 
                      ? 'bg-[#181f3a] border-[#3b82f6] text-white' 
                      : 'border-gray-300 bg-white'
                  }`}
                />
              </div>
            </div>
          )}
          
          {followUpTiming.enabled && (
            <div className="mt-2">
              <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Follow-up will be sent: {formatTimingDisplay(followUpTiming)} after creation
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GranularTimingControls;
