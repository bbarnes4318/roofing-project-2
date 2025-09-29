import React, { useState } from 'react';
import { ChartBarIcon, DocumentTextIcon, SparklesIcon, ClipboardDocumentCheckIcon, UserIcon, CogIcon } from '../common/Icons';

const AIToolsPage = ({ colorMode }) => {
  const [selectedTool, setSelectedTool] = useState(null);

  const aiTrainingTools = [
    {
      id: 'safety-training',
      title: 'Safety Training Simulator',
      description: 'Interactive AI-powered safety training scenarios that adapt to user responses and provide personalized learning experiences.',
      icon: <UserIcon className="w-6 h-6 text-red-600" />,
      image: '/safety.jpg',
      category: 'Safety',
      features: ['Interactive Scenarios', 'Adaptive Learning', 'Risk Assessment', 'Certification Tracking'],
      color: 'red'
    },
    {
      id: 'equipment-training',
      title: 'Equipment Operation Trainer',
      description: 'Virtual reality and AI-driven training for heavy equipment operation, maintenance procedures, and safety protocols.',
      icon: <CogIcon className="w-6 h-6 text-orange-600" />,
      image: '/equipment.jpg',
      category: 'Equipment',
      features: ['VR Simulations', 'Real-time Feedback', 'Skill Assessment', 'Maintenance Training'],
      color: 'orange'
    },
    {
      id: 'code-compliance',
      title: 'Code Compliance Trainer',
      description: 'AI-powered training system for building codes, regulations, and compliance requirements with interactive quizzes and scenarios.',
      icon: <ClipboardDocumentCheckIcon className="w-6 h-6 text-purple-600" />,
      image: '/compliance.jpg',
      category: 'Compliance',
      features: ['Code Updates', 'Interactive Quizzes', 'Scenario Training', 'Certification Prep'],
      color: 'purple'
    },
    {
      id: 'project-management',
      title: 'Project Management Academy',
      description: 'Comprehensive AI-driven training for project managers covering scheduling, budgeting, team leadership, and risk management.',
      icon: <ChartBarIcon className="w-6 h-6 text-green-600" />,
      image: '/pm.jpg',
      category: 'Management',
      features: ['Leadership Skills', 'Budget Management', 'Team Dynamics', 'Risk Mitigation'],
      color: 'green'
    },
    {
      id: 'quality-standards',
      title: 'Quality Standards Trainer',
      description: 'AI-powered training for quality control procedures, inspection protocols, and maintaining construction standards.',
      icon: <SparklesIcon className="w-6 h-6 text-teal-600" />,
      image: '/quality.jpg',
      category: 'Quality',
      features: ['Inspection Training', 'Standard Procedures', 'Quality Metrics', 'Defect Recognition'],
      color: 'teal'
    },
    {
      id: 'estimating-mastery',
      title: 'Estimating Mastery Program',
      description: 'Comprehensive AI-powered training for construction estimating, including Xactimate, cost analysis, and bid preparation.',
      icon: <DocumentTextIcon className="w-6 h-6 text-blue-600" />,
      image: '/estimating.jpg',
      category: 'Estimation',
      features: ['Xactimate Training', 'Cost Analysis', 'Bid Preparation', 'Market Research'],
      color: 'blue'
    }
  ];

  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
  };

  const handleBack = () => {
    setSelectedTool(null);
  };

  if (selectedTool) {
    return (
      <div className={`w-full max-w-5xl mx-auto px-2 py-2 ${colorMode ? 'bg-[#0f172a] text-white' : 'bg-white text-gray-800'}`}>
        <div className="mb-4">
          <button
            onClick={handleBack}
            className={`flex items-center gap-2 text-sm font-medium mb-3 px-3 py-2 rounded-lg transition-all duration-200 ${
              colorMode 
                ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20' 
                : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
            }`}
          >
            ← Back to AI Training Tools
          </button>
          <h1 className={`text-lg font-bold mb-2 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
            {selectedTool.title}
          </h1>
          <p className={`text-sm leading-relaxed ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {selectedTool.description}
          </p>
        </div>
        
        <div className={`rounded-lg shadow-lg p-6 text-center border ${
          colorMode 
            ? 'bg-[#1e293b] border-[#3b82f6]/30 text-white' 
            : 'bg-white border-gray-200 text-gray-800'
        }`}>
          <div className="text-4xl mb-4">🎓</div>
          <h2 className={`text-lg font-bold mb-2 ${colorMode ? 'text-white' : 'text-gray-800'}`}>
            Training Module Coming Soon
          </h2>
          <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
            This AI training module is currently in development and will be available soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-5xl mx-auto px-2 py-2 ${colorMode ? 'bg-[#0f172a] text-white' : 'bg-white text-gray-800'}`}>
      {/* Page Header */}
      <div className="mb-4">
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {aiTrainingTools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => handleToolSelect(tool)}
            className={`rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group overflow-hidden border ${
              colorMode 
                ? 'bg-[#1e293b] border-[#3b82f6]/30 hover:bg-[#232b4d]' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            {/* Tool Header Image */}
            <div className="h-32 relative overflow-hidden">
              <img 
                src={tool.image} 
                alt={tool.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 right-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full border backdrop-blur-sm ${
                  colorMode 
                    ? 'bg-[#1e293b]/80 text-gray-300 border-[#3b82f6]/30' 
                    : 'bg-white/80 text-gray-700 border-gray-200'
                }`}>
                  {tool.category}
                </span>
              </div>
            </div>

            {/* Tool Content */}
            <div className="p-3">
              <h3 className={`text-sm font-bold mb-2 transition-colors ${
                colorMode 
                  ? 'text-white group-hover:text-blue-400' 
                  : 'text-gray-900 group-hover:text-blue-600'
              }`}>
                {tool.title}
              </h3>
              <p className={`text-xs mb-3 leading-relaxed ${
                colorMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {tool.description}
              </p>

              {/* Features */}
              <div className="space-y-1 mb-3">
                {tool.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className={`flex items-center gap-1 text-xs ${
                    colorMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    {feature}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button className={`w-full font-semibold py-2 px-3 rounded-lg transition-all duration-200 text-xs ${
                colorMode 
                  ? 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700 text-white' 
                  : 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700 text-white'
              }`}>
                Get Information
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIToolsPage; 