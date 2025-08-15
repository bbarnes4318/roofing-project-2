import React, { useState } from 'react';
import { 
  UserGroupIcon, 
  WrenchScrewdriverIcon, 
  BuildingOfficeIcon, 
  UserCircleIcon, 
  ClipboardDocumentListIcon 
} from '@heroicons/react/24/outline';

const AVAILABLE_ROLES = [
  {
    id: 'ADMIN',
    name: 'Administration',
    description: 'Manage company settings, users, and overall system configuration',
    icon: BuildingOfficeIcon,
    color: 'bg-purple-500',
    features: ['User Management', 'System Settings', 'Financial Controls', 'Company Configuration']
  },
  {
    id: 'FIELD_DIRECTOR',
    name: 'Field Director',
    description: 'Oversee field operations, crew management, and on-site project execution',
    icon: WrenchScrewdriverIcon,
    color: 'bg-orange-500',
    features: ['Crew Management', 'Safety Oversight', 'Quality Control', 'Equipment Coordination']
  },
  {
    id: 'OFFICE_STAFF',
    name: 'Office Staff',
    description: 'Handle customer communications, scheduling, and administrative tasks',
    icon: ClipboardDocumentListIcon,
    color: 'bg-blue-500',
    features: ['Customer Service', 'Scheduling', 'Documentation', 'Communication']
  },
  {
    id: 'OWNER',
    name: 'Owner',
    description: 'Full system access with advanced workflow customization and business controls',
    icon: UserCircleIcon,
    color: 'bg-green-500',
    features: ['Complete Access', 'Workflow Design', 'Business Analytics', 'Strategic Planning'],
    isOwner: true
  },
  {
    id: 'PROJECT_MANAGER',
    name: 'Project Manager',
    description: 'Coordinate project workflows, manage timelines, and oversee project delivery',
    icon: UserGroupIcon,
    color: 'bg-indigo-500',
    features: ['Project Coordination', 'Timeline Management', 'Resource Planning', 'Client Relations']
  }
];

const RoleSelectionScreen = ({ onRoleSelected, loading = false }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [hoveredRole, setHoveredRole] = useState(null);

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
  };

  const handleContinue = () => {
    if (selectedRole && onRoleSelected) {
      onRoleSelected(selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6">
            <UserGroupIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Kenstruction
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Let's set up your account by selecting your role. This helps us customize your experience and provide the right tools for your work.
          </p>
        </div>

        {/* Role Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {AVAILABLE_ROLES.map((role) => {
            const IconComponent = role.icon;
            const isSelected = selectedRole === role.id;
            const isHovered = hoveredRole === role.id;
            
            return (
              <div
                key={role.id}
                className={`
                  relative bg-white rounded-xl shadow-lg border-2 transition-all duration-300 cursor-pointer
                  transform hover:scale-105 hover:shadow-xl
                  ${isSelected 
                    ? 'border-blue-500 ring-4 ring-blue-200 shadow-xl scale-105' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${role.isOwner ? 'ring-2 ring-green-200' : ''}
                `}
                onClick={() => handleRoleSelect(role.id)}
                onMouseEnter={() => setHoveredRole(role.id)}
                onMouseLeave={() => setHoveredRole(null)}
              >
                {/* Owner Badge */}
                {role.isOwner && (
                  <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    RECOMMENDED
                  </div>
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                <div className="p-6">
                  {/* Role Icon */}
                  <div className={`w-16 h-16 ${role.color} rounded-lg flex items-center justify-center mb-4 mx-auto transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  {/* Role Name */}
                  <h3 className="text-xl font-semibold text-gray-900 text-center mb-3">
                    {role.name}
                  </h3>

                  {/* Role Description */}
                  <p className="text-gray-600 text-sm text-center mb-4 min-h-[3rem]">
                    {role.description}
                  </p>

                  {/* Key Features */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Key Responsibilities
                    </p>
                    <div className="space-y-1">
                      {role.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></div>
                          {feature}
                        </div>
                      ))}
                      {role.features.length > 3 && (
                        <div className="text-xs text-gray-500 italic">
                          +{role.features.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            className={`
              px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300
              transform hover:scale-105 disabled:transform-none
              ${selectedRole && !loading
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-400 cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Setting up your account...</span>
              </div>
            ) : (
              'Continue'
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Don't worry, you can change your role later in the settings if needed.
          </p>
          {selectedRole === 'OWNER' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-green-700">
                <strong>Owner Role Selected:</strong> You'll be guided through a quick setup process to customize your workflows and get the most out of the system.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionScreen;