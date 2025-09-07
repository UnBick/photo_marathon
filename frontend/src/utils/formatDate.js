/**
 * Utility functions for formatting dates and timestamps
 */

// Format a date for display in the leaderboard
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return dateObj.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Format a date for relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
    }
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid Date';
  }
};

// Format a date for the game timer
export const formatGameTime = (seconds, alwaysShowSeconds = false) => {
  if (!seconds || seconds < 0) return '0:00';
  try {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0 || alwaysShowSeconds) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error formatting game time:', error);
    return '0:00';
  }
};

// Format a date for the leaderboard (compact)
export const formatLeaderboardDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    const now = new Date();
    const diffInHours = Math.floor((now - dateObj) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return formatDate(date, { month: 'short', day: 'numeric' });
    }
  } catch (error) {
    console.error('Error formatting leaderboard date:', error);
    return 'N/A';
  }
};

// Format a date for submission history
export const formatSubmissionDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now - dateObj) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return formatDate(date, { month: 'short', day: 'numeric', hour: '2-digit' });
    }
  } catch (error) {
    console.error('Error formatting submission date:', error);
    return 'N/A';
  }
};

// Format a date for the admin dashboard
export const formatAdminDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    return formatDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting admin date:', error);
    return 'N/A';
  }
};

// Format a date range for analytics
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'N/A';
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid Date Range';
    
    const startFormatted = formatDate(start, { month: 'short', day: 'numeric' });
    const endFormatted = formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (start.getFullYear() === end.getFullYear()) {
      return `${startFormatted} - ${endFormatted}`;
    } else {
      return `${startFormatted}, ${start.getFullYear()} - ${endFormatted}`;
    }
  } catch (error) {
    console.error('Error formatting date range:', error);
    return 'Invalid Date Range';
  }
};

// Check if a date is today
export const isToday = (date) => {
  if (!date) return false;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return false;
    
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
};

// Check if a date is this week
export const isThisWeek = (date) => {
  if (!date) return false;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return false;
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return dateObj >= startOfWeek && dateObj <= endOfWeek;
  } catch (error) {
    console.error('Error checking if date is this week:', error);
    return false;
  }
};

// Get the start of a day
export const getStartOfDay = (date) => {
  if (!date) return null;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    dateObj.setHours(0, 0, 0, 0);
    return dateObj;
  } catch (error) {
    console.error('Error getting start of day:', error);
    return null;
  }
};

// Get the end of a day
export const getEndOfDay = (date) => {
  if (!date) return null;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    dateObj.setHours(23, 59, 59, 999);
    return dateObj;
  } catch (error) {
    console.error('Error getting end of day:', error);
    return null;
  }
};

// Parse a date string safely
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

// Export all functions as default
export default {
  formatDate,
  formatRelativeTime,
  formatGameTime,
  formatLeaderboardDate,
  formatSubmissionDate,
  formatAdminDate,
  formatDateRange,
  isToday,
  isThisWeek,
  getStartOfDay,
  getEndOfDay,
  parseDate
};
