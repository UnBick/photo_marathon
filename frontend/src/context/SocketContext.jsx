import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from "socket.io-client";
import { useAuth } from '../context/AuthContext';

<<<<<<< HEAD
// Derive Socket URL:
// - If VITE_SOCKET_URL is set, use it
// - Else, use same-origin (window.location.origin) so it never points to the frontend host accidentally
//   when deployed behind a reverse proxy that forwards /socket.io to backend
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
=======
// Use environment variable with fallback
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://photo-marathon.onrender.com";
>>>>>>> origin/main

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);

  // Debug logging to check what URL is being used
  useEffect(() => {
    console.log('🔍 SOCKET_URL being used:', SOCKET_URL);
    console.log('🔍 Environment variable VITE_SOCKET_URL:', import.meta.env.VITE_SOCKET_URL);
  }, []);

  useEffect(() => {
    if (isAuthenticated && token && !socketRef.current) {
      console.log('🚀 Initializing socket connection to:', SOCKET_URL);
      
      // Initialize socket connection to backend
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        query: { token }, // Also pass token in query for compatibility
        extraHeaders: {
          'Authorization': `Bearer ${token}`
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true
      });

      // Connection event handlers
      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected:', socketRef.current.id);
        console.log('🔗 Connected to:', SOCKET_URL);
        
        // Join team room automatically after successful connection
        if (user?.teamId) {
          socketRef.current.emit('join-team', user.teamId);
          console.log('🏠 Auto-joining team room:', user.teamId);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('🚨 Socket connection error:', error);
        console.error('🚨 Tried to connect to:', SOCKET_URL);
        console.error('🚨 Error details:', error.message);
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      });

      socketRef.current.on('reconnect_error', (error) => {
        console.error('🔄❌ Socket reconnection failed:', error);
      });

      // Team room events
      socketRef.current.on('joined-team', (data) => {
        console.log('🏠 Successfully joined team room:', data);
      });

      // Game-specific event handlers
      socketRef.current.on('game_started', (data) => {
        console.log('Game started:', data);
        window.dispatchEvent(new CustomEvent('game_started', { detail: data }));
      });

      socketRef.current.on('game_paused', (data) => {
        console.log('Game paused:', data);
        window.dispatchEvent(new CustomEvent('game_paused', { detail: data }));
      });

      socketRef.current.on('game_resumed', (data) => {
        console.log('Game resumed:', data);
        window.dispatchEvent(new CustomEvent('game_resumed', { detail: data }));
      });

      socketRef.current.on('game_ended', (data) => {
        console.log('Game ended:', data);
        window.dispatchEvent(new CustomEvent('game_ended', { detail: data }));
      });

      socketRef.current.on('winner_declared', (data) => {
        console.log('Winner declared:', data);
        window.dispatchEvent(new CustomEvent('winner_declared', { detail: data }));
      });

      // Level completion events
      socketRef.current.on('level_completed', (data) => {
        console.log('Level completed:', data);
        window.dispatchEvent(new CustomEvent('level_completed', { detail: data }));
      });

      // Submission events
      socketRef.current.on('submission_approved', (data) => {
        console.log('Submission approved:', data);
        window.dispatchEvent(new CustomEvent('submission_approved', { detail: data }));
      });

      socketRef.current.on('submission_rejected', (data) => {
        console.log('Submission rejected:', data);
        window.dispatchEvent(new CustomEvent('submission_rejected', { detail: data }));
      });

      // Leaderboard updates
      socketRef.current.on('leaderboard_updated', (data) => {
        console.log('Leaderboard updated:', data);
        window.dispatchEvent(new CustomEvent('leaderboard_updated', { detail: data }));
      });
    }

    // Cleanup function
    return () => {
      if (socketRef.current) {
        console.log('🧹 Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token, user?.teamId]);

  // Socket utility functions
  const emit = (event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot emit - socket not connected:', event);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  // Fixed room joining functions to match server naming convention
  const joinRoom = (roomName) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join_room', { room: roomName });
    }
  };

  const leaveRoom = (roomName) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave_room', { room: roomName });
    }
  };

  // Game-specific socket functions - Fixed naming to match server
  const joinGame = (gameId) => {
    joinRoom(`game-${gameId}`); // Using dash to match server
  };

  const leaveGame = (gameId) => {
    leaveRoom(`game-${gameId}`); // Using dash to match server
  };

  const joinTeamRoom = (teamId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join-team', teamId); // Use server's join-team event
    }
  };

  const leaveTeamRoom = (teamId) => {
    // Team rooms are managed by join-team event, no explicit leave needed
    console.log('Team room leave requested for:', teamId);
  };

  const joinAdminRoom = () => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('join-admin');
      }
    }
  };

  const leaveAdminRoom = () => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      leaveRoom('admin-room');
    }
  };

  // Emit game events
  const emitGameEvent = (event, data) => {
    emit(event, { ...data, timestamp: Date.now() });
  };

  const emitLevelEvent = (event, data) => {
    emitGameEvent(event, data);
  };

  const emitSubmissionEvent = (event, data) => {
    emitGameEvent(event, data);
  };

  const value = {
    socket: socketRef.current,
    connected: socketRef.current?.connected || false,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
    joinGame,
    leaveGame,
    joinTeamRoom,
    leaveTeamRoom,
    joinAdminRoom,
    leaveAdminRoom,
    emitGameEvent,
    emitLevelEvent,
    emitSubmissionEvent
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Custom hook for listening to socket events
export const useSocketEvent = (event, callback) => {
  const { on, off } = useSocket();

  useEffect(() => {
    on(event, callback);
    return () => off(event, callback);
  }, [event, callback, on, off]);
};

// Custom hook for game events
export const useGameEvents = () => {
  const { joinGame, leaveGame, emitGameEvent } = useSocket();

  return {
    joinGame,
    leaveGame,
    emitGameEvent
  };
};

// Custom hook for team events
export const useTeamEvents = () => {
  const { joinTeamRoom, leaveTeamRoom, emitLevelEvent, emitSubmissionEvent } = useSocket();

  return {
    joinTeamRoom,
    leaveTeamRoom,
    emitLevelEvent,
    emitSubmissionEvent
  };
};

// Custom hook for admin events
export const useAdminEvents = () => {
  const { joinAdminRoom, leaveAdminRoom } = useSocket();

  return {
    joinAdminRoom,
    leaveAdminRoom
  };
};