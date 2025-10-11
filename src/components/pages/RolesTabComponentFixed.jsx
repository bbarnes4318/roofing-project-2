





import React, { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import toast from 'react-hot-toast';

const DragTypes = {
  USER: 'user'
};

const DraggableUser = ({ user, isAssigned = false, onRemove = null, colorMode, sourceRole = null }) => {
  const [{ isDragging }, drag] = useDrag({
    type: DragTypes.USER,
    item: () => ({ user, isAssigned, sourceRole }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={`
        flex items-center justify-between p-2 rounded cursor-move transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${isAssigned 
          ? (colorMode 
            ? 'bg-[#232b4d] border border-gray-600 text-white' 
            : 'bg-white border border-gray-300 text-gray-800'
          )
          : (colorMode 
            ? 'bg-[#232b4d] border border-gray-600 text-white hover:bg-[#2a3555]' 
            : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'
          )
        }
        hover:shadow-sm
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
          colorMode ? 'bg-[var(--color-primary-blueprint-blue)] text-white' : 'bg-blue-500 text-white'
        }`}>
          {user.firstName?.[0] || user.name?.[0] || '?'}
        </div>
        <div>
          <div className="font-medium text-sm">
            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
          </div>
          {user.email && (
            <div className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {user.email}
            </div>
          )}
        </div>
      </div>
      
      {/* Drag Handle */}
      <div className={`px-2 py-1 rounded text-xs font-medium ${
        colorMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      
      {isAssigned && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(user.id);
          }}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform ${
            colorMode 
              ? 'bg-red-900/50 text-red-300 hover:bg-red-800' 
              : 'bg-red-100 text-red-600 hover:bg-red-200'
          }`}
        >
          ×
        </button>
      )}
    </div>
  );
};

const CompactRoleDropZone = ({ roleType, roleName, icon, colorScheme, users, onAddUser, onRemoveUser, colorMode }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DragTypes.USER,
    drop: (item) => {
      // Allow dropping from any source (unassigned or assigned to another role)
      if (item.sourceRole !== roleType) {
        onAddUser(roleType, item.user, item.sourceRole);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  const getColorClasses = (scheme) => {
    const colorMap = {
      purple: {
        bg: colorMode ? 'bg-[#232b4d]' : 'bg-white',
        border: colorMode ? 'border-gray-600' : 'border-gray-300',
        hoverBg: colorMode ? 'bg-[#2a3555]' : 'bg-gray-50',
        hoverBorder: colorMode ? 'border-purple-400' : 'border-purple-400',
        text: colorMode ? 'text-white' : 'text-gray-900',
        subtext: colorMode ? 'text-gray-300' : 'text-gray-600',
        accent: 'purple'
      },
      orange: {
        bg: colorMode ? 'bg-[#232b4d]' : 'bg-white',
        border: colorMode ? 'border-gray-600' : 'border-gray-300',
        hoverBg: colorMode ? 'bg-[#2a3555]' : 'bg-gray-50',
        hoverBorder: colorMode ? 'border-orange-400' : 'border-orange-400',
        text: colorMode ? 'text-white' : 'text-gray-900',
        subtext: colorMode ? 'text-gray-300' : 'text-gray-600',
        accent: 'orange'
      },
      green: {
        bg: colorMode ? 'bg-[#232b4d]' : 'bg-white',
        border: colorMode ? 'border-gray-600' : 'border-gray-300',
        hoverBg: colorMode ? 'bg-[#2a3555]' : 'bg-gray-50',
        hoverBorder: colorMode ? 'border-green-400' : 'border-green-400',
        text: colorMode ? 'text-white' : 'text-gray-900',
        subtext: colorMode ? 'text-gray-300' : 'text-gray-600',
        accent: 'green'
      },
      red: {
        bg: colorMode ? 'bg-[#232b4d]' : 'bg-white',
        border: colorMode ? 'border-gray-600' : 'border-gray-300',
        hoverBg: colorMode ? 'bg-[#2a3555]' : 'bg-gray-50',
        hoverBorder: colorMode ? 'border-red-400' : 'border-red-400',
        text: colorMode ? 'text-white' : 'text-gray-900',
        subtext: colorMode ? 'text-gray-300' : 'text-gray-600',
        accent: 'red'
      },
      teal: {
        bg: colorMode ? 'bg-[#232b4d]' : 'bg-white',
        border: colorMode ? 'border-gray-600' : 'border-gray-300',
        hoverBg: colorMode ? 'bg-[#2a3555]' : 'bg-gray-50',
        hoverBorder: colorMode ? 'border-teal-400' : 'border-teal-400',
        text: colorMode ? 'text-white' : 'text-gray-900',
        subtext: colorMode ? 'text-gray-300' : 'text-gray-600',
        accent: 'teal'
      }
    };
    return colorMap[scheme] || colorMap.purple;
  };

  const colors = getColorClasses(colorScheme);

  return (
    <div
      ref={drop}
      className={`
        border border-dashed rounded-lg p-3 min-h-[120px] transition-all duration-200 shadow-sm
        ${isOver && canDrop 
          ? `${colors.hoverBg} ${colors.hoverBorder} shadow-md` 
          : `${colors.bg} ${colors.border}`
        }
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <h4 className={`font-semibold text-sm ${colors.text}`}>
          {roleName}
        </h4>
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          colorMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
        }`}>
          {users.length}
        </span>
      </div>

      <div className="space-y-1 max-h-24 overflow-y-auto">
        {users.length > 0 ? (
          users.map(user => (
            <div key={user.id} className={`flex items-center justify-between p-1.5 rounded text-xs border ${
              colorMode ? 'bg-[#232b4d] border-gray-600' : 'bg-white border-gray-300'
            }`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                  colorMode ? 'bg-[var(--color-primary-blueprint-blue)] text-white' : 'bg-blue-500 text-white'
                }`}>
                  {user.firstName?.[0] || user.name?.[0] || '?'}
                </div>
                <span className="font-medium text-xs truncate">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
                </span>
              </div>
              <button
                onClick={() => onRemoveUser(roleType, user.id)}
                className={`w-4 h-4 rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform ${
                  colorMode 
                    ? 'bg-red-900/50 text-red-300 hover:bg-red-800' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <div className={`
            text-center py-3 text-xs rounded border border-dashed
            ${colorMode 
              ? 'text-gray-400 border-gray-600' 
              : 'text-gray-500 border-gray-300'
            }
          `}>
            <div className="mb-1 text-sm">👤</div>
            Drop users here
          </div>
        )}
      </div>
    </div>
  );
};

const RolesTabComponentFixed = ({ 
  colorMode, 
  roleAssignments, 
  setRoleAssignments, 
  availableUsers, 
  saveRoleAssignments 
}) => {
  const [dragFeedback, setDragFeedback] = useState('');

  const handleAddUserToRole = async (roleType, user, sourceRole = null) => {
    try {
      setDragFeedback('Saving...');
      
      // Create new assignments
      let newAssignments = { ...roleAssignments };
      
      // Remove from source role if moving between roles
      if (sourceRole && sourceRole !== roleType) {
        newAssignments[sourceRole] = (newAssignments[sourceRole] || []).filter(u => u.id !== user.id);
      }
      
      // Add to target role (avoid duplicates)
      if (!newAssignments[roleType]) {
        newAssignments[roleType] = [];
      }
      
      if (!newAssignments[roleType].find(u => u.id === user.id)) {
        newAssignments[roleType] = [...newAssignments[roleType], user];
      }
      
      setRoleAssignments(newAssignments);
      
      // Auto-save the changes
      await saveRoleAssignments(newAssignments);
      
      const roleName = getRoleDisplayName(roleType);
      const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name;
      
      if (sourceRole && sourceRole !== roleType) {
        toast.success(`${userName} moved to ${roleName}`, { duration: 2000 });
      } else {
        toast.success(`${userName} assigned to ${roleName}`, { duration: 2000 });
      }
      
      setDragFeedback('');
    } catch (error) {
      console.error('Failed to save role assignments:', error);
      
      // Revert on error
      setRoleAssignments(roleAssignments);
      toast.error(`Failed to assign role: ${error.message || 'Unknown error'}`, { duration: 3000 });
      setDragFeedback('');
    }
  };

  const handleRemoveUserFromRole = async (roleType, userId) => {
    try {
      const user = (roleAssignments[roleType] || []).find(u => u.id === userId);
      const userName = user ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name) : 'User';
      
      const newAssignments = {
        ...roleAssignments,
        [roleType]: (roleAssignments[roleType] || []).filter(user => user.id !== userId)
      };
      setRoleAssignments(newAssignments);
      
      // Auto-save the changes
      await saveRoleAssignments(newAssignments);
      
      const roleName = getRoleDisplayName(roleType);
      toast.success(`${userName} removed from ${roleName}`, { duration: 2000 });
    } catch (error) {
      console.error('Failed to save role assignments:', error);
      
      // Revert on error
      setRoleAssignments(roleAssignments);
      toast.error(`Failed to remove role: ${error.message || 'Unknown error'}`, { duration: 3000 });
    }
  };

  const getRoleDisplayName = (roleType) => {
    const roleNames = {
      projectManager: 'Project Manager',
      fieldDirector: 'Field Director',
      officeStaff: 'Office Staff',
      administration: 'Administration',
      subcontractor: 'Subcontractor',
      locationManager: 'Location Manager'
    };
    return roleNames[roleType] || roleType;
  };

  const getUnassignedUsers = () => {
    const assignedUserIds = Object.values(roleAssignments)
      .flat()
      .map(user => user.id);
    return availableUsers.filter(user => !assignedUserIds.includes(user.id));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Header - Compact */}
        <div className={`border rounded-lg p-3 shadow-sm ${
          colorMode 
            ? 'bg-[#232b4d] border-gray-600' 
            : 'bg-white border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`font-bold text-base ${
              colorMode ? 'text-white' : 'text-gray-900'
            }`}>👥 Role Management</h3>
            {dragFeedback && (
              <div className="text-sm font-medium text-blue-600">
                {dragFeedback}
              </div>
            )}
          </div>
          <p className={`text-xs mt-1 ${
            colorMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Drag users between roles or remove them entirely.
          </p>
        </div>

        {/* Main Content - Side by Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Available Users - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className={`sticky top-4 border rounded-lg p-3 max-h-[400px] shadow-sm ${
              colorMode 
                ? 'bg-[#232b4d] border-gray-600' 
                : 'bg-white border-gray-300'
            }`}>
              <h4 className={`font-semibold text-sm mb-2 ${
                colorMode ? 'text-white' : 'text-gray-900'
              }`}>Available Users ({getUnassignedUsers().length})</h4>
              
              <div className="space-y-1 overflow-y-auto max-h-[300px]">
                {getUnassignedUsers().map(user => (
                  <DraggableUser 
                    key={user.id} 
                    user={user} 
                    colorMode={colorMode}
                    sourceRole={null}
                  />
                ))}
              </div>
              
              {getUnassignedUsers().length === 0 && (
                <div className={`text-center py-8 text-sm ${
                  colorMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <div className="mb-2 text-2xl">✅</div>
                  All users assigned
                </div>
              )}
            </div>
          </div>

          {/* Role Assignment Areas - Main Content */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CompactRoleDropZone
                roleType="projectManager"
                roleName="Project Manager"
                icon="🎯"
                colorScheme="purple"
                users={roleAssignments.projectManager || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />
              
              <CompactRoleDropZone
                roleType="fieldDirector"
                roleName="Field Director"
                icon="🏗️"
                colorScheme="orange"
                users={roleAssignments.fieldDirector || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />
              
              <CompactRoleDropZone
                roleType="officeStaff"
                roleName="Office Staff"
                icon="📋"
                colorScheme="green"
                users={roleAssignments.officeStaff || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />
              
              <CompactRoleDropZone
                roleType="administration"
                roleName="Administration"
                icon="⚙️"
                colorScheme="red"
                users={roleAssignments.administration || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />

              <CompactRoleDropZone
                roleType="subcontractor"
                roleName="Subcontractor"
                icon="🔨"
                colorScheme="blue"
                users={roleAssignments.subcontractor || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />

              <CompactRoleDropZone
                roleType="locationManager"
                roleName="Location Manager"
                icon="📍"
                colorScheme="teal"
                users={roleAssignments.locationManager || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />
            </div>
          </div>
        </div>

      </div>
    </DndProvider>
  );
};

export default RolesTabComponentFixed;