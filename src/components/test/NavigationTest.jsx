import React, { useState } from 'react';
import { useNavigation, useSectionNavigation } from '../../contexts/NavigationContext';
import BackButton, { HeaderBackButton, CardBackButton } from '../common/BackButton';

const NavigationTest = () => {
  const {
    currentContext,
    navigationStack,
    navigateWithContext,
    canNavigateBack,
    clearNavigationContext
  } = useNavigation();

  const {
    saveFilters,
    getSavedFilters,
    updateScrollPosition
  } = useSectionNavigation('Test Section');

  const [testFilters, setTestFilters] = useState({ search: '', phase: '' });

  const handleTestNavigation = () => {
    navigateWithContext('/test-page', {
      section: 'Test Section',
      type: 'project',
      projectId: 'test-123',
      projectName: 'Test Project',
      selectedData: { id: 'test-123', name: 'Test Project' },
      filters: testFilters
    });
  };

  const handleSaveFilters = () => {
    saveFilters(testFilters);
    alert('Filters saved!');
  };

  const handleRestoreFilters = () => {
    const saved = getSavedFilters();
    setTestFilters(saved);
    alert('Filters restored!');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Navigation System Test</h2>
      
      {/* Current State Display */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Current Navigation State:</h3>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Current Context:</strong> {currentContext ? JSON.stringify(currentContext, null, 2) : 'None'}
          </div>
          <div>
            <strong>Navigation Stack Depth:</strong> {navigationStack.length}
          </div>
          <div>
            <strong>Can Navigate Back:</strong> {canNavigateBack() ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      {/* Back Button Tests */}
      <div className="mb-6 p-4 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Back Button Tests:</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Header Back Button:</label>
            <HeaderBackButton />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Card Back Button:</label>
            <CardBackButton />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Default Back Button:</label>
            <BackButton />
          </div>
        </div>
      </div>

      {/* Filter Test */}
      <div className="mb-6 p-4 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Filter Persistence Test:</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search Filter:</label>
            <input
              type="text"
              value={testFilters.search}
              onChange={(e) => setTestFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter search term..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phase Filter:</label>
            <select
              value={testFilters.phase}
              onChange={(e) => setTestFilters(prev => ({ ...prev, phase: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Phases</option>
              <option value="lead">Lead</option>
              <option value="approved">Approved</option>
              <option value="execution">Execution</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveFilters}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save Filters
            </button>
            <button
              onClick={handleRestoreFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Restore Filters
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Test */}
      <div className="mb-6 p-4 border border-purple-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Navigation Test:</h3>
        <div className="space-y-4">
          <button
            onClick={handleTestNavigation}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Test Context Navigation
          </button>
          <button
            onClick={() => updateScrollPosition(Math.random() * 1000)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Save Random Scroll Position
          </button>
          <button
            onClick={clearNavigationContext}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear Navigation Context
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="text-center">
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
          canNavigateBack() 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            canNavigateBack() ? 'bg-green-500' : 'bg-gray-500'
          }`}></div>
          Navigation System {canNavigateBack() ? 'Active' : 'Inactive'}
        </div>
      </div>
    </div>
  );
};

export default NavigationTest;