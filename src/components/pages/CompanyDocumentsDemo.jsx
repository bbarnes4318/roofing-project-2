import React, { useState } from 'react';
import ModernCompanyDocumentsPage from './ModernCompanyDocumentsPage';
import { 
  EyeIcon, 
  CodeBracketIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const CompanyDocumentsDemo = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [colorMode, setColorMode] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const features = [
    {
      icon: '🎨',
      title: 'Modern Design',
      description: 'Clean, polished interface inspired by top SaaS tools like Notion and ClickUp'
    },
    {
      icon: '📱',
      title: 'Fully Responsive',
      description: 'Optimized for mobile, tablet, and desktop with adaptive layouts'
    },
    {
      icon: '🔍',
      title: 'Smart Search',
      description: 'Real-time search with instant filtering and intelligent results'
    },
    {
      icon: '📁',
      title: 'Intuitive Navigation',
      description: 'Breadcrumb navigation and smooth folder transitions'
    },
    {
      icon: '⚡',
      title: 'Drag & Drop',
      description: 'Seamless file uploads with visual feedback and progress tracking'
    },
    {
      icon: '🎯',
      title: 'Bulk Actions',
      description: 'Multi-select with bulk operations for efficient document management'
    },
    {
      icon: '⭐',
      title: 'Favorites',
      description: 'Quick access to frequently used documents and folders'
    },
    {
      icon: '🔄',
      title: 'Dual Views',
      description: 'Switch between grid and list views for different workflows'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Company Documents</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                Redesigned
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
                onClick={() => setShowCode(!showCode)}
                className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CodeBracketIcon className="w-4 h-4 mr-2" />
                {showCode ? 'Hide Code' : 'Show Code'}
              </button>
              
              <button
                onClick={() => setShowDemo(!showDemo)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  showDemo 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-[var(--color-primary-blueprint-blue)] text-white hover:bg-blue-700'
                }`}
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                {showDemo ? 'Hide Demo' : 'View Demo'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      {!showDemo && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Modern Document Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A complete redesign of the Company Documents section with modern UI patterns, 
              enhanced usability, and professional polish that construction teams will love.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Before/After Comparison */}
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Before vs After
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center mb-4">
                  <XMarkIcon className="w-5 h-5 text-red-500 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900">Before (Current)</h4>
                </div>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    Dated folder icons and basic layout
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    Poor mobile responsiveness
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    Limited search functionality
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    No bulk actions or modern interactions
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    Basic styling that looks like internal tool
                  </li>
                </ul>
              </div>
              
              <div>
                <div className="flex items-center mb-4">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900">After (Redesigned)</h4>
                </div>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Modern card-based design with hover effects
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Fully responsive across all devices
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Real-time search with smart filtering
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Bulk actions, drag & drop, and context menus
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Professional SaaS-quality interface
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="mt-12 bg-gray-900 rounded-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-6">Technical Implementation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold mb-4 text-blue-400">Technologies Used</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• React 18 with Hooks</li>
                  <li>• TailwindCSS for styling</li>
                  <li>• Heroicons for consistent iconography</li>
                  <li>• React DnD for drag & drop</li>
                  <li>• React Hot Toast for notifications</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4 text-blue-400">Key Features</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• Modular component architecture</li>
                  <li>• Responsive grid/list view toggle</li>
                  <li>• Real-time search and filtering</li>
                  <li>• Breadcrumb navigation</li>
                  <li>• Bulk selection and actions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Interface */}
      {showDemo && (
        <div className="h-screen">
          <ModernCompanyDocumentsPage colorMode={colorMode} />
        </div>
      )}

      {/* Code Display */}
      {showCode && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">ModernCompanyDocumentsPage.jsx</h3>
              <button
                onClick={() => navigator.clipboard.writeText('Code copied!')}
                className="px-3 py-1 bg-[var(--color-primary-blueprint-blue)] text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Copy Code
              </button>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm">
                <code>{`// Modern Company Documents Page Component
// Features: Responsive design, drag & drop, search, bulk actions
// Built with React 18, TailwindCSS, and modern UI patterns

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
// ... (full implementation available in ModernCompanyDocumentsPage.jsx)`}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDocumentsDemo;
