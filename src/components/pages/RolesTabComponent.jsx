import React, { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const DragTypes = {
  USER: 'user'
};

const DraggableUser = ({ user, isAssigned = false, onRemove = null, colorMode }) => {
  const [{ isDragging }, drag] = useDrag({
    type: DragTypes.USER,
    item: () => ({ user, isAssigned }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={`
        flex items-center justify-between p-3 rounded-lg cursor-move transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${isAssigned 
          ? (colorMode 
            ? 'bg-blue-900/30 border border-blue-500/50 text-blue-200' 
            : 'bg-blue-100 border border-blue-300 text-blue-900'
          )
          : (colorMode 
            ? 'bg-gray-800/50 border border-gray-600 text-gray-300 hover:bg-gray-700/50' 
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          )
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
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

const RoleDropZone = ({ roleType, roleName, icon, description, colorScheme, users, onAddUser, onRemoveUser, colorMode }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DragTypes.USER,
    drop: (item) => {
      if (!item.isAssigned) {
        onAddUser(roleType, item.user);
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
        hoverBg: colorMode ? 'bg-purple-900/30' : 'bg-purple-100',
        hoverBorder: colorMode ? 'border-purple-400' : 'border-purple-400',
        text: colorMode ? 'text-purple-300' : 'text-purple-900',
        subtext: colorMode ? 'text-purple-200' : 'text-purple-700'
      },
      orange: {
        bg: colorMode ? 'bg-orange-900/10' : 'bg-orange-50',
        border: colorMode ? 'border-orange-500/30' : 'border-orange-200',
        hoverBg: colorMode ? 'bg-orange-900/30' : 'bg-orange-100',
        hoverBorder: colorMode ? 'border-orange-400' : 'border-orange-400',
        text: colorMode ? 'text-orange-300' : 'text-orange-900',
        subtext: colorMode ? 'text-orange-200' : 'text-orange-700'
      },
      green: {
        bg: colorMode ? 'bg-green-900/10' : 'bg-green-50',
        border: colorMode ? 'border-green-500/30' : 'border-green-200',
        hoverBg: colorMode ? 'bg-green-900/30' : 'bg-green-100',
        hoverBorder: colorMode ? 'border-green-400' : 'border-green-400',
        text: colorMode ? 'text-green-300' : 'text-green-900',
        subtext: colorMode ? 'text-green-200' : 'text-green-700'
      },
      red: {
        bg: colorMode ? 'bg-red-900/10' : 'bg-red-50',
        border: colorMode ? 'border-red-500/30' : 'border-red-200',
        hoverBg: colorMode ? 'bg-red-900/30' : 'bg-red-100',
        hoverBorder: colorMode ? 'border-red-400' : 'border-red-400',
        text: colorMode ? 'text-red-300' : 'text-red-900',
        subtext: colorMode ? 'text-red-200' : 'text-red-700'
      }
    };
    return colorMap[scheme] || colorMap.purple;
  };

  const colors = getColorClasses(colorScheme);

  return (
    <div
      ref={drop}
      className={`
        border-2 border-dashed rounded-xl p-4 min-h-[200px] transition-all duration-200
        ${isOver && canDrop 
          ? `${colors.hoverBg} ${colors.hoverBorder}` 
          : `${colors.bg} ${colors.border}`
        }
      `}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <h4 className={`font-bold text-lg ${colors.text}`}>
            {roleName}
          </h4>
          <p className={`text-sm ${colors.subtext}`}>
            {description}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {users.length > 0 ? (
          users.map(user => (
            <DraggableUser
              key={user.id}
              user={user}
              isAssigned={true}
              onRemove={(userId) => onRemoveUser(roleType, userId)}
              colorMode={colorMode}
            />
          ))
        ) : (
          <div className={`
            text-center py-8 text-sm rounded-lg border-2 border-dashed
            ${colorMode 
              ? 'text-gray-400 border-gray-600' 
              : 'text-gray-500 border-gray-300'
            }
          `}>
            <div className="mb-2 text-2xl">👥</div>
            Drag users here to assign to {roleName}
          </div>
        )}
      </div>
    </div>
  );
};

const RolesTabComponent = ({ 
  colorMode, 
  roleAssignments, 
  setRoleAssignments, 
  availableUsers, 
  saveRoleAssignments 
}) => {

  const handleAddUserToRole = async (roleType, user) => {
    const newAssignments = {
      ...roleAssignments,
      [roleType]: [...(roleAssignments[roleType] || []), user]
    };
    setRoleAssignments(newAssignments);
    
    // Auto-save the changes
    try {
      await saveRoleAssignments(newAssignments);
    } catch (error) {
      console.error('Failed to save role assignments:', error);
      // Revert on error
      setRoleAssignments(roleAssignments);
    }
  };

  const handleRemoveUserFromRole = async (roleType, userId) => {
    const newAssignments = {
      ...roleAssignments,
      [roleType]: (roleAssignments[roleType] || []).filter(user => user.id !== userId)
    };
    setRoleAssignments(newAssignments);
    
    // Auto-save the changes
    try {
      await saveRoleAssignments(newAssignments);
    } catch (error) {
      console.error('Failed to save role assignments:', error);
      // Revert on error
      setRoleAssignments(roleAssignments);
    }
  };

  const getUnassignedUsers = () => {
    const assignedUserIds = Object.values(roleAssignments)
      .flat()
      .map(user => user.id);
    return availableUsers.filter(user => !assignedUserIds.includes(user.id));
  };
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div className={`border rounded-lg p-6 ${
          colorMode 
            ? 'bg-blue-900/20 border-blue-500/40' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <h3 className={`font-bold text-xl mb-3 ${
            colorMode ? 'text-blue-300' : 'text-blue-900'
          }`}>👥 Role Management</h3>
          <p className={`text-sm mb-3 ${
            colorMode ? 'text-blue-200' : 'text-blue-700'
          }`}>
            Drag and drop users into roles to assign them. Multiple users can be assigned to each role.
          </p>
          <div className={`text-xs space-y-1 ${
            colorMode ? 'text-blue-200' : 'text-blue-600'
          }`}>
            <p>🎯 <strong>Project Manager:</strong> Required for every project (can be changed per project)</p>
            <p>🔔 <strong>Notifications:</strong> Users receive workflow alerts based on their role assignments</p>
            <p>💾 <strong>Auto-Save:</strong> Changes are saved automatically</p>
          </div>
        </div>

        {/* Available Users Pool */}
        <div className={`border rounded-lg p-4 ${
          colorMode 
            ? 'bg-gray-800/50 border-gray-600' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <h4 className={`font-semibold mb-3 ${
            colorMode ? 'text-white' : 'text-gray-900'
          }`}>Available Users</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {getUnassignedUsers().map(user => (
              <DraggableUser key={user.id} user={user} colorMode={colorMode} />
            ))}
          </div>
          {getUnassignedUsers().length === 0 && (
            <div className={`text-center py-4 text-sm ${
              colorMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              All users have been assigned to roles
            </div>
          )}
        </div>

        {/* Role Assignment Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RoleDropZone
            roleType="projectManager"
            roleName="Project Manager"
            icon="🎯"
            description="Oversees projects, strategy, and client requirements"
            colorScheme="purple"
            users={roleAssignments.projectManager || []}
            onAddUser={handleAddUserToRole}
            onRemoveUser={handleRemoveUserFromRole}
            colorMode={colorMode}
          />
          
          <RoleDropZone
            roleType="fieldDirector"
            roleName="Field Director"
            icon="🏗️"
            description="Manages field operations and on-site execution"
            colorScheme="orange"
            users={roleAssignments.fieldDirector || []}
            onAddUser={handleAddUserToRole}
            onRemoveUser={handleRemoveUserFromRole}
            colorMode={colorMode}
          />
          
          <RoleDropZone
            roleType="officeStaff"
            roleName="Office Staff"
            icon="📋"
            description="Handles scheduling, documentation, and communications"
            colorScheme="green"
            users={roleAssignments.officeStaff || []}
            onAddUser={handleAddUserToRole}
            onRemoveUser={handleRemoveUserFromRole}
            colorMode={colorMode}
          />
          
          <RoleDropZone
            roleType="administration"
            roleName="Administration"
            icon="⚙️"
            description="Manages system settings and administrative tasks"
            colorScheme="red"
            users={roleAssignments.administration || []}
            onAddUser={handleAddUserToRole}
            onRemoveUser={handleRemoveUserFromRole}
            colorMode={colorMode}
          />
        </div>
      </div>
    </DndProvider>
  );
};

export default RolesTabComponent;