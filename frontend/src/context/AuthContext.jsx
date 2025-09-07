import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      console.log('[AuthContext] checkAuth: token in state:', state.token);
      if (state.token) {
        try {
          const response = await authService.getCurrentUser();
          console.log('[AuthContext] getCurrentUser response:', response);
          let user, token;
          // Support both {data: {type, admin/team, token}} and {admin/team, token}
          if (response.data?.type === 'admin' && response.data?.admin) {
            user = response.data.admin;
            user.type = 'admin';
            token = state.token;
          } else if (response.data?.type === 'team' && response.data?.team) {
            user = response.data.team;
            user.type = 'team';
            token = state.token;
          } else if (response.admin) {
            user = response.admin;
            user.type = 'admin';
            token = response.token || state.token;
          } else if (response.team) {
            user = response.team;
            user.type = 'team';
            token = response.token || state.token;
          } else {
            user = null;
            token = null;
          }
          console.log('[AuthContext] Parsed user:', user, 'Parsed token:', token);
          if (user && token) {
            user.token = token;
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user, token }
            });
          } else {
            localStorage.removeItem('token');
            dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
          }
        } catch (error) {
          console.log('[AuthContext] getCurrentUser error:', error);
          localStorage.removeItem('token');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: null });
      }
    };

    checkAuth();
  }, []);

  // Update localStorage when token changes
  useEffect(() => {
    if (state.token) {
      localStorage.setItem('token', state.token);
    } else {
      localStorage.removeItem('token');
    }
  }, [state.token]);

  const login = async (credentials) => {
    dispatch({ type: 'AUTH_START' });
    try {
      let response, user, token;
      if (credentials.userType === 'admin') {
        response = await authService.loginAdmin(credentials);
        console.log('[AuthContext] loginAdmin response:', response);
        user = response.user;
        user.type = 'admin';
        token = response.token;
      } else {
        response = await authService.loginTeam(credentials);
        console.log('[AuthContext] loginTeam response:', response);
        user = response.user;
        user.type = 'team';
        token = response.token;
      }
      console.log('[AuthContext] Parsed user:', user, 'Parsed token:', token);
      if (user && token) {
        user.token = token;
        localStorage.setItem('token', token);
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token }
        });
        return { success: true };
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: 'Login failed: missing user or token'
        });
        return { success: false, error: 'Login failed: missing user or token' };
      }
    } catch (error) {
      console.log('[AuthContext] login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({
        type: 'AUTH_FAILURE',
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  const register = async (teamData) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await authService.registerTeam(teamData);
      const { data } = response;
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: data.team, token: data.token }
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({
        type: 'AUTH_FAILURE',
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      if (state.token) {
        // Determine userType from state.user or fallback to 'team'
        const userType = state.user?.role ? 'admin' : 'team';
        await authService.logout(userType);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateUser = (updates) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
