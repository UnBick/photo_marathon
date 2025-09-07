import axios from 'axios';

// Use VITE_API_BASE_URL for all API requests, fallback to '/api' if not set
// In production behind a reverse proxy, the frontend should call same-origin '/api'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000
  // Do NOT set a global Content-Type header here!
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear invalid token
      localStorage.removeItem('token');
      
      // Redirect to login page
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle 403 Forbidden errors
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
      // Could redirect to unauthorized page or show access denied message
    }

    // Handle 500 Server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
      // Could show generic server error message
    }

    return Promise.reject(error);
  }
);

// Helper method to handle file uploads
apiClient.uploadFile = (url, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('photo', file);

  return apiClient.post(url, formData, {
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
};

// Helper method to handle file downloads
apiClient.downloadFile = (url, filename) => {
  return apiClient.get(url, {
    responseType: 'blob',
  }).then((response) => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  });
};

// Helper method to handle pagination
apiClient.getPaginated = (url, params = {}) => {
  const { page = 1, limit = 20, ...otherParams } = params;
  
  return apiClient.get(url, {
    params: {
      page,
      limit,
      ...otherParams,
    },
  });
};

// Helper method to handle search
apiClient.search = (url, searchTerm, params = {}) => {
  return apiClient.get(url, {
    params: {
      search: searchTerm,
      ...params,
    },
  });
};

// Export the configured client
export default apiClient;
