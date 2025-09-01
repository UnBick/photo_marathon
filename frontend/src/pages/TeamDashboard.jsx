import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import PhotoCard from '../components/PhotoCard';
<<<<<<< HEAD
import Leaderboard from '../components/Leaderboard';
=======
>>>>>>> f0e38999 (Update: latest changes and fixes)
import { formatGameTime } from '../utils/formatDate';

const TeamDashboard = () => {
  const { user } = useAuth();
  const { 
    currentLevel, 
    assignedLevels, 
    completedLevels, 
    progress, 
    gameStatus, 
    finalUnlocked,
    finalSubmitted,
    submissions,
    isLoading,
    error,
    refreshGameData
  } = useGame();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    refreshGameData();
    setLastUpdated(new Date());
    // Listen for page visibility change to force refresh when returning from admin
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshGameData();
        setLastUpdated(new Date());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshGameData();
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 500); // Smooth UX delay
  };

  const getGameStatusConfig = (status) => {
    const configs = {
      active: {
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        text: 'In Progress',
        icon: '🎯'
      },
      paused: {
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        text: 'Paused',
        icon: '⏸️'
      },
      completed: {
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        text: 'Completed',
        icon: '🏆'
      },
      setup: {
        color: 'text-slate-600 bg-slate-100 border-slate-200',
        text: 'Setup',
        icon: '⚙️'
      },
      not_started: {
        color: 'text-slate-600 bg-slate-100 border-slate-200',
        text: 'Not Started',
        icon: '⏸️'
      }
    };
    return configs[status] || configs.not_started;
  };

  const getSubmissionStatusConfig = (status) => {
    // Normalize status for display
    if (status === 'manual_approved' || status === 'auto_approved' || status === 'approved') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (status === 'manual_rejected' || status === 'auto_rejected' || status === 'rejected') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (status === 'pending' || status === 'processing') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const getSubmissionStatusText = (status) => {
    if (status === 'manual_approved' || status === 'approved') {
      return '✅ Approved';
    }
    if (status === 'auto_approved') {
      return '✅ Auto-Approved';
    }
    if (status === 'manual_rejected' || status === 'auto_rejected' || status === 'rejected') {
      return '❌ Rejected';
    }
    if (status === 'pending' || status === 'processing') {
      return '⏳ Under Review';
    }
    return '⏳ Pending';
  };

  const calculateAverageScore = () => {
    if (submissions.length === 0) return 0;
    const validScores = submissions.filter(sub => sub.similarityScore).map(sub => sub.similarityScore);
    if (validScores.length === 0) return 0;
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  };

  const getPerformanceRating = (score) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-emerald-600', emoji: '🌟' };
    if (score >= 80) return { text: 'Great', color: 'text-blue-600', emoji: '⭐' };
    if (score >= 70) return { text: 'Good', color: 'text-amber-600', emoji: '👍' };
    if (score >= 60) return { text: 'Fair', color: 'text-orange-600', emoji: '👌' };
    return { text: 'Needs Improvement', color: 'text-red-600', emoji: '📈' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex justify-center items-center py-32">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-purple-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="mt-6 text-lg font-medium text-slate-600 animate-pulse">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-red-800">Unable to Load Dashboard</h3>
                <p className="mt-2 text-red-600">{error}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getGameStatusConfig(gameStatus);
  const averageScore = calculateAverageScore();
  const performanceRating = getPerformanceRating(averageScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
<<<<<<< HEAD
        {/* Enhanced Header */}
=======
  {/* Enhanced Header - Leaderboard removed for teams */}
>>>>>>> f0e38999 (Update: latest changes and fixes)
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-lg border border-white/20 backdrop-blur-sm p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                    {user?.teamName?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-slate-800">
                      Welcome back, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user?.teamName || 'Team'}</span>!
                    </h1>
                    <p className="text-slate-600 text-lg">Continue your photo marathon journey</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className={`px-4 py-2 rounded-xl text-sm font-medium border backdrop-blur-sm ${statusConfig.color}`}>
                  <span className="mr-2">{statusConfig.icon}</span>
                  {statusConfig.text}
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <svg 
                    className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {/* Levels Progress */}
          <div className="bg-white rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Levels Completed</p>
              <p className="text-3xl font-bold text-slate-800 mb-3">
                {/* Add +1 to completed/total if finalSubmitted or finalUnlocked */}
                {progress.completedLevels + (finalSubmitted ? 1 : 0)} <span className="text-lg text-slate-500">/ {progress.totalLevels + 1}</span>
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-600 font-medium">
                {progress.progressPercentage}% Complete
              </p>
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl">{performanceRating.emoji}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Average Score</p>
              <p className="text-3xl font-bold text-slate-800 mb-1">
                {averageScore}<span className="text-lg text-slate-500">%</span>
              </p>
              <p className={`text-sm font-medium ${performanceRating.color}`}>
                {performanceRating.text}
              </p>
            </div>
          </div>

          {/* Total Submissions */}
          <div className="bg-white rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z" />
                </svg>
              </div>
              <span className="text-2xl">📸</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Total Submissions</p>
              <p className="text-3xl font-bold text-slate-800 mb-1">
                {submissions.length}
              </p>
              <p className="text-sm text-slate-600">
                Photos submitted
              </p>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-slate-800 mb-1">
                {submissions.length > 0 ? Math.round((submissions.filter(s => s.status === 'approved' || s.status === 'auto_approved').length / submissions.length) * 100) : 0}
                <span className="text-lg text-slate-500">%</span>
              </p>
              <p className="text-sm text-slate-600">
                Approval rate
              </p>
            </div>
          </div>
        </div>

        {/* Current Level - Enhanced */}
        {currentLevel && (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Current Challenge</h2>
            </div>
            <div className="max-w-2xl">
              <PhotoCard 
                level={currentLevel} 
                isCurrent={true}
                showActions={true}
                submissions={submissions}
                onSubmission={handleRefresh}
              />
            </div>
          </div>
        )}

        {/* Final Challenge or Completed Message */}
        {currentLevel && currentLevel.finalCompleted && (
          <div className="mb-12">
            <div className="relative overflow-hidden bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-2xl p-8 text-center">
              <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-pink-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
              </div>
              <div className="relative max-w-2xl mx-auto">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  Final level completed! Check out your ranking.
                </h3>
                <p className="text-green-100 text-xl leading-relaxed mb-6">
                  You have conquered the Master Level. Head over to the leaderboard to see how you rank among other teams!
                </p>
<<<<<<< HEAD
                <Link
                  to="/leaderboard"
                  className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <span className="relative z-10">View Leaderboard</span>
                </Link>
=======
                {/* Leaderboard link removed for teams. Only admin can view leaderboard. */}
>>>>>>> f0e38999 (Update: latest changes and fixes)
              </div>
            </div>
          </div>
        )}
        {/* Final Challenge - Enhanced */}
        {finalUnlocked && !finalSubmitted && (!currentLevel || !currentLevel.finalCompleted) && (
          <div className="mb-12">
            <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-2xl shadow-2xl">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              <div className="relative p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-4xl">🏆</span>
                      <h2 className="text-2xl lg:text-3xl font-bold text-white">Final Challenge Unlocked!</h2>
                    </div>
                    <p className="text-purple-100 text-lg leading-relaxed">
                      Outstanding work! You've conquered all levels. Now it's time for the ultimate test of your photography skills.
                    </p>
                    <div className="flex items-center space-x-2 mt-4">
                      <div className="flex -space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full border-2 border-white/30"></div>
                        ))}
                      </div>
                      <span className="text-white/80 text-sm font-medium">Master Level</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Link
                      to="/final-challenge"
                      className="group relative overflow-hidden bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <span className="relative z-10">Begin Final Challenge</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Level Progress - Enhanced Grid */}
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Your Progress</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedLevels.map((level) => {
              const isCompleted = completedLevels.some(completed => completed.levelId === level._id);
              const isCurrent = currentLevel && currentLevel._id === level._id;
              return (
                <div key={level._id} className="transform hover:scale-105 transition-all duration-300">
                  <PhotoCard
                    level={level}
                    isCompleted={isCompleted}
                    isCurrent={isCurrent}
                    showActions={true}
                    compact={true}
                    submissions={submissions}
                    onSubmission={handleRefresh}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Enhanced Recent Submissions */}
        {submissions.length > 0 ? (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Recent Submissions</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Level</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.slice(0, 5).map((submission) => {
                      // Defensive: support both .level and .levelId, and .similarityScore or .score
                      const levelNumber = submission.level?.levelNumber || submission.levelId?.levelNumber || submission.levelId?.title || 'N/A';
                      const score = typeof submission.similarityScore === 'number' ? Math.round(submission.similarityScore) : (typeof submission.score === 'number' ? Math.round(submission.score) : 'N/A');
                      const status = submission.status || 'pending';
                      const submittedAt = submission.submittedAt || submission.createdAt;
                      // Use formatDate util if available
                      let formattedDate = 'N/A';
                      try {
                        // eslint-disable-next-line
                        formattedDate = require('../utils/formatDate').formatDate(submittedAt);
                      } catch (e) {
                        if (submittedAt) {
                          formattedDate = new Date(submittedAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          });
                        }
                      }
                      return (
                        <tr key={submission._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                {levelNumber}
                              </div>
                              <span className="text-sm font-medium text-slate-800">
                                Level {levelNumber}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className={`text-2xl font-bold ${score !== 'N/A' ? 'text-slate-800' : 'text-slate-400'}`}>{score}</span>
                              {score !== 'N/A' && <span className="text-sm text-slate-500">%</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getSubmissionStatusConfig(status)}`} title={getSubmissionStatusText(status)}>
                              {getSubmissionStatusText(status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{formattedDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {submissions.length > 5 && (
                <div className="bg-slate-50 px-6 py-4 text-center">
                  <Link to="/submissions" className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                    View All Submissions ({submissions.length} total)
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-12">
            <div className="bg-white rounded-2xl shadow-lg border border-white/20 p-8 text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2">No Submissions Yet</h2>
              <p className="text-slate-500">Your recent submissions will appear here once you start submitting photos.</p>
            </div>
          </div>
        )}

  {/* Leaderboard preview and link removed for teams; only admin can view leaderboard now. */}

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link 
            to="/levels"
            className="group bg-white rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">All Levels</h3>
                <p className="text-sm text-slate-600">Browse all available challenges</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/submissions"
            className="group bg-white rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">My Submissions</h3>
                <p className="text-sm text-slate-600">View all your photo submissions</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/profile"
            className="group bg-white rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 group-hover:text-purple-600 transition-colors">Team Profile</h3>
                <p className="text-sm text-slate-600">Manage team settings</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Motivational Footer */}
        {progress.progressPercentage > 0 && progress.progressPercentage < 100 && (
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">
                Keep Going! You're {progress.progressPercentage}% There! 🚀
              </h3>
              <p className="text-indigo-100 text-lg leading-relaxed">
                {progress.progressPercentage >= 75 
                  ? "You're in the final stretch! Amazing work so far - the finish line is in sight!"
                  : progress.progressPercentage >= 50 
                  ? "Halfway there! Your photography skills are really showing - keep up the fantastic work!"
                  : progress.progressPercentage >= 25 
                  ? "Great start! You're building momentum - every photo brings you closer to mastery!"
                  : "Welcome to the adventure! Every great photographer started with their first shot!"
                }
              </p>
              <div className="flex justify-center items-center space-x-2 mt-6">
                <div className="flex -space-x-1">
                  {[...Array(Math.ceil(progress.progressPercentage / 20))].map((_, i) => (
                    <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                  ))}
                  {[...Array(5 - Math.ceil(progress.progressPercentage / 20))].map((_, i) => (
                    <div key={i} className="w-3 h-3 bg-white/30 rounded-full border-2 border-white"></div>
                  ))}
                </div>
                <span className="text-white/90 text-sm font-medium ml-3">
                  Level {Math.ceil(progress.progressPercentage / 20)} of 5
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Completed Game Celebration */}
        {progress.progressPercentage === 100 && (
          <div className="relative overflow-hidden bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-2xl p-8 text-center">
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-pink-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>
            <div className="relative max-w-2xl mx-auto">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Congratulations, Champions! 🏆
              </h3>
              <p className="text-green-100 text-xl leading-relaxed mb-6">
                You've completed all levels with flying colors! Your photography journey has been nothing short of spectacular. 
                Time to celebrate your mastery!
              </p>
              <div className="flex justify-center items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                  <div className="text-2xl font-bold text-white">{averageScore}%</div>
                  <div className="text-sm text-green-100">Avg. Score</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                  <div className="text-2xl font-bold text-white">{submissions.length}</div>
                  <div className="text-sm text-green-100">Photos</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                  <div className="text-2xl font-bold text-white">
                    {submissions.filter(s => s.status === 'approved' || s.status === 'auto_approved').length}
                  </div>
                  <div className="text-sm text-green-100">Approved</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDashboard;