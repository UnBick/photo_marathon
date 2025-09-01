import apiClient from './apiClient';

class AuthService {
  // Team authentication
  async registerTeam(teamData) {
    const response = await apiClient.post('/auth/team/register', teamData);
    const { data } = response.data;
    
    // Transform the response to match the expected format
    return {
      user: data.team,
      token: data.token
    };
  }

  async loginTeam(credentials) {
    const response = await apiClient.post('/auth/team/login', credentials);
    const { data } = response.data;
    
    // Transform the response to match the expected format
    return {
      user: data.team,
      token: data.token
    };
  }

  async logoutTeam() {
    const response = await apiClient.post('/auth/team/logout');
    return response.data;
  }

  // Admin authentication
  async registerAdmin(adminData) {
    const response = await apiClient.post('/auth/admin/register', adminData);
    return response.data;
  }

  async loginAdmin(credentials) {
    const response = await apiClient.post('/auth/admin/login', credentials);
    const { data } = response.data;
    
    // Transform the response to match the expected format
    return {
      user: data.admin,
      token: data.token
    };
  }

  async logoutAdmin() {
    const response = await apiClient.post('/auth/admin/logout');
    return response.data;
  }

  // Super admin creation (only during initial setup)
  async createSuperAdmin(adminData) {
    const response = await apiClient.post('/auth/admin/super', adminData);
    return response.data;
  }

  // Token management
  async refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  }

    // Unified logout method
    async logout(userType = 'team') {
      if (userType === 'admin') {
        return await this.logoutAdmin();
      } else {
        return await this.logoutTeam();
      }
    }

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }

  // Password management
  async changePassword(currentPassword, newPassword) {
    const response = await apiClient.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }

  async requestPasswordReset(email) {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token, newPassword) {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword
    });
    return response.data;
  }

  // Profile management
  async updateProfile(profileData) {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  }

  async getProfile() {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  }

  // Session management
  async validateSession() {
    try {
      const user = await this.getCurrentUser();
      return { valid: true, user };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Check if user has specific role/permission
  hasRole(user, role) {
    if (!user) return false;
    
    if (user.role === 'admin') return true;
    if (user.role === role) return true;
    
    return false;
  }

  hasPermission(user, permission) {
    if (!user) return false;
    
    if (user.role === 'admin') return true;
    if (user.permissions && user.permissions.includes(permission)) return true;
    
    return false;
  }

  // Get user display name
  getDisplayName(user) {
    if (!user) return 'Unknown User';
    
    if (user.teamName) return user.teamName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.username) return user.username;
    
    return 'Unknown User';
  }

  // Get user avatar/initials
  getUserInitials(user) {
    if (!user) return '?';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    
    if (user.teamName) {
      return user.teamName.charAt(0).toUpperCase();
    }
    
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    
    return '?';
  }

  // Check if user is admin
  isAdmin(user) {
    return this.hasRole(user, 'admin') || this.hasRole(user, 'super_admin');
  }


  // Check if user is team member
  isTeamMember(user) {
    return user && !user.role; // Teams don't have roles
  }
}

const authService = new AuthService();
export default authService;
