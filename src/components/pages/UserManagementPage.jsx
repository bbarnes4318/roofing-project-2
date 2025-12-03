import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';
import { usersService } from '../../services/api';

const UserManagementPage = ({ colorMode }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'inactive'
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const roles = [
    { value: 'ADMIN', label: 'Administrator', color: 'bg-red-100 text-red-800' },
    { value: 'MANAGER', label: 'Manager', color: 'bg-orange-100 text-orange-800' },
    { value: 'PROJECT_MANAGER', label: 'Project Manager', color: 'bg-blue-100 text-blue-800' },
    { value: 'FOREMAN', label: 'Foreman', color: 'bg-green-100 text-green-800' },
    { value: 'WORKER', label: 'Worker', color: 'bg-gray-100 text-gray-800' },
    { value: 'SUBCONTRACTOR', label: 'Subcontractor', color: 'bg-purple-100 text-purple-800' }
  ];

  useEffect(() => {
    // Get current user to check if admin
    try {
      const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (e) {
      console.error('Error parsing current user:', e);
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }
      
      console.log('📡 UserManagementPage: Fetching users from API...');
      const response = await fetch(`${API_BASE_URL}/users/team-members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 UserManagementPage: Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📡 UserManagementPage: API response:', result);
        
        if (result.success && result.data?.teamMembers) {
          setUsers(result.data.teamMembers);
          console.log(`✅ UserManagementPage: Loaded ${result.data.teamMembers.length} users`);
        } else {
          setError('No users found in response');
          setUsers([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ UserManagementPage: API error:', response.status, errorText);
        setError(`Failed to fetch users (${response.status}): ${errorText}`);
        setUsers([]);
      }
    } catch (err) {
      console.error('❌ UserManagementPage: Network error:', err);
      setError('Network error. Please check your connection and try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.isActive;
    
    // Optimistically update UI
    setUsers(users.map(u => 
      u.id === user.id ? { ...u, isActive: newStatus } : u
    ));

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      // Show success message briefly
      setSuccessMessage(`User ${user.firstName} moved to ${newStatus ? 'Active' : 'Inactive'} list`);
      setTimeout(() => setSuccessMessage(''), 2000);
      
    } catch (err) {
      console.error('Error toggling status:', err);
      setError('Failed to update user status');
      // Revert change
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, isActive: !newStatus } : u
      ));
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      secondaryPhone: user.secondaryPhone || '',
      preferredPhone: user.preferredPhone || '',
      role: user.role,
      isActive: user.isActive
    });
  };

  const handleSaveEdit = async () => {
    try {
      setError('');
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      console.log('🔍 UPDATE-USER: Sending update request:', {
        userId: editingUser.id,
        updateData: editForm
      });
      
      const response = await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      const result = await response.json();
      
      console.log('🔍 UPDATE-USER: Response received:', result);
      
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to update user');
      }
      
      if (result.success && result.data && result.data.user) {
        // Use the updated user data from the server response
        const updatedUser = result.data.user;
        setUsers(users.map(user => 
          user.id === editingUser.id ? updatedUser : user
        ));
        setEditingUser(null);
        setEditForm({});
        setSuccessMessage('User updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(result.message || 'Failed to update user');
      }
    } catch (err) {
      console.error('❌ UPDATE-USER: Error:', err);
      setError(err.message || 'Network error. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const handleDeleteClick = (user) => {
    setDeletingUser(user);
  };

  const handleCancelDelete = () => {
    setDeletingUser(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await usersService.deleteUser(deletingUser.id);
      
      if (result.success) {
        // Remove user from list
        setUsers(users.filter(user => user.id !== deletingUser.id));
        setDeletingUser(null);
        // Show success message
        setSuccessMessage(result.message || `User ${deletingUser.firstName} ${deletingUser.lastName} has been deleted successfully`);
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(result.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAdmin = () => {
    if (!currentUser) return false;
    const role = currentUser.role || '';
    return role.toUpperCase() === 'ADMIN';
  };

  const filteredUsers = users.filter(user => {
    // Safely handle missing user properties
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const email = user.email || '';
    
    const matchesSearch = 
      firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    
    // Filter by active tab
    const matchesStatus = activeTab === 'active' ? user.isActive : !user.isActive;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleInfo = (role) => {
    return roles.find(r => r.value === role) || { label: role, color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${colorMode ? 'bg-[#0f172a]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${colorMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-lg`}>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 mt-1">Manage team members and their roles</p>
              </div>
              <div className="text-sm text-gray-500">
                {filteredUsers.length} users
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
                activeTab === 'active'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Active Users
            </button>
            <button
              onClick={() => setActiveTab('inactive')}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
                activeTab === 'inactive'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Inactive Users
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Roles</option>
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchUsers}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.avatar ? (
                            <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {(user.firstName || 'U').charAt(0)}{(user.lastName || 'U').charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName || 'Unknown'} {user.lastName || 'User'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.phone && <div>Primary: {user.phone}</div>}
                        {user.secondaryPhone && <div>Secondary: {user.secondaryPhone}</div>}
                        {user.preferredPhone && <div className="text-blue-600 font-medium">Preferred: {user.preferredPhone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleInfo(user.role).color}`}>
                        {getRoleInfo(user.role).label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={user.isActive}
                          onChange={() => handleToggleStatus(user)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        {isAdmin() && (
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="text-red-600 hover:text-red-900"
                            disabled={isDeleting}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {searchTerm || roleFilter !== 'ALL' 
                  ? 'No users match your filters' 
                  : `No ${activeTab} users found`
                }
              </div>
            </div>
          )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-red-900 mb-4">Delete User</h3>
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to delete <strong>{deletingUser.firstName} {deletingUser.lastName}</strong> ({deletingUser.email})?
              </p>
              <p className="text-sm text-red-600 mb-4">
                This action cannot be undone. The user will be permanently removed from the system.
              </p>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
