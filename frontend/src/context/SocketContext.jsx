import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from "socket.io-client";
// ...existing code...
const socket = io(import.meta.env.VITE_SOCKET_URL || "https://photo-marathon.onrender.com", {
  transports: ["websocket", "polling"],
  // ...other options
});
  const { user, token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && token && !socketRef.current) {
      // Initialize socket connection
      socketRef.current = io('/', {
        auth: {
          token
        },
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      socketRef.current.on('connect', () => {
        console.log('Socket connected:', socketRef.current.id);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Game-specific event handlers
      socketRef.current.on('game_started', (data) => {
        console.log('Game started:', data);
        // Emit custom event for components to listen to
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

      // Team-specific events
      if (user) {
  socketRef.current.emit('join-team', user._id);
      }
    }

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token, user]);

  // Join team room when user changes
  useEffect(() => {
    if (socketRef.current && user && user._id) {
      socketRef.current.emit('join-team', user._id);
    } else {
      // Do not emit if user._id is missing
      console.warn('Socket: Not joining team room, user._id is missing:', user);
    }
  }, [user]);

  // Socket utility functions
  const emit = (event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
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

  // Game-specific socket functions
  const joinGame = (gameId) => {
    joinRoom(`game_${gameId}`);
  };

  const leaveGame = (gameId) => {
    leaveRoom(`game_${gameId}`);
  };

  const joinTeamRoom = (teamId) => {
    joinRoom(`team_${teamId}`);
  };

  const leaveTeamRoom = (teamId) => {
    leaveRoom(`team_${teamId}`);
  };

  const joinAdminRoom = () => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      joinRoom('admin');
    }
  };

  const leaveAdminRoom = () => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      leaveRoom('admin');
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
