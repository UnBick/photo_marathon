import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { teamService } from '../services/teamService';

const PhotoCard = ({ 
  level, 
  isCompleted = false, 
  isCurrent = false, 
  showActions = true,
  compact = false,
  submissions = [],
  onSubmission
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return '🌱';
      case 'medium':
        return '🌿';
      case 'hard':
        return '🌳';
      default:
        return '❓';
    }
  };

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
          ✅ Completed
        </div>
      );
    }
    
    if (isCurrent) {
      return (
        <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
          🎯 Current
        </div>
      );
    }

    return (
      <div className="absolute top-3 right-3 bg-gray-400 text-white px-2 py-1 rounded-full text-xs font-medium">
        🔒 Locked
      </div>
    );
  };

  const getProgressRing = () => {
    if (!isCompleted) return null;

    const score = level.completionScore || 0;
    const circumference = 2 * Math.PI * 16; // radius = 16
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="absolute top-3 left-3">
        <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            className="text-gray-200"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            className="text-green-500"
            strokeWidth="3"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-green-600">{score}%</span>
        </div>
      </div>
    );
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const renderImage = () => {
    if (imageError) {
      return (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Image not available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
        <img
          src={level.photoUrl}
          alt={`Level ${level.levelNumber} - ${level.title}`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        {getStatusBadge()}
        {getProgressRing()}
      </div>
    );
  };

  const renderCompactView = () => (
    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 w-16 h-16 overflow-hidden rounded-lg">
        <img
          src={level.photoUrl}
          alt={`Level ${level.levelNumber}`}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            Level {level.levelNumber}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(level.difficulty)}`}>
            {getDifficultyIcon(level.difficulty)} {level.difficulty}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">{level.title}</p>
        {isCompleted && (
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-green-600 font-medium">Completed</span>
            {level.completionScore && (
              <span className="text-xs text-gray-500">• {level.completionScore}%</span>
            )}
          </div>
        )}
      </div>
      {showActions && (
        <div className="flex-shrink-0">
          {isCurrent ? (
            <Link
              to={`/level/${level._id}`}
              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Play Now
            </Link>
          ) : isCompleted ? (
            <span className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-800 bg-green-100">
              ✓ Done
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-gray-100">
              Locked
            </span>
          )}
        </div>
      )}
    </div>
  );


  const renderFullView = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {renderImage()}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Level {level.levelNumber}: {level.title}
          </h3>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(level.difficulty)}`}>
            {getDifficultyIcon(level.difficulty)} {level.difficulty}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {level.description}
        </p>
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>Points: {level.points || 100}</span>
          <span>Time Limit: {level.timeLimit ? `${level.timeLimit} min` : 'No limit'}</span>
        </div>
        {showActions && (
          <div className="flex space-x-2">
            {isCurrent ? (
              <Link
                to={`/level/${level._id}`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
              >
                Start Level
              </Link>
            ) : isCompleted ? (
              <div className="flex-1 bg-green-100 text-green-800 font-medium py-2 px-4 rounded-md text-center">
                ✓ Completed
              </div>
            ) : (
              <div className="flex-1 bg-gray-100 text-gray-500 font-medium py-2 px-4 rounded-md text-center cursor-not-allowed">
                🔒 Locked
              </div>
            )}
            {!compact && (
              <button className="px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return compact ? renderCompactView() : renderFullView();
};

export default PhotoCard;
