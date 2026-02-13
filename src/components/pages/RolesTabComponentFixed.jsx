





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
        flex items-center justify-between p-2 rounded-lg cursor-move transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${isAssigned 
          ? (colorMode 
            ? 'bg-blue-900/20 border border-blue-500/30 text-blue-100' 
            : 'bg-blue-50 border border-blue-200 text-blue-900'
          )
          : (colorMode 
            ? 'bg-gray-800/50 border border-gray-600 text-gray-200 hover:bg-gray-700/50' 
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          )
        }
        hover:shadow-md
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          colorMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
        }`}>
          {user.firstName?.[0] || user.name?.[0] || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">
            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
          </div>
          {user.email && (
            <div className={`text-xs truncate ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {user.email}
            </div>
          )}
        </div>
      </div>
      
      {/* Drag Handle */}
      <div className={`p-1 rounded text-gray-400 hover:text-gray-600 transition-colors`}>
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
          className={`w-6 h-6 rounded-full flex items-center justify-center text-sm hover:scale-110 transition-transform ${
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

const ProfessionalRoleDropZone = ({ roleType, roleName, icon, colorScheme, users, onAddUser, onRemoveUser, colorMode }) => {
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
        bg: colorMode ? 'bg-purple-900/10' : 'bg-purple-50',
        border: colorMode ? 'border-purple-500/30' : 'border-purple-200',
        hoverBg: colorMode ? 'bg-purple-800/20' : 'bg-purple-100',
        hoverBorder: colorMode ? 'border-purple-400' : 'border-purple-300',
        text: colorMode ? 'text-purple-200' : 'text-purple-900',
        accent: 'purple'
      },
      orange: {
        bg: colorMode ? 'bg-orange-900/10' : 'bg-orange-50',
        border: colorMode ? 'border-orange-500/30' : 'border-orange-200',
        hoverBg: colorMode ? 'bg-orange-800/20' : 'bg-orange-100',
        hoverBorder: colorMode ? 'border-orange-400' : 'border-orange-300',
        text: colorMode ? 'text-orange-200' : 'text-orange-900',
        accent: 'orange'
      },
      green: {
        bg: colorMode ? 'bg-green-900/10' : 'bg-green-50',
        border: colorMode ? 'border-green-500/30' : 'border-green-200',
        hoverBg: colorMode ? 'bg-green-800/20' : 'bg-green-100',
        hoverBorder: colorMode ? 'border-green-400' : 'border-green-300',
        text: colorMode ? 'text-green-200' : 'text-green-900',
        accent: 'green'
      },
      red: {
        bg: colorMode ? 'bg-red-900/10' : 'bg-red-50',
        border: colorMode ? 'border-red-500/30' : 'border-red-200',
        hoverBg: colorMode ? 'bg-red-800/20' : 'bg-red-100',
        hoverBorder: colorMode ? 'border-red-400' : 'border-red-300',
        text: colorMode ? 'text-red-200' : 'text-red-900',
        accent: 'red'
      },
      blue: {
        bg: colorMode ? 'bg-blue-900/10' : 'bg-blue-50',
        border: colorMode ? 'border-blue-500/30' : 'border-blue-200',
        hoverBg: colorMode ? 'bg-blue-800/20' : 'bg-blue-100',
        hoverBorder: colorMode ? 'border-blue-400' : 'border-blue-300',
        text: colorMode ? 'text-blue-200' : 'text-blue-900',
        accent: 'blue'
      },
      teal: {
        bg: colorMode ? 'bg-teal-900/10' : 'bg-teal-50',
        border: colorMode ? 'border-teal-500/30' : 'border-teal-200',
        hoverBg: colorMode ? 'bg-teal-800/20' : 'bg-teal-100',
        hoverBorder: colorMode ? 'border-teal-400' : 'border-teal-300',
        text: colorMode ? 'text-teal-200' : 'text-teal-900',
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
        border-2 border-dashed rounded-xl p-4 min-h-[120px] transition-all duration-200 shadow-sm
        ${isOver && canDrop 
          ? `${colors.hoverBg} ${colors.hoverBorder} shadow-lg scale-[1.02]` 
          : `${colors.bg} ${colors.border}`
        }
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h4 className={`font-semibold text-sm ${colors.text}`}>
            {roleName}
          </h4>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          colorMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}>
          {users.length}
        </span>
      </div>

      <div className="space-y-2 max-h-[80px] overflow-y-auto">
        {users.length > 0 ? (
          users.map(user => (
            <div key={user.id} className={`flex items-center justify-between p-2 rounded-lg text-sm border ${
              colorMode ? 'bg-gray-800/50 border-gray-600' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  colorMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {user.firstName?.[0] || user.name?.[0] || '?'}
                </div>
                <span className="font-medium text-sm truncate">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
                </span>
              </div>
              <button
                onClick={() => onRemoveUser(roleType, user.id)}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform ${
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
            text-center py-4 text-sm rounded-lg border-2 border-dashed
            ${colorMode 
              ? 'text-gray-400 border-gray-600' 
              : 'text-gray-500 border-gray-300'
            }
          `}>
            <div className="mb-2 text-lg">👤</div>
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
      <div className="h-full flex flex-col">
        {/* Professional Header */}
        <div className={`border-b rounded-t-xl p-4 shadow-sm ${
          colorMode 
            ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30' 
            : 'bg-[#F8FAFC] border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                colorMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className={`font-bold text-lg ${
                  colorMode ? 'text-white' : 'text-gray-900'
                }`}>Role Management</h3>
                <p className={`text-sm ${
                  colorMode ? 'text-blue-200' : 'text-blue-700'
                }`}>
                  Drag and drop users to assign roles. Changes save automatically.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                colorMode ? 'bg-blue-800/50 text-blue-200' : 'bg-blue-100 text-blue-800'
              }`}>
                {getUnassignedUsers().length} available
              </div>
              {dragFeedback && (
                <div className="text-sm font-medium text-blue-600 animate-pulse">
                  {dragFeedback}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Single View Layout */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Available Users Panel */}
            <div className={`border rounded-xl p-4 shadow-sm ${
              colorMode 
                ? 'bg-gray-800/50 border-gray-600' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  colorMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'
                }`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h4 className={`font-semibold text-sm ${
                  colorMode ? 'text-white' : 'text-gray-900'
                }`}>Available Users</h4>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {getUnassignedUsers().map(user => (
                  <DraggableUser 
                    key={user.id} 
                    user={user} 
                    colorMode={colorMode}
                    sourceRole={null}
                  />
                ))}
                
                {getUnassignedUsers().length === 0 && (
                  <div className={`text-center py-8 text-sm rounded-lg border-2 border-dashed ${
                    colorMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-300'
                  }`}>
                    <div className="mb-2 text-2xl">✅</div>
                    All users assigned
                  </div>
                )}
              </div>
            </div>

            {/* Role Assignment Areas - 2x3 Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <ProfessionalRoleDropZone
                roleType="projectManager"
                roleName="Project Manager"
                icon="🎯"
                colorScheme="purple"
                users={roleAssignments.projectManager || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />
              
              <ProfessionalRoleDropZone
                roleType="fieldDirector"
                roleName="Field Director"
                icon="🏗️"
                colorScheme="orange"
                users={roleAssignments.fieldDirector || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />
              
              <ProfessionalRoleDropZone
                roleType="officeStaff"
                roleName="Office Staff"
                icon="📋"
                colorScheme="green"
                users={roleAssignments.officeStaff || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />
              
              <ProfessionalRoleDropZone
                roleType="administration"
                roleName="Administration"
                icon="⚙️"
                colorScheme="red"
                users={roleAssignments.administration || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />

              <ProfessionalRoleDropZone
                roleType="subcontractor"
                roleName="Subcontractor"
                icon="🔨"
                colorScheme="blue"
                users={roleAssignments.subcontractor || []}
                onAddUser={handleAddUserToRole}
                onRemoveUser={handleRemoveUserFromRole}
                colorMode={colorMode}
              />

              <ProfessionalRoleDropZone
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