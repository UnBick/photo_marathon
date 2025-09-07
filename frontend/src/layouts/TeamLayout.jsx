import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';

const TeamLayout = () => {
  const { user, logout } = useAuth();
  const { progress, gameStatus } = useGame();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
      color: 'from-purple-500 to-pink-500',
      description: 'Team overview'
    },
    { 
      name: 'Current Level', 
      href: '/level/current', 
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'from-green-500 to-emerald-500',
      description: 'Active challenge'
    },
    { 
      name: 'Progress', 
      href: '/progress', 
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      color: 'from-yellow-500 to-orange-500',
      description: 'Your journey'
    },
    { 
      name: 'Leaderboard', 
      href: '/leaderboard', 
      icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      color: 'from-red-500 to-rose-500',
      description: 'Team rankings'
    },
    { 
      name: 'Submissions', 
      href: '/submissions', 
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      color: 'from-blue-500 to-cyan-500',
      description: 'Photo gallery'
    },
  ];

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const getGameStatusConfig = (status) => {
    switch (status) {
      case 'not_started':
        return { 
          color: 'from-gray-400 to-gray-600', 
          bg: 'bg-gray-100', 
          text: 'Waiting to Start',
          pulse: false
        };
      case 'in_progress':
        return { 
          color: 'from-green-400 to-emerald-600', 
          bg: 'bg-green-50', 
          text: 'Game Live!',
          pulse: true
        };
      case 'paused':
        return { 
          color: 'from-yellow-400 to-amber-600', 
          bg: 'bg-yellow-50', 
          text: 'Paused',
          pulse: false
        };
      case 'completed':
        return { 
          color: 'from-blue-400 to-indigo-600', 
          bg: 'bg-blue-50', 
          text: 'Completed!',
          pulse: false
        };
      default:
        return { 
          color: 'from-gray-400 to-gray-600', 
          bg: 'bg-gray-100', 
          text: 'Unknown',
          pulse: false
        };
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const statusConfig = getGameStatusConfig(gameStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Dynamic Header */}
      <header className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Photo Marathon</h1>
                  <p className="text-indigo-200 text-sm">Team Challenge</p>
                </div>
              </div>
            </div>
            
            {/* Header Controls */}
            <div className="flex items-center space-x-6">
              {/* Game Status */}
              <div className={`relative px-4 py-2 rounded-full ${statusConfig.bg} border border-white/20 backdrop-blur-sm`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${statusConfig.color} ${statusConfig.pulse ? 'animate-pulse' : ''}`}></div>
                  <span className="text-sm font-semibold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                    {statusConfig.text}
                  </span>
                </div>
              </div>
              
              {/* Team Info */}
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
                  <span className="text-sm font-bold text-white">
                    {user?.teamName?.charAt(0) || 'T'}
                  </span>
                </div>
                <div className="text-white">
                  <div className="text-sm font-medium">{user?.teamName || 'Team'}</div>
                  <div className="text-xs text-indigo-200">{user?.username}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  title="Sign out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 transition-all duration-700 ease-out shadow-lg"
            style={{ width: `${progress.progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0 md:pt-24 z-10">
          <div className="flex-1 flex flex-col bg-white/60 backdrop-blur-xl border-r border-gray-200/50 shadow-xl">
            {/* Progress Card */}
            <div className="p-6">
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-6 shadow-lg border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Your Progress
                  </h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {progress.progressPercentage}%
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Levels Completed</span>
                    <span className="font-semibold text-gray-800">{progress.completedLevels} / {progress.totalLevels}</span>
                  </div>
                  
                  <div className="relative h-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out shadow-md"
                      style={{ width: `${progress.progressPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4 pt-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-600">On Track</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span className="text-xs text-gray-600">Keep Going!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 pb-6">
              <div className="space-y-3">
                {navigation.map((item, index) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group relative flex items-center p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                      isActive(item.href)
                        ? 'bg-white shadow-xl border border-gray-200'
                        : 'hover:bg-white/50 hover:shadow-lg'
                    }`}
                  >
                    {isActive(item.href) && (
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.color} opacity-10`}></div>
                    )}
                    
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center shadow-lg mr-4 transition-all duration-300 ${
                      isActive(item.href) ? 'scale-110' : 'group-hover:scale-105'
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                    </div>
                    
                    <div className="flex-1">
                      <div className={`font-semibold ${isActive(item.href) ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.description}
                      </div>
                    </div>
                    
                    {isActive(item.href) && (
                      <div className={`w-1 h-8 bg-gradient-to-b ${item.color} rounded-full`}></div>
                    )}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="md:pl-80 flex flex-col flex-1 min-h-screen">
          <main className="flex-1 pt-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`md:hidden fixed inset-0 z-50 ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-2xl">
          <div className="p-6">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center p-3 rounded-xl transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center mr-3`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 z-40">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-200 ${
                isActive(item.href)
                  ? 'transform scale-105'
                  : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center shadow-md mb-1 ${
                isActive(item.href) ? 'shadow-lg' : ''
              }`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <span className={`text-xs font-medium ${
                isActive(item.href) ? 'text-gray-900' : 'text-gray-600'
              }`}>
                {item.name.split(' ')[0]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamLayout;