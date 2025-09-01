
import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { formatLeaderboardDate, formatDate, formatGameTime, formatRelativeTime } from '../utils/formatDate';


const Leaderboard = ({ compact = false, maxItems = 10, autoRefreshInterval = 30 }) => {
  const { leaderboard, loadLeaderboard } = useGame();
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('score'); // score, time, completed
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timer, setTimer] = useState(autoRefreshInterval);
  const intervalRef = useRef();

  // Load leaderboard on mount and set up auto-refresh
  useEffect(() => {
    loadLeaderboardData();
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          loadLeaderboardData();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line
  }, []);

  // Reset timer on manual refresh
  const loadLeaderboardData = async () => {
    setIsLoading(true);
    try {
      await loadLeaderboard();
      setLastUpdated(new Date());
      setTimer(autoRefreshInterval);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortedLeaderboard = () => {
    if (!leaderboard || leaderboard.length === 0) return [];

    return [...leaderboard].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'score':
          aValue = a.averageScore || 0;
          bValue = b.averageScore || 0;
          break;
        case 'time':
          aValue = a.totalTime || 0;
          bValue = b.totalTime || 0;
          break;
        case 'completed':
          aValue = a.completedLevels || 0;
          bValue = b.completedLevels || 0;
          break;
        default:
          aValue = a.averageScore || 0;
          bValue = b.averageScore || 0;
      }

      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (sortOrder === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
          🥇
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-sm">
          🥈
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
          🥉
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
          {rank}
        </div>
      );
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const sortedLeaderboard = getSortedLeaderboard();
  const displayLeaderboard = compact ? sortedLeaderboard.slice(0, maxItems) : sortedLeaderboard;


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  if (displayLeaderboard.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No teams have completed levels yet.</p>
        <p className="text-sm mt-2">Be the first to start playing!</p>
      </div>
    );
  }


  return (
    <div className="bg-white rounded-lg shadow">
      {!compact && (
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Leaderboard</h2>
            <p className="text-sm text-gray-600 mt-1">Teams ranked by performance</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">Auto-refresh in <span className="font-semibold text-blue-600">{timer}s</span></span>
            {lastUpdated && (
              <span className="text-xs text-gray-400">Last updated: {formatRelativeTime(lastUpdated)}</span>
            )}
            <button
              onClick={loadLeaderboardData}
              className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
              title="Refresh now"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('completed')}
              >
                <div className="flex items-center space-x-1">
                  <span>Levels</span>
                  {getSortIcon('completed')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('score')}
              >
                <div className="flex items-center space-x-1">
                  <span>Score</span>
                  {getSortIcon('score')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('time')}
              >
                <div className="flex items-center space-x-1">
                  <span>Finish Time</span>
                  {getSortIcon('time')}
                </div>
              </th>
              {!compact && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayLeaderboard.map((team, index) => (
              <tr key={team._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRankBadge(index + 1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                        {team.teamName ? team.teamName.charAt(0).toUpperCase() : 'T'}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {team.teamName || 'Unknown Team'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {team.memberCount ?? 1} member{(team.memberCount ?? 1) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="font-medium">{team.completedLevels ?? team.levelsCompleted ?? 0}</span>
                    <span className="text-gray-500 ml-1">/ {team.totalLevels ?? 0}</span>
                  </div>
                  {!compact && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((team.completedLevels ?? team.levelsCompleted ?? 0) / (team.totalLevels ?? 1)) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-semibold ${getScoreColor(team.averageScore || 0)}`}>
                    {team.averageScore ? Math.round(team.averageScore) : 0}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {team.formattedSubmissionTime
                    ? team.formattedSubmissionTime
                    : 'N/A'}
                </td>
                {!compact && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {team.lastActivity ? formatLeaderboardDate(team.lastActivity) : 'N/A'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {compact && displayLeaderboard.length < sortedLeaderboard.length && (
        <div className="px-6 py-3 border-t border-gray-200 text-center">
          <button
            onClick={() => window.location.href = '/leaderboard'}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Full Leaderboard →
          </button>
        </div>
      )}

      {!compact && (
        <div className="px-6 py-3 border-t border-gray-200 text-center">
          <button
            onClick={loadLeaderboardData}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Refresh Leaderboard
          </button>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
