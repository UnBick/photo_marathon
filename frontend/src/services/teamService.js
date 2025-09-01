import apiClient from './apiClient';

class TeamService {
  // Team profile and progress
  async getTeamProfile() {
    const response = await apiClient.get('/team/profile');
    return response.data;
  }

  async updateTeamProfile(profileData) {
    const response = await apiClient.put('/team/profile', profileData);
    return response.data;
  }

  async getTeamProgress() {
    const response = await apiClient.get('/team/progress');
    return response.data;
  }

  // Level management
  async getAssignedLevels() {
    const response = await apiClient.get('/team/levels');
    return response.data;
  }

  async getLevelDetails(levelId) {
    const response = await apiClient.get(`/team/levels/${levelId}`);
    return response.data;
  }

  async getCurrentLevel() {
    const response = await apiClient.get('/team/current-level');
    return response.data;
  }

  // Photo submissions
  async submitPhoto(levelId, photoFile, onUploadProgress) {
    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await apiClient.post(`/team/levels/${levelId}/submit`, formData, {
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

  async getTeamSubmissions() {
    const response = await apiClient.get('/team/submissions');
    return response.data;
  }

  async getSubmissionDetails(submissionId) {
    const response = await apiClient.get(`/team/submissions/${submissionId}`);
    return response.data;
  }

  // Final level access
  async checkFinalAccess() {
    const response = await apiClient.get('/team/final');
    return response.data;
  }

  async submitFinal(photoFile, onUploadProgress) {
    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await apiClient.post('/team/final/submit', formData, {
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

  // Game status and leaderboard
  async getGameStatus() {
    const response = await apiClient.get('/team/game-status');
    return response.data;
  }

  async getLeaderboard() {
    const response = await apiClient.get('/team/leaderboard');
    return response.data;
  }

  // Team statistics
  async getTeamStats() {
    const response = await apiClient.get('/team/stats');
    return response.data;
  }

  async getSubmissionHistory() {
    const response = await apiClient.get('/team/history');
    return response.data;
  }

  // Level completion tracking
  async markLevelAsCompleted(levelId, score) {
    // This would typically be handled by the backend when submitting photos
    // But we can track it locally for UI updates
    return {
      levelId,
      completedAt: new Date(),
      score
    };
  }

  // Progress calculation helpers
  calculateProgress(completedLevels, totalLevels) {
    if (totalLevels === 0) return 0;
    return Math.round((completedLevels / totalLevels) * 100);
  }

  getNextLevel(assignedLevels, completedLevels) {
    const completedIds = completedLevels.map(c => c.levelId);
    return assignedLevels.find(level => !completedIds.includes(level._id));
  }

  getCompletedLevels(assignedLevels, completedLevels) {
    const completedIds = completedLevels.map(c => c.levelId);
    return assignedLevels.filter(level => completedIds.includes(level._id));
  }

  // Time tracking helpers
  formatTime(seconds) {
    if (!seconds) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Score calculation helpers
  calculateAverageScore(submissions) {
    if (!submissions || submissions.length === 0) return 0;
    
    const totalScore = submissions.reduce((sum, sub) => sum + (sub.similarityScore || 0), 0);
    return Math.round((totalScore / submissions.length) * 100) / 100;
  }

  // Level difficulty helpers
  getDifficultyColor(difficulty) {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getDifficultyIcon(difficulty) {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return '🌱';
      case 'medium':
        return '🌿';
      case 'hard':
        return '🌳';
      default:
        return '❓';
    }
  }

  // Submission status helpers
  getStatusColor(status) {
    switch (status) {
      case 'auto_approved':
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'auto_approved':
      case 'approved':
        return '✅';
      case 'pending':
        return '⏳';
      case 'rejected':
        return '❌';
      default:
        return '❓';
    }
  }

  // Validation helpers
  validatePhotoFile(file) {
    const errors = [];
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      errors.push('File must be an image');
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }
    
    // Check dimensions (optional)
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 100 || img.height < 100) {
          errors.push('Image dimensions must be at least 100x100 pixels');
        }
        resolve(errors);
      };
      img.onerror = () => {
        errors.push('Invalid image file');
        resolve(errors);
      };
      img.src = URL.createObjectURL(file);
    });
  }
}

export const teamService = new TeamService();
export default teamService;
