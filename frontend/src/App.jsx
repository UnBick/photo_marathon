import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { SocketProvider } from './context/SocketContext';

// Components
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import TeamDashboard from './pages/TeamDashboard';
import LevelPage from './pages/LevelPage';
import FinalChallenge from './pages/FinalChallenge';
import AdminDashboard from './pages/AdminDashboard';
import LeaderboardPage from './pages/Leaderboard';
import Progress from './pages/Progress';
import Submissions from './pages/Submissions';
import ManageLevels from './pages/ManageLevels';
import ManageTeams from './pages/ManageTeams';
import ManageSubmissions from './pages/ManageSubmissions';
import AdminSubmissionDetails from './pages/AdminSubmissionDetails';

// Layouts
import TeamLayout from './layouts/TeamLayout';
//import AdminLayout from './layouts/AdminLayout';

// Protected Route Component
const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && (!isAuthenticated || user?.role !== 'admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Main App Component
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <GameProvider>
          <SocketProvider>
            <div className="App">
              <Navbar />
              <Routes>
                <Route path="/admin/submission-details/:submissionId" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminSubmissionDetails />
                  </ProtectedRoute>
                } />
                {/* Public Routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Team Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                      <TeamDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/level/:levelId" element={
                  <ProtectedRoute>
                      <LevelPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/final-challenge" element={
                  <ProtectedRoute>
                      <FinalChallenge />
                  </ProtectedRoute>
                } />
                
                <Route path="/leaderboard" element={
                  <ProtectedRoute>
                      <LeaderboardPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/progress" element={
                  <ProtectedRoute>
                      <Progress />
                  </ProtectedRoute>
                } />
                
                <Route path="/submissions" element={
                  <ProtectedRoute>
                      <Submissions />
                  </ProtectedRoute>
                } />
                
                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin={true}>
                    
                      <AdminDashboard />
                    
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/levels" element={
                  <ProtectedRoute requireAdmin={true}>
                    
                      <ManageLevels />
                    
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/teams" element={
                  <ProtectedRoute requireAdmin={true}>
                    
                      <ManageTeams />
                  
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/submissions" element={
                  <ProtectedRoute requireAdmin={true}>
                      <ManageSubmissions />
                  </ProtectedRoute>
                } />
                
                {/* 404 Route */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-xl text-gray-600 mb-8">Page not found</p>
                      <Link
                        to="/dashboard"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                      >
                        Go to Dashboard
                      </Link>
                    </div>
                  </div>
                } />
              </Routes>
            </div>
          </SocketProvider>
        </GameProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
