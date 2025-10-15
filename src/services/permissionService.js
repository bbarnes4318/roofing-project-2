import { API_BASE_URL } from './api';

class PermissionService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/permissions`;
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    console.log('🔍 PERMISSION SERVICE: Token found:', token ? 'Yes' : 'No');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Get all available permissions and role permissions
   */
  async getAllPermissions() {
    try {
      const response = await fetch(`${this.baseURL}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      throw error;
    }
  }

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(role) {
    try {
      const response = await fetch(`${this.baseURL}/role/${role}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch permissions for role ${role}:`, error);
      throw error;
    }
  }

  /**
   * Update permissions for a specific role
   */
  async updateRolePermissions(role, permissions) {
    try {
      const response = await fetch(`${this.baseURL}/role/${role}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ permissions })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to update permissions for role ${role}:`, error);
      throw error;
    }
  }

  /**
   * Get effective permissions for a user
   */
  async getUserPermissions(userId) {
    try {
      const response = await fetch(`${this.baseURL}/user/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch permissions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if current user has specific permissions
   */
  async checkPermissions(permissions) {
    try {
      const response = await fetch(`${this.baseURL}/check`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ permissions })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to check permissions:', error);
      throw error;
    }
  }

  /**
   * Get permission matrix for all roles
   */
  async getPermissionMatrix() {
    try {
      console.log('🔍 PERMISSION SERVICE: Fetching permission matrix...');
      const headers = this.getAuthHeaders();
      console.log('🔍 PERMISSION SERVICE: Headers:', headers);
      
      const response = await fetch(`${this.baseURL}/matrix`, {
        method: 'GET',
        headers: headers
      });

      console.log('🔍 PERMISSION SERVICE: Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 PERMISSION SERVICE: Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 PERMISSION SERVICE: Response data:', data);
      return data;
    } catch (error) {
      console.error('Failed to fetch permission matrix:', error);
      throw error;
    }
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(permission) {
    try {
      const result = await this.checkPermissions([permission]);
      return result.data.hasPermissions[0]?.hasAccess || false;
    } catch (error) {
      console.error(`Failed to check permission ${permission}:`, error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(permissions) {
    try {
      const result = await this.checkPermissions(permissions);
      return result.data.hasPermissions.some(p => p.hasAccess);
    } catch (error) {
      console.error(`Failed to check permissions:`, error);
      return false;
    }
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(permissions) {
    try {
      const result = await this.checkPermissions(permissions);
      return result.data.hasPermissions.every(p => p.hasAccess);
    } catch (error) {
      console.error(`Failed to check permissions:`, error);
      return false;
    }
  }
}

// Create and export a singleton instance
const permissionService = new PermissionService();
export default permissionService;
