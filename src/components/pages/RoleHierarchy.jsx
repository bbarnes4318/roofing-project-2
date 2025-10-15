import React, { useState } from 'react';

const RoleHierarchy = ({ colorMode, onHierarchyChange }) => {
  const [hierarchy, setHierarchy] = useState([
    { 
      id: 'admin', 
      name: 'Administrator', 
      level: 100, 
      color: 'red',
      description: 'Full system access and control',
      permissions: ['All permissions'],
      canManage: ['All roles']
    },
    { 
      id: 'manager', 
      name: 'Manager', 
      level: 80, 
      color: 'purple',
      description: 'Management and oversight capabilities',
      permissions: ['Project management', 'User oversight', 'Financial access'],
      canManage: ['Project Manager', 'Foreman', 'Worker', 'Client']
    },
    { 
      id: 'project_manager', 
      name: 'Project Manager', 
      level: 60, 
      color: 'blue',
      description: 'Project-specific management and coordination',
      permissions: ['Project control', 'Team coordination', 'Client communication'],
      canManage: ['Foreman', 'Worker']
    },
    { 
      id: 'foreman', 
      name: 'Foreman', 
      level: 40, 
      color: 'green',
      description: 'Field operations and team supervision',
      permissions: ['Field operations', 'Team supervision', 'Quality control'],
      canManage: ['Worker']
    },
    { 
      id: 'worker', 
      name: 'Worker', 
      level: 20, 
      color: 'orange',
      description: 'Basic operational access and task execution',
      permissions: ['Task execution', 'Basic reporting', 'Document access'],
      canManage: []
    },
    { 
      id: 'client', 
      name: 'Client', 
      level: 10, 
      color: 'gray',
      description: 'Client portal access and project visibility',
      permissions: ['Project viewing', 'Communication', 'Document access'],
      canManage: []
    }
  ]);

  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    setDragOverItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDrop = (e, targetItem) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      return;
    }

    // Reorder hierarchy based on drop
    const newHierarchy = [...hierarchy];
    const draggedIndex = newHierarchy.findIndex(item => item.id === draggedItem.id);
    const targetIndex = newHierarchy.findIndex(item => item.id === targetItem.id);
    
    // Remove dragged item
    const [draggedRole] = newHierarchy.splice(draggedIndex, 1);
    
    // Insert at new position
    newHierarchy.splice(targetIndex, 0, draggedRole);
    
    // Update levels based on new order
    const updatedHierarchy = newHierarchy.map((item, index) => ({
      ...item,
      level: 100 - (index * 15) // Decrease by 15 for each level
    }));

    setHierarchy(updatedHierarchy);
    if (onHierarchyChange) {
      onHierarchyChange(updatedHierarchy);
    }
  };

  const getRoleColor = (color) => {
    const colorMap = {
      red: colorMode ? 'bg-red-900/30 border-red-500/50 text-red-300' : 'bg-red-50 border-red-300 text-red-900',
      purple: colorMode ? 'bg-purple-900/30 border-purple-500/50 text-purple-300' : 'bg-purple-50 border-purple-300 text-purple-900',
      blue: colorMode ? 'bg-blue-900/30 border-blue-500/50 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-900',
      green: colorMode ? 'bg-green-900/30 border-green-500/50 text-green-300' : 'bg-green-50 border-green-300 text-green-900',
      orange: colorMode ? 'bg-orange-900/30 border-orange-500/50 text-orange-300' : 'bg-orange-50 border-orange-300 text-orange-900',
      gray: colorMode ? 'bg-gray-800/50 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-400 text-gray-800'
    };
    return colorMap[color] || colorMap.gray;
  };

  const getLevelColor = (level) => {
    if (level >= 80) return colorMode ? 'text-red-400' : 'text-red-600';
    if (level >= 60) return colorMode ? 'text-purple-400' : 'text-purple-600';
    if (level >= 40) return colorMode ? 'text-blue-400' : 'text-blue-600';
    if (level >= 20) return colorMode ? 'text-green-400' : 'text-green-600';
    return colorMode ? 'text-gray-400' : 'text-gray-600';
  };

  return (
    <div className={`border rounded-xl ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${colorMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              🏗️ Role Hierarchy
            </h3>
            <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Drag roles to reorder hierarchy. Higher roles can manage lower roles.
            </p>
          </div>
          <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Drag to reorder
          </div>
        </div>
      </div>

      {/* Hierarchy List */}
      <div className="p-4 space-y-3">
        {hierarchy.map((role, index) => (
          <div
            key={role.id}
            draggable
            onDragStart={(e) => handleDragStart(e, role)}
            onDragOver={(e) => handleDragOver(e, role)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, role)}
            className={`
              p-4 rounded-lg border-2 cursor-move transition-all duration-200
              ${getRoleColor(role.color)}
              ${draggedItem?.id === role.id ? 'opacity-50 scale-95' : ''}
              ${dragOverItem?.id === role.id ? 'ring-2 ring-blue-500' : ''}
              hover:shadow-lg
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    colorMode ? 'bg-white/20' : 'bg-white/80'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{role.name}</div>
                    <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Level {role.level}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {role.description}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {role.permissions.slice(0, 3).map((permission, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded text-xs ${
                          colorMode 
                            ? 'bg-white/10 text-white' 
                            : 'bg-white/60 text-gray-700'
                        }`}
                      >
                        {permission}
                      </span>
                    ))}
                    {role.permissions.length > 3 && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        colorMode 
                          ? 'bg-white/10 text-white' 
                          : 'bg-white/60 text-gray-700'
                      }`}>
                        +{role.permissions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className={`text-sm font-bold ${getLevelColor(role.level)}`}>
                    {role.level}
                  </div>
                  <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Level
                  </div>
                </div>
                
                {role.canManage.length > 0 && (
                  <div className="text-right">
                    <div className={`text-xs ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Can manage:
                    </div>
                    <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {role.canManage.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hierarchy Rules */}
      <div className={`p-4 border-t ${colorMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
        <h4 className={`font-semibold text-sm mb-2 ${colorMode ? 'text-white' : 'text-gray-900'}`}>
          Hierarchy Rules
        </h4>
        <div className={`text-xs space-y-1 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <p>• Higher roles can manage and assign lower roles</p>
          <p>• Role levels determine permission inheritance</p>
          <p>• Administrators have full system access</p>
          <p>• Clients have read-only access to their projects</p>
        </div>
      </div>
    </div>
  );
};

export default RoleHierarchy;
