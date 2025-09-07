import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import {
  Camera,
  Users,
  FileText,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Square,
  Settings,
  Bell,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Activity,
} from "lucide-react";
import apiClient from '../services/apiClient';

let socket;

const AdminDashboard = () => {
  // ...existing code...
  // Add reset game handler
  // --- Dashboard fetch and refresh helpers ---
  const mapDashboardData = (data) => {
    setStats({
      totalTeams: data.overview?.totalTeams ?? 0,
      activeTeams: data.overview?.activeTeams ?? 0,
      completedTeams: data.overview?.completedTeams ?? 0,
      totalSubmissions: data.overview?.totalSubmissions ?? 0,
      pendingReviews: data.overview?.pendingSubmissions ?? 0,
      averageCompletionTime: "N/A",
      completionRate: Math.round(
        ((data.overview?.activeTeams ?? 0) /
          (data.overview?.totalTeams || 1)) *
          100
      ),
    });

    // Set gameStatus from backend gameState.status (matches backend response)
    if (data.gameState && data.gameState.status) {
      setGameStatus(data.gameState.status);
    }

    setRecentActivity(
      (data.recentSubmissions || []).map((sub, idx) => ({
        id: sub._id || idx,
        type: sub.status,
        message:
          sub.status === "pending"
            ? "New photo submission awaiting review"
            : sub.status === "approved"
            ? `Submission approved for "${sub.teamId?.teamName || "Unknown"}"`
            : sub.status === "rejected"
            ? "Submission rejected"
            : "Submission update",
        timestamp: new Date(sub.createdAt).toLocaleString(),
        status:
          sub.status === "approved"
            ? "success"
            : sub.status === "pending"
            ? "warning"
            : sub.status === "rejected"
            ? "error"
            : "info",
      }))
    );
  };

  const fetchDashboard = async () => {
    try {
      if (!user?.token) {
        throw new Error('No access token found');
      }
      const res = await apiClient.get('/admin/dashboard', {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${user.token}`
        },
      });
      mapDashboardData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
      setLoading(false);
    }
  };

  const handleResetGame = async () => {
    setResetGameLoading(true);
    setGameControlError("");
    try {
      await apiClient.post('/admin/game/reset', {}, {
        withCredentials: true,
        headers: {
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
        },
      });
      setGameControlError("");
      await fetchDashboard();
    } catch (err) {
      setGameControlError(`Failed to reset game: ${err.message}`);
      console.error("Failed to reset game:", err);
    } finally {
      setResetGameLoading(false);
    }
  };
  // Add reset game control loading
  const [resetGameLoading, setResetGameLoading] = useState(false);
  const { user } = useAuth();
  const [gameStatus, setGameStatus] = useState("not_started");
  const { isLoading } = useGame();
  const [hasGameState, setHasGameState] = useState(true);

  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameControlLoading, setGameControlLoading] = useState(null);
  const [gameControlError, setGameControlError] = useState("");

  // --- SOCKET.IO + INITIAL FETCH ---
  useEffect(() => {

    const fetchGameState = async () => {
      try {
        const res = await apiClient.get('/admin/game-state', {
          withCredentials: true,
          headers: {
            ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
          },
        });
        setHasGameState(!!res.data && !!res.data._id);
      } catch (err) {
        setHasGameState(false);
      }
    };

    fetchDashboard();
    fetchGameState();

    // --- SOCKET.IO ---
    socket = io("/", {
      withCredentials: true,
      auth: { token: user?.token },
    });

    socket.on("connect", () => console.log("✅ Connected to socket server"));

    socket.on("dashboardUpdate", (data) => {
      console.log("📊 Dashboard update received:", data);
      mapDashboardData(data);
    });

    socket.on("submissionUpdate", (sub) => {
      console.log("📸 New submission:", sub);
      setRecentActivity((prev) => [
        {
          id: sub._id,
          type: sub.status,
          message: `${sub.teamId?.teamName || "A team"} submitted ${
            sub.levelId?.title || "a level"
          }`,
          timestamp: new Date(sub.createdAt).toLocaleString(),
          status:
            sub.status === "approved"
              ? "success"
              : sub.status === "pending"
              ? "warning"
              : sub.status === "rejected"
              ? "error"
              : "info",
        },
        ...prev,
      ]);
    });

    socket.on("gameStatusUpdate", (status) => {
      console.log("🎮 Game status update:", status);
      // you could update game context here if needed
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user?.token]);

  // --- GAME CONTROLS ---
  const handleGameControl = async (action) => {
  // ...existing code...
    setGameControlLoading(action);
    setGameControlError("");
    try {
      await apiClient.post(`/admin/game/${action}`, {}, {
        withCredentials: true,
        headers: {
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
        },
      });
      setGameControlError("");
      await fetchDashboard();
    } catch (err) {
      setGameControlError(`Failed to ${action} game: ${err.message}`);
      console.error(`Failed to ${action} game:`, err);
    } finally {
      setGameControlLoading(null);
    }
  };

  // --- HELPERS ---
  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getGameStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "running":
        return "text-green-600 bg-green-50 border-green-200";
      case "paused":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "ended":
      case "completed":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  // --- LOADING ---
  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <p>
                Welcome back, {user?.firstName || user?.username}! Last updated: {" "}
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* GAME STATUS CARD */}
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Game Status
            </h2>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getGameStatusColor(
                hasGameState && gameStatus ? gameStatus : "not_started"
              )}`}
            >
              {hasGameState && gameStatus ? gameStatus : "Not Started"}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={<Users />} label="Total Teams" value={stats.totalTeams} />
            <StatCard
              icon={<TrendingUp />}
              label="Active Teams"
              value={stats.activeTeams}
            />
            <StatCard
              icon={<CheckCircle />}
              label="Completed"
              value={stats.completedTeams}
            />
            <StatCard
              icon={<FileText />}
              label="Pending Reviews"
              value={stats.pendingReviews}
            />
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<Camera />} label="Total Submissions" value={stats.totalSubmissions} />
          <StatCard icon={<BarChart3 />} label="Completion Rate" value={`${stats.completionRate}%`} />
          <StatCard icon={<Clock />} label="Avg. Completion Time" value={stats.averageCompletionTime} />
        </div>

        {/* QUICK ACTIONS */}
        <QuickActions pendingReviews={stats.pendingReviews} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GAME CONTROLS */}
          <div>
            {/* Inline game controls with End Game button disabled if no game state */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Play className="w-5 h-5 mr-2 text-gray-600" />
                Game Controls
              </h2>
              {!hasGameState ? (
                <button
                  onClick={async () => {
                    try {
                      await apiClient.post('/admin/game/init', {}, {
                        withCredentials: true,
                        headers: {
                          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
                        },
                      });
                      setHasGameState(true);
                      await fetchDashboard();
                    } catch (err) {
                      setGameControlError('Failed to initialize game state.');
                    }
                  }}
                  className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors mb-4"
                >
                  Initialize Game
                </button>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleGameControl('start')}
                    disabled={gameControlLoading === 'start' || gameStatus !== 'setup'}
                    className="flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {gameControlLoading === 'start' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Start
                  </button>
                  <button
                    onClick={() => handleGameControl('pause')}
                    disabled={gameControlLoading === 'pause' || gameStatus !== 'active'}
                    className="flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {gameControlLoading === 'pause' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Pause className="w-4 h-4 mr-2" />
                    )}
                    Pause
                  </button>
                  <button
                    onClick={() => handleGameControl('resume')}
                    disabled={gameControlLoading === 'resume' || gameStatus !== 'paused'}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {gameControlLoading === 'resume' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Resume
                  </button>
                  <button
                    onClick={() => handleGameControl('end')}
                    disabled={gameControlLoading === 'end' || gameStatus === 'ended' || gameStatus === 'completed' || !hasGameState}
                    className="flex items-center justify-center bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {gameControlLoading === 'end' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Square className="w-4 h-4 mr-2" />
                    )}
                    End
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleResetGame}
              disabled={resetGameLoading}
              className={`mt-4 w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-3 px-4 rounded-lg transition-colors`}
            >
              {resetGameLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Reset Game
            </button>
          </div>
          {gameControlError && (
            <div className="col-span-2 mb-4">
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg">
                {gameControlError}
              </div>
            </div>
          )}

          {/* RECENT ACTIVITY */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-gray-600" />
              Recent Activity
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      {getStatusIcon(activity.status)}
                      <span className="text-gray-700 ml-3 text-sm">
                        {activity.message}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {activity.timestamp}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link
                  to="/admin/activity"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center justify-center"
                >
                  View all activity
                  <Calendar className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SMALL COMPONENTS ---
const StatCard = ({ icon, label, value }) => (
  <div className="text-center">
    <div className="bg-blue-50 rounded-lg p-4 mb-3 flex items-center justify-center">
      {React.cloneElement(icon, { className: "w-8 h-8 text-blue-600" })}
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-sm text-gray-600">{label}</div>
  </div>
);

const QuickActions = ({ pendingReviews }) => (
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
      <Settings className="w-5 h-5 mr-2 text-gray-600" />
      Quick Actions
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <QuickActionCard to="/admin/levels" icon={<Camera />} title="Manage Levels" desc="Create, edit, and organize challenges" />
      <QuickActionCard to="/admin/teams" icon={<Users />} title="Manage Teams" desc="View progress & registrations" />
      <QuickActionCard to="/admin/submissions" icon={<FileText />} title="Review Submissions" desc={`Approve/reject photos ${pendingReviews > 0 ? `(${pendingReviews} pending)` : ""}`} />
  <QuickActionCard to="/admin/leaderboard" icon={<BarChart3 />} title="leaderboard" desc="View statistics & insights" />
    </div>
  </div>
);

const QuickActionCard = ({ to, icon, title, desc }) => (
  <Link
    to={to}
    className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all duration-200"
  >
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-blue-50 group-hover:bg-blue-100 mb-4">
        {React.cloneElement(icon, { className: "h-6 w-6 text-blue-600" })}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  </Link>
);


const GameControls = ({ handleGameControl, gameControlLoading, gameStatus }) => {
  const actions = [
    { label: "Start", action: "start", color: "green", icon: <Play />, isDisabled: status => status !== "setup" },
    { label: "Pause", action: "pause", color: "yellow", icon: <Pause />, isDisabled: status => status !== "active" },
    { label: "Resume", action: "resume", color: "blue", icon: <RotateCcw />, isDisabled: status => status !== "paused" },
    { label: "End", action: "end", color: "red", icon: <Square />, isDisabled: status => status === "ended" || status === "completed" },
  ];

  // ✅ Explicit color → Tailwind classes mapping
  const colorClasses = {
    green: "bg-green-600 hover:bg-green-700 disabled:bg-green-400",
    yellow: "bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400",
    blue: "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400",
    red: "bg-red-600 hover:bg-red-700 disabled:bg-red-400",
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <Play className="w-5 h-5 mr-2 text-gray-600" />
        Game Controls
      </h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 grid grid-cols-2 gap-4">
        {actions.map(({ label, action, color, icon, isDisabled }) => (
          <button
            key={action}
            onClick={() => handleGameControl(action)}
            disabled={gameControlLoading === action || isDisabled?.(gameStatus)}
            className={`flex items-center justify-center ${colorClasses[color]} text-white font-medium py-3 px-4 rounded-lg transition-colors`}
          >
            {gameControlLoading === action ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              React.cloneElement(icon, { className: "w-4 h-4 mr-2" })
            )}
            {label} Game
          </button>
        ))}
      </div>
    </div>
  );
};


export default AdminDashboard;
