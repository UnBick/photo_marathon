import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ManageTeams = () => {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/teams', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token}`
          }
        });
        const data = await res.json();
        setTeams(data.teams || []);
      } catch (err) {
        setError('Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    };
    if (user?.type === 'admin') fetchTeams();
  }, [user]);

  const handleDelete = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        }
      });
      setTeams(teams.filter(t => t._id !== teamId));
    } catch (err) {
      setError('Failed to delete team');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Teams</h1>
        <p className="text-gray-600">
          View team registrations, track progress, and manage team accounts
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        {isLoading ? (
          <div className="text-center py-12">Loading teams...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">No teams found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teams.map(team => (
                <tr key={team._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{team.teamName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{team.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded"
                      disabled={deleting}
                      onClick={() => handleDelete(team._id)}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManageTeams;
