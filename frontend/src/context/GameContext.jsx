import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { teamService } from '../services/teamService';
import { useAuth } from './AuthContext';

const GameContext = createContext();

const initialState = {
  currentLevel: null,
  assignedLevels: [],
  completedLevels: [],
  progress: {
    totalLevels: 0,
    completedLevels: 0,
    progressPercentage: 0
  },
  gameStatus: 'not_started',
  finalUnlocked: false,
  finalSubmitted: false,
  submissions: [],
  leaderboard: [],
  isLoading: false,
  error: null
};

const gameReducer = (state, action) => {
  switch (action.type) {
    case 'GAME_LOADING':
      return { ...state, isLoading: true, error: null };
    
    case 'GAME_LOADED':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        error: null
      };
    
    case 'LEVEL_COMPLETED':
      const newCompletedLevels = [...state.completedLevels, action.payload];
      const newProgress = {
        totalLevels: state.assignedLevels.length,
        completedLevels: newCompletedLevels.length,
        progressPercentage: (newCompletedLevels.length / state.assignedLevels.length) * 100
      };
      
      return {
        ...state,
        completedLevels: newCompletedLevels,
        progress: newProgress,
        currentLevel: state.assignedLevels[newCompletedLevels.length] || null
      };
    
    case 'FINAL_UNLOCKED':
      return {
        ...state,
        finalUnlocked: true
      };
    
    case 'FINAL_SUBMITTED':
      return {
        ...state,
        finalSubmitted: true
      };
    
    case 'SUBMISSION_ADDED':
      return {
        ...state,
        submissions: [action.payload, ...state.submissions]
      };
    
    case 'LEADERBOARD_UPDATED':
      return {
        ...state,
        leaderboard: action.payload
      };
    
    case 'GAME_STATUS_UPDATED':
      return {
        ...state,
        gameStatus: action.payload
      };
    
    case 'GAME_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET_GAME':
      return {
        ...initialState,
        isLoading: false
      };
    
    default:
      return state;
  }
};

export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Load game data only when authenticated and user is a team member
  useEffect(() => {
    if (isAuthenticated && user && user.type === 'team') {
      loadGameData();
    }
  }, [isAuthenticated, user]);

  const loadGameData = async () => {
    dispatch({ type: 'GAME_LOADING' });
    
    try {
      const [assignedLevels, progress, gameStatusRes, submissions] = await Promise.all([
        teamService.getAssignedLevels(),
        teamService.getTeamProgress(),
        teamService.getGameStatus(),
        teamService.getTeamSubmissions()
      ]);

      const currentLevel = assignedLevels.find(level => {
        const levelIdStr = String(level._id);
        return !progress.completedLevels.some(completed => String(completed.levelId) === levelIdStr);
      });

      dispatch({
        type: 'GAME_LOADED',
        payload: {
          assignedLevels: Array.isArray(assignedLevels) ? assignedLevels : [],
          completedLevels: Array.isArray(progress.completedLevels) ? progress.completedLevels : [],
          currentLevel,
          progress: {
            totalLevels: Array.isArray(assignedLevels) ? assignedLevels.length : 0,
            completedLevels: Array.isArray(progress.completedLevels) ? progress.completedLevels.length : 0,
            progressPercentage: typeof progress.progressPercentage === 'number' ? progress.progressPercentage : 0
          },
          gameStatus: typeof gameStatusRes.gameStatus === 'string' ? gameStatusRes.gameStatus : 'not_started',
          finalUnlocked: !!gameStatusRes.finalUnlocked,
          finalSubmitted: !!gameStatusRes.finalSubmitted,
          submissions: Array.isArray(submissions) ? submissions : []
        }
      });
    } catch (error) {
      dispatch({
        type: 'GAME_ERROR',
        payload: error.response?.data?.message || 'Failed to load game data'
      });
    }
  };

  // Add alert callback for photo submission
  const submitPhoto = async (levelId, photoFile, alertCallback) => {
    try {
      const result = await teamService.submitPhoto(levelId, photoFile);
      if (result.completed) {
        dispatch({
          type: 'LEVEL_COMPLETED',
          payload: {
            levelId,
            completedAt: new Date(),
            score: result.submission.similarityScore
          }
        });
        const newProgress = {
          totalLevels: state.assignedLevels.length,
          completedLevels: state.completedLevels.length + 1,
          progressPercentage: ((state.completedLevels.length + 1) / state.assignedLevels.length) * 100
        };
        if (newProgress.completedLevels === newProgress.totalLevels) {
          dispatch({ type: 'FINAL_UNLOCKED' });
        }
        if (alertCallback) alertCallback('Photo has been auto-approved! Move to the next round.');
      } else {
        if (alertCallback) alertCallback('Photo has been submitted for approval.');
      }
      dispatch({
        type: 'SUBMISSION_ADDED',
        payload: result.submission
      });
      return result;
    } catch (error) {
      if (alertCallback) alertCallback(error.message || 'Photo submission failed.');
      throw error;
    }
  };

  const submitFinal = async (photoFile) => {
    try {
      const result = await teamService.submitFinal(photoFile);
      
      if (result.completed) {
        dispatch({ type: 'FINAL_SUBMITTED' });
      }

      // Add submission to list
      dispatch({
        type: 'SUBMISSION_ADDED',
        payload: result.submission
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  const loadLeaderboard = async () => {
    try {
      const leaderboard = await teamService.getLeaderboard();
      dispatch({
        type: 'LEADERBOARD_UPDATED',
        payload: leaderboard
      });
      return leaderboard;
    } catch (error) {
      throw error;
    }
  };

  const refreshGameData = () => {
    loadGameData();
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const value = {
    ...state,
    submitPhoto,
    submitFinal,
    loadLeaderboard,
    refreshGameData,
    clearError,
    resetGame
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
