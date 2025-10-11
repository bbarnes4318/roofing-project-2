import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../../utils/permissions';

/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 * 
 * @param {string} permission - Single permission to check
 * @param {string[]} permissions - Multiple permissions to check (any)
 * @param {string[]} allPermissions - Multiple permissions to check (all)
 * @param {React.ReactNode} children - Content to render if permission granted
 * @param {React.ReactNode} fallback - Content to render if permission denied
 * @param {boolean} requireAuth - Whether user must be authenticated
 * @param {string} className - CSS classes for wrapper
 */
const PermissionGate = ({
  permission,
  permissions,
  allPermissions,
  children,
  fallback = null,
  requireAuth = true,
  className = '',
  ...props
}) => {
  const { user, isAuthenticated } = useAuth();

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return fallback;
  }

  // If no user role, deny access
  if (!user?.role) {
    return fallback;
  }

  let hasAccess = false;

  // Check single permission
  if (permission) {
    hasAccess = hasPermission(user.role, permission);
  }
  // Check any of multiple permissions
  else if (permissions && Array.isArray(permissions)) {
    hasAccess = hasAnyPermission(user.role, permissions);
  }
  // Check all of multiple permissions
  else if (allPermissions && Array.isArray(allPermissions)) {
    hasAccess = hasAllPermissions(user.role, allPermissions);
  }
  // If no permissions specified, grant access
  else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return fallback;
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};

/**
 * RoleGate Component
 * Conditionally renders children based on user role
 * 
 * @param {string|string[]} roles - Role(s) that can access
 * @param {boolean} exclude - Whether to exclude the specified roles
 * @param {React.ReactNode} children - Content to render if role matches
 * @param {React.ReactNode} fallback - Content to render if role doesn't match
 */
export const RoleGate = ({
  roles,
  exclude = false,
  children,
  fallback = null,
  className = '',
  ...props
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user?.role) {
    return fallback;
  }

  const userRole = user.role.toUpperCase();
  const allowedRoles = Array.isArray(roles) ? roles.map(r => r.toUpperCase()) : [roles.toUpperCase()];
  
  const hasAccess = exclude 
    ? !allowedRoles.includes(userRole)
    : allowedRoles.includes(userRole);

  if (!hasAccess) {
    return fallback;
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};

/**
 * DataLevelGate Component
 * Conditionally renders children based on data access level
 * 
 * @param {string} dataLevel - Data level required (public, internal, confidential, restricted)
 * @param {React.ReactNode} children - Content to render if access granted
 * @param {React.ReactNode} fallback - Content to render if access denied
 */
export const DataLevelGate = ({
  dataLevel,
  children,
  fallback = null,
  className = '',
  ...props
}) => {
  const { user, isAuthenticated } = useAuth();
  const { canAccessDataLevel } = require('../../utils/permissions');

  if (!isAuthenticated || !user?.role) {
    return fallback;
  }

  const hasAccess = canAccessDataLevel(user.role, dataLevel);

  if (!hasAccess) {
    return fallback;
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};

/**
 * AdminOnly Component
 * Renders children only for admin users
 */
export const AdminOnly = ({ children, fallback = null, className = '', ...props }) => (
  <RoleGate roles={['ADMIN']} fallback={fallback} className={className} {...props}>
    {children}
  </RoleGate>
);

/**
 * ManagerOnly Component
 * Renders children only for manager and admin users
 */
export const ManagerOnly = ({ children, fallback = null, className = '', ...props }) => (
  <RoleGate roles={['ADMIN', 'MANAGER']} fallback={fallback} className={className} {...props}>
    {children}
  </RoleGate>
);

/**
 * ProjectManagerOnly Component
 * Renders children only for project manager and above
 */
export const ProjectManagerOnly = ({ children, fallback = null, className = '', ...props }) => (
  <RoleGate roles={['ADMIN', 'MANAGER', 'PROJECT_MANAGER']} fallback={fallback} className={className} {...props}>
    {children}
  </RoleGate>
);

/**
 * StaffOnly Component
 * Renders children only for staff (excludes clients and subcontractors)
 */
export const StaffOnly = ({ children, fallback = null, className = '', ...props }) => (
  <RoleGate 
    roles={['CLIENT', 'SUBCONTRACTOR']} 
    exclude={true} 
    fallback={fallback} 
    className={className} 
    {...props}
  >
    {children}
  </RoleGate>
);

export default PermissionGate;
