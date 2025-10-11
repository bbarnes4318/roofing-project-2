import React from 'react';
import PermissionGate, { 
  RoleGate, 
  AdminOnly, 
  ManagerOnly, 
  ProjectManagerOnly, 
  StaffOnly 
} from '../ui/PermissionGate';
import { PERMISSIONS } from '../../utils/permissions';
import { getNavigationItems, getQuickActions } from '../../utils/navigation';

/**
 * Example component demonstrating various permission gate usage patterns
 * This shows how to implement role-based access control throughout the application
 */
const PermissionExamples = () => {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Permission System Examples</h1>
      
      {/* 1. Basic Permission Gates */}
      <section>
        <h2 className="text-xl font-semibold mb-4">1. Basic Permission Gates</h2>
        
        {/* Single Permission Check */}
        <PermissionGate permission={PERMISSIONS.PROJECTS_CREATE}>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">
            Create Project (Admin/Manager/PM only)
          </button>
        </PermissionGate>
        
        {/* Multiple Permission Check (ANY) */}
        <PermissionGate permissions={[PERMISSIONS.FINANCES_VIEW, PERMISSIONS.REPORTS_VIEW]}>
          <button className="bg-green-500 text-white px-4 py-2 rounded ml-2">
            View Financials or Reports
          </button>
        </PermissionGate>
        
        {/* Multiple Permission Check (ALL) */}
        <PermissionGate allPermissions={[PERMISSIONS.USERS_READ, PERMISSIONS.USERS_UPDATE]}>
          <button className="bg-purple-500 text-white px-4 py-2 rounded ml-2">
            Manage Users (Read + Update required)
          </button>
        </PermissionGate>
      </section>
      
      {/* 2. Role-Based Gates */}
      <section>
        <h2 className="text-xl font-semibold mb-4">2. Role-Based Gates</h2>
        
        {/* Specific Roles */}
        <RoleGate roles={['ADMIN', 'MANAGER']}>
          <div className="bg-red-100 p-4 rounded">
            <h3 className="font-semibold">Admin/Manager Only Section</h3>
            <p>This content is only visible to Administrators and Managers.</p>
          </div>
        </RoleGate>
        
        {/* Exclude Specific Roles */}
        <RoleGate roles={['CLIENT', 'SUBCONTRACTOR']} exclude={true}>
          <div className="bg-blue-100 p-4 rounded mt-2">
            <h3 className="font-semibold">Staff Only Section</h3>
            <p>This content is visible to all staff except clients and subcontractors.</p>
          </div>
        </RoleGate>
      </section>
      
      {/* 3. Pre-built Role Components */}
      <section>
        <h2 className="text-xl font-semibold mb-4">3. Pre-built Role Components</h2>
        
        <AdminOnly>
          <div className="bg-red-200 p-4 rounded">
            <h3 className="font-semibold">Admin Only</h3>
            <p>Only administrators can see this content.</p>
          </div>
        </AdminOnly>
        
        <ManagerOnly>
          <div className="bg-purple-200 p-4 rounded mt-2">
            <h3 className="font-semibold">Manager+ Only</h3>
            <p>Managers and administrators can see this content.</p>
          </div>
        </ManagerOnly>
        
        <ProjectManagerOnly>
          <div className="bg-blue-200 p-4 rounded mt-2">
            <h3 className="font-semibold">Project Manager+ Only</h3>
            <p>Project managers and above can see this content.</p>
          </div>
        </ProjectManagerOnly>
        
        <StaffOnly>
          <div className="bg-green-200 p-4 rounded mt-2">
            <h3 className="font-semibold">Staff Only</h3>
            <p>All staff except clients and subcontractors can see this.</p>
          </div>
        </StaffOnly>
      </section>
      
      {/* 4. Conditional Navigation */}
      <section>
        <h2 className="text-xl font-semibold mb-4">4. Conditional Navigation</h2>
        
        <div className="flex space-x-2">
          <PermissionGate permission={PERMISSIONS.PROJECTS_CREATE}>
            <a href="/projects/create" className="bg-blue-500 text-white px-4 py-2 rounded">
              Create Project
            </a>
          </PermissionGate>
          
          <PermissionGate permission={PERMISSIONS.FINANCES_VIEW}>
            <a href="/financials" className="bg-green-500 text-white px-4 py-2 rounded">
              Financials
            </a>
          </PermissionGate>
          
          <PermissionGate permission={PERMISSIONS.USERS_READ}>
            <a href="/users" className="bg-purple-500 text-white px-4 py-2 rounded">
              User Management
            </a>
          </PermissionGate>
          
          <PermissionGate permission={PERMISSIONS.AI_BUBBLES}>
            <a href="/bubbles" className="bg-pink-500 text-white px-4 py-2 rounded">
              Bubbles AI
            </a>
          </PermissionGate>
        </div>
      </section>
      
      {/* 5. Data Access Levels */}
      <section>
        <h2 className="text-xl font-semibold mb-4">5. Data Access Levels</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h3 className="font-semibold">Public Data</h3>
            <p>Visible to all users</p>
            <PermissionGate permission={PERMISSIONS.DATA_PUBLIC}>
              <div className="bg-gray-100 p-2 rounded mt-2">
                <p>Public project information</p>
              </div>
            </PermissionGate>
          </div>
          
          <div className="border p-4 rounded">
            <h3 className="font-semibold">Internal Data</h3>
            <p>Visible to staff only</p>
            <PermissionGate permission={PERMISSIONS.DATA_INTERNAL}>
              <div className="bg-blue-100 p-2 rounded mt-2">
                <p>Internal project details</p>
              </div>
            </PermissionGate>
          </div>
          
          <div className="border p-4 rounded">
            <h3 className="font-semibold">Confidential Data</h3>
            <p>Visible to management and above</p>
            <PermissionGate permission={PERMISSIONS.DATA_CONFIDENTIAL}>
              <div className="bg-yellow-100 p-2 rounded mt-2">
                <p>Confidential financial information</p>
              </div>
            </PermissionGate>
          </div>
          
          <div className="border p-4 rounded">
            <h3 className="font-semibold">Restricted Data</h3>
            <p>Visible to administrators only</p>
            <PermissionGate permission={PERMISSIONS.DATA_RESTRICTED}>
              <div className="bg-red-100 p-2 rounded mt-2">
                <p>Restricted system settings</p>
              </div>
            </PermissionGate>
          </div>
        </div>
      </section>
      
      {/* 6. Feature Toggles */}
      <section>
        <h2 className="text-xl font-semibold mb-4">6. Feature Toggles</h2>
        
        <div className="grid grid-cols-3 gap-4">
          <PermissionGate permission={PERMISSIONS.AI_BUBBLES}>
            <div className="border p-4 rounded">
              <h3 className="font-semibold">🤖 AI Features</h3>
              <p>Bubbles AI assistant</p>
              <button className="bg-purple-500 text-white px-3 py-1 rounded mt-2">
                Use Bubbles
              </button>
            </div>
          </PermissionGate>
          
          <PermissionGate permission={PERMISSIONS.REPORTS_GENERATE}>
            <div className="border p-4 rounded">
              <h3 className="font-semibold">📊 Advanced Reports</h3>
              <p>Generate custom reports</p>
              <button className="bg-green-500 text-white px-3 py-1 rounded mt-2">
                Generate Report
              </button>
            </div>
          </PermissionGate>
          
          <PermissionGate permission={PERMISSIONS.USERS_MANAGE_ROLES}>
            <div className="border p-4 rounded">
              <h3 className="font-semibold">👥 User Management</h3>
              <p>Manage user roles and permissions</p>
              <button className="bg-orange-500 text-white px-3 py-1 rounded mt-2">
                Manage Users
              </button>
            </div>
          </PermissionGate>
        </div>
      </section>
      
      {/* 7. Fallback Content */}
      <section>
        <h2 className="text-xl font-semibold mb-4">7. Fallback Content</h2>
        
        <PermissionGate 
          permission={PERMISSIONS.FINANCES_VIEW}
          fallback={
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-gray-600">
                You don't have permission to view financial information. 
                Contact your administrator for access.
              </p>
            </div>
          }
        >
          <div className="bg-green-100 p-4 rounded">
            <h3 className="font-semibold">Financial Dashboard</h3>
            <p>Here's your financial data...</p>
          </div>
        </PermissionGate>
      </section>
      
      {/* 8. Complex Permission Logic */}
      <section>
        <h2 className="text-xl font-semibold mb-4">8. Complex Permission Logic</h2>
        
        {/* Multiple conditions */}
        <PermissionGate 
          permissions={[PERMISSIONS.PROJECTS_READ, PERMISSIONS.DOCUMENTS_DOWNLOAD]}
          fallback={
            <div className="bg-gray-100 p-4 rounded">
              <p>You need both project read and document download permissions.</p>
            </div>
          }
        >
          <div className="bg-blue-100 p-4 rounded">
            <h3 className="font-semibold">Project Documents</h3>
            <p>You can view projects and download documents.</p>
          </div>
        </PermissionGate>
        
        {/* All permissions required */}
        <PermissionGate 
          allPermissions={[PERMISSIONS.USERS_READ, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE_ROLES]}
          fallback={
            <div className="bg-gray-100 p-4 rounded mt-2">
              <p>You need full user management permissions.</p>
            </div>
          }
        >
          <div className="bg-purple-100 p-4 rounded mt-2">
            <h3 className="font-semibold">Full User Management</h3>
            <p>You have complete user management access.</p>
          </div>
        </PermissionGate>
      </section>
    </div>
  );
};

export default PermissionExamples;
