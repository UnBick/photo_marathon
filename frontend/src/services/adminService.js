import apiClient from './apiClient';

class AdminService {
  // Dashboard and overview
  async getDashboard() {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  }

  async getGameOverview() {
    const response = await apiClient.get('/admin/overview');
    return response.data;
  }

  // Team management
  async getAllTeams(params = {}) {
    const response = await apiClient.getPaginated('/admin/teams', params);
    return response.data;
  }

  async getTeamDetails(teamId) {
    const response = await apiClient.get(`/admin/teams/${teamId}`);
    return response.data;
  }

  async updateTeam(teamId, updates) {
    const response = await apiClient.put(`/admin/teams/${teamId}`, updates);
    return response.data;
  }

  async deleteTeam(teamId) {
    const response = await apiClient.delete(`/admin/teams/${teamId}`);
    return response.data;
  }

  async resetTeamProgress(teamId) {
    const response = await apiClient.post(`/admin/teams/${teamId}/reset`);
    return response.data;
  }

  async unlockTeamFinal(teamId) {
    const response = await apiClient.post(`/admin/teams/${teamId}/unlock-final`);
    return response.data;
  }

  // Level management
  async getAllLevels() {
    const response = await apiClient.get('/admin/levels');
    return response.data;
  }

  async getLevelDetails(levelId) {
    const response = await apiClient.get(`/admin/levels/${levelId}`);
    return response.data;
  }

  async createLevel(levelData, photoFile, onUploadProgress) {
    const formData = new FormData();
    
    // Add level data
    Object.keys(levelData).forEach(key => {
      if (levelData[key] !== undefined && levelData[key] !== null) {
        if (Array.isArray(levelData[key])) {
          levelData[key].forEach(item => formData.append(key, item));
        } else {
          formData.append(key, levelData[key]);
        }
      }
    });
    
    // Add photo file
    if (photoFile) {
      formData.append('photo', photoFile);
    }

    const response = await apiClient.post('/admin/levels', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });

    return response.data;
  }

  async updateLevel(levelId, levelData, photoFile, onUploadProgress) {
    const formData = new FormData();
    
    // Add level data
    Object.keys(levelData).forEach(key => {
      if (levelData[key] !== undefined && levelData[key] !== null) {
        if (Array.isArray(levelData[key])) {
          levelData[key].forEach(item => formData.append(key, item));
        } else {
          formData.append(key, levelData[key]);
        }
      }
    });
    
    // Add photo file if provided
    if (photoFile) {
      formData.append('photo', photoFile);
    }

    const response = await apiClient.put(`/admin/levels/${levelId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });

    return response.data;
  }

  async deleteLevel(levelId) {
    const response = await apiClient.delete(`/admin/levels/${levelId}`);
    return response.data;
  }

  // Submission management
  async getAllSubmissions(params = {}) {
    const response = await apiClient.getPaginated('/admin/submissions', params);
    return response.data;
  }

  async getSubmissionDetails(submissionId) {
    const response = await apiClient.get(`/admin/submissions/${submissionId}`);
    return response.data;
  }

  async approveSubmission(submissionId) {
    const response = await apiClient.patch(`/admin/submissions/${submissionId}/approve`);
    return response.data;
  }

  async rejectSubmission(submissionId, rejectionReason) {
    const response = await apiClient.patch(`/admin/submissions/${submissionId}/reject`, {
      rejectionReason
    });
    return response.data;
  }

  async reprocessSubmission(submissionId) {
    const response = await apiClient.post(`/admin/submissions/${submissionId}/reprocess`);
    return response.data;
  }

  // Game state management
  async getGameState() {
    const response = await apiClient.get('/admin/game-state');
    return response.data;
  }

  async startGame() {
    const response = await apiClient.post('/admin/game/start');
    return response.data;
  }

  async pauseGame() {
    const response = await apiClient.post('/admin/game/pause');
    return response.data;
  }

  async resumeGame() {
    const response = await apiClient.post('/admin/game/resume');
    return response.data;
  }

  async endGame() {
    const response = await apiClient.post('/admin/game/end');
    return response.data;
  }

  async declareWinner(teamId) {
    const response = await apiClient.post('/admin/game/declare-winner', { teamId });
    return response.data;
  }

  // Leaderboard and rankings
  async getAdminLeaderboard() {
    const response = await apiClient.get('/admin/leaderboard');
    return response.data;
  }

  async exportLeaderboard() {
    const response = await apiClient.get('/admin/leaderboard/export');
    return response.data;
  }

  async recalculateLeaderboard() {
    const response = await apiClient.post('/admin/leaderboard/recalculate');
    return response.data;
  }

  // Analytics and reporting
  async getAnalytics() {
    const response = await apiClient.get('/admin/analytics');
    return response.data;
  }

  async getTeamAnalytics() {
    const response = await apiClient.get('/admin/analytics/teams');
    return response.data;
  }

  async getLevelAnalytics() {
    const response = await apiClient.get('/admin/analytics/levels');
    return response.data;
  }

  async getSubmissionAnalytics() {
    const response = await apiClient.get('/admin/analytics/submissions');
    return response.data;
  }

  async generateReports(reportType, format = 'json') {
    const response = await apiClient.get('/admin/reports', {
      params: { reportType, format }
    });
    return response.data;
  }

  // System settings and configuration
  async getSystemSettings() {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  }

  async updateSystemSettings(settings) {
    const response = await apiClient.put('/admin/settings', settings);
    return response.data;
  }

  async getSystemLogs() {
    const response = await apiClient.get('/admin/logs');
    return response.data;
  }

  async toggleMaintenanceMode(enabled) {
    const response = await apiClient.post('/admin/maintenance', { enabled });
    return response.data;
  }

  // Admin user management
  async getAllAdmins() {
    const response = await apiClient.get('/admin/admins');
    return response.data;
  }

  async createAdmin(adminData) {
    const response = await apiClient.post('/admin/admins', adminData);
    return response.data;
  }

  async updateAdmin(adminId, updates) {
    const response = await apiClient.put(`/admin/admins/${adminId}`, updates);
    return response.data;
  }

  async deleteAdmin(adminId) {
    const response = await apiClient.delete(`/admin/admins/${adminId}`);
    return response.data;
  }

  // Level assignment management
  async assignLevelToTeam(levelId, teamId) {
    const response = await apiClient.post(`/admin/levels/${levelId}/assign`, { teamId });
    return response.data;
  }

  async removeLevelFromTeam(levelId, teamId) {
    const response = await apiClient.delete(`/admin/levels/${levelId}/assign/${teamId}`);
    return response.data;
  }

  async assignRandomLevels(levelCount = 5) {
    const response = await apiClient.post('/admin/levels/assign-random', { levelCount });
    return response.data;
  }

  // Level statistics
  async getLevelStats() {
    const response = await apiClient.get('/admin/levels/stats');
    return response.data;
  }

  async getLevelSpecificStats(levelId) {
    const response = await apiClient.get(`/admin/levels/${levelId}/stats`);
    return response.data;
  }

  async getDifficultyAnalysis() {
    const response = await apiClient.get('/admin/levels/difficulty-analysis');
    return response.data;
  }

  // Level verification and testing
  async testLevelImage(levelId, testImage, onUploadProgress) {
    const formData = new FormData();
    formData.append('photo', testImage);

    const response = await apiClient.post(`/admin/levels/${levelId}/test`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });

    return response.data;
  }

  async getLevelVerificationData(levelId) {
    const response = await apiClient.get(`/admin/levels/${levelId}/verification`);
    return response.data;
  }

  // Utility methods for admin operations
  async bulkAction(action, itemIds, additionalData = {}) {
    const response = await apiClient.post('/admin/bulk-action', {
      action,
      itemIds,
      ...additionalData
    });
    return response.data;
  }

  async exportData(dataType, format = 'csv', filters = {}) {
    const response = await apiClient.get(`/admin/export/${dataType}`, {
      params: { format, ...filters }
    });
    return response.data;
  }

  // Search and filter helpers
  async searchTeams(query, filters = {}) {
    return this.getAllTeams({ search: query, ...filters });
  }

  async searchSubmissions(query, filters = {}) {
    return this.getAllSubmissions({ search: query, ...filters });
  }

  async searchLevels(query, filters = {}) {
    return this.getAllLevels({ search: query, ...filters });
  }
}

export const adminService = new AdminService();
export default adminService;
