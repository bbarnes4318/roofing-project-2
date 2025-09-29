import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ModernCompanyDocumentsPage from './ModernCompanyDocumentsPage';
import { 
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline';

const DragDropDemo = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [colorMode, setColorMode] = useState(false);

  const dragDropFeatures = [
    {
      icon: '🔄',
      title: 'Reorder Items',
      description: 'Drag any file or folder to reorder them within the current folder',
      example: 'Drag "contract.pdf" between other files to change its position'
    },
    {
      icon: '📁',
      title: 'Move Between Folders',
      description: 'Drag items to different folders or the main area to move them',
      example: 'Drag files from "Project Files" to "Archive" folder'
    },
    {
      icon: '👀',
      title: 'Visual Feedback',
      description: 'See real-time visual indicators during drag operations',
      example: 'Green borders show valid drop zones, opacity changes show dragging'
    },
    {
      icon: '⚡',
      title: 'Instant Updates',
      description: 'Changes are applied immediately with success notifications',
      example: 'Toast notifications confirm successful moves and reorders'
    },
    {
      icon: '📱',
      title: 'Touch Support',
      description: 'Works on mobile devices with touch gestures',
      example: 'Long press and drag on tablets and phones'
    },
    {
      icon: '🎯',
      title: 'Smart Detection',
      description: 'Intelligent drop zone detection prevents invalid operations',
      example: 'Can\'t drop a folder into itself or create circular references'
    }
  ];

  const dragDropSteps = [
    {
      step: 1,
      title: 'Start Dragging',
      description: 'Click and hold any file or folder card to start dragging',
      icon: '🖱️'
    },
    {
      step: 2,
      title: 'See Visual Feedback',
      description: 'Notice the card becomes semi-transparent and shows drag preview',
      icon: '👁️'
    },
    {
      step: 3,
      title: 'Find Drop Zones',
      description: 'Look for green borders around valid drop targets',
      icon: '🎯'
    },
    {
      step: 4,
      title: 'Drop to Reorder',
      description: 'Drop on another item to reorder, or in empty space to move',
      icon: '📍'
    },
    {
      step: 5,
      title: 'Confirm Success',
      description: 'See the success notification and updated layout',
      icon: '✅'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Drag & Drop Demo</h1>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Enhanced
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setColorMode(!colorMode)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  colorMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {colorMode ? '🌙 Dark' : '☀️ Light'}
              </button>
              
              <button
                onClick={() => setShowDemo(!showDemo)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  showDemo 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-[var(--color-success-green)] text-white hover:bg-green-700'
                }`}
              >
                <HandRaisedIcon className="w-4 h-4 mr-2" />
                {showDemo ? 'Hide Demo' : 'Try Drag & Drop'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Interface */}
      {showDemo ? (
        <div className="h-screen">
          <DndProvider backend={HTML5Backend}>
            <ModernCompanyDocumentsPage colorMode={colorMode} />
          </DndProvider>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Introduction */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Enhanced Drag & Drop Functionality
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every file and folder can be dragged anywhere. Reorder items, move between folders, 
              and enjoy smooth visual feedback throughout the experience.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {dragDropFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{feature.description}</p>
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <strong>Example:</strong> {feature.example}
                </div>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-16">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              How Drag & Drop Works
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {dragDropSteps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
                    {step.icon}
                  </div>
                  <div className="w-8 h-8 bg-[var(--color-primary-blueprint-blue)] text-white rounded-full mx-auto mb-3 flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Drag & Drop Features</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Universal Dragging</h4>
                    <p className="text-sm text-gray-600">Every file and folder can be dragged</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Reordering</h4>
                    <p className="text-sm text-gray-600">Drag items to change their order within folders</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Cross-Folder Movement</h4>
                    <p className="text-sm text-gray-600">Move items between different folders</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Visual Feedback</h4>
                    <p className="text-sm text-gray-600">Real-time indicators show valid drop zones</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Touch Support</h4>
                    <p className="text-sm text-gray-600">Works on mobile and tablet devices</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Implementation Details</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">React DnD Integration</h4>
                  <p className="text-sm text-gray-600">
                    Uses react-dnd with HTML5 backend for smooth drag and drop operations
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">State Management</h4>
                  <p className="text-sm text-gray-600">
                    Optimistic updates with immediate UI feedback and error handling
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Visual Indicators</h4>
                  <p className="text-sm text-gray-600">
                    Green borders for valid drop zones, opacity changes for dragging state
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Accessibility</h4>
                  <p className="text-sm text-gray-600">
                    Keyboard navigation support and screen reader compatibility
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Experience Enhanced Drag & Drop?</h2>
            <p className="text-lg text-gray-600 mb-8">Try the interactive demo to see all features in action</p>
            <button
              onClick={() => setShowDemo(true)}
              className="px-8 py-4 bg-[var(--color-success-green)] text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
            >
              Launch Interactive Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropDemo;
