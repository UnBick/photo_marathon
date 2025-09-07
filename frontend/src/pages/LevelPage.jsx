import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import PhotoCard from '../components/PhotoCard';
import UploadBox from '../components/UploadBox';

const LevelPage = () => {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    currentLevel, 
    assignedLevels, 
    submitPhoto, 
    isLoading, 
    error 
  } = useGame();
  
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    if (levelId && assignedLevels.length > 0) {
      const level = assignedLevels.find(l => l._id === levelId);
      if (level) {
        setSelectedLevel(level);
      } else {
        // Level not found or not assigned to this team
        navigate('/dashboard');
      }
    }
  }, [levelId, assignedLevels, navigate]);

  const handlePhotoUpload = async (file) => {
    if (!selectedLevel) return;
    
    setIsSubmitting(true);
    setUploadError(null);
    
    try {
      const result = await submitPhoto(selectedLevel._id, file);
      if (result.success) {
        // Redirect to dashboard or show success message
        navigate('/dashboard');
      }
    } catch (error) {
      setUploadError(error.message || 'Failed to submit photo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Level Not Found</h1>
          <p className="text-gray-600 mb-8">This level is not available or not assigned to your team.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Level {selectedLevel.levelNumber}: {selectedLevel.title}
        </h1>
        <p className="text-gray-600">
          Complete this challenge to unlock the next level
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Level Information */}
        <div>
          <PhotoCard 
            level={selectedLevel} 
            view="full" 
            showActions={false}
          />
          
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Level Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Difficulty:</span>
                <span className={`font-medium ${
                  selectedLevel.difficulty === 'easy' ? 'text-green-600' :
                  selectedLevel.difficulty === 'medium' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {selectedLevel.difficulty.charAt(0).toUpperCase() + selectedLevel.difficulty.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Points:</span>
                <span className="font-medium text-gray-900">{selectedLevel.points}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time Limit:</span>
                <span className="font-medium text-gray-900">
                  {selectedLevel.timeLimit ? `${selectedLevel.timeLimit} minutes` : 'No limit'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600">Current Level</span>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Photo</h3>
            <p className="text-gray-600 mb-6">
              Take a photo that matches the clue above. Make sure your photo is clear and meets all requirements.
            </p>
            
            <UploadBox
              onUpload={handlePhotoUpload}
              isSubmitting={isSubmitting}
              acceptedFileTypes={['image/jpeg', 'image/jpg', 'image/png']}
              maxFileSize={10 * 1024 * 1024} // 10MB
              maxDimensions={{ width: 4000, height: 4000 }}
              minDimensions={{ width: 800, height: 600 }}
            />
            
            {uploadError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Upload Failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{uploadError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="mt-6 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Tips for Success</h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Make sure your photo clearly shows the required element</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Good lighting and clear focus will improve your score</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Check that your photo meets the size and format requirements</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can retry if your first attempt doesn't meet the criteria</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelPage;
