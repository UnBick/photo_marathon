<<<<<<< HEAD
import React from 'react';
import { useGame } from '../context/GameContext';
import Leaderboard from '../components/Leaderboard';

const LeaderboardPage = () => {
  const { leaderboard, isLoading } = useGame();
=======
import React, { useEffect, useState } from 'react';
import Leaderboard from '../components/Leaderboard';
import { adminService } from '../services/adminService';

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const data = await adminService.getAdminLeaderboard();
        setLeaderboard(data);
      } catch (error) {
        setLeaderboard([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);
>>>>>>> f0e38999 (Update: latest changes and fixes)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
        <p className="text-gray-600">
          See how your team ranks against others in the Photo Marathon
        </p>
      </div>

<<<<<<< HEAD
      <Leaderboard />
=======
      <Leaderboard leaderboard={leaderboard} />
>>>>>>> f0e38999 (Update: latest changes and fixes)
    </div>
  );
};

export default LeaderboardPage;
