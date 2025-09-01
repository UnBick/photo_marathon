import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import UploadBox from '../components/UploadBox';
import SimpleAlert from '../components/SimpleAlert';

const FinalChallenge = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    gameStatus, 
    submitFinal, 
    isLoading, 
    error 
  } = useGame();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAlert, setShowAlert] = useState("");
<<<<<<< HEAD
=======
  const [finalClue, setFinalClue] = useState("");
  useEffect(() => {
    // Fetch the final level clue from backend
    async function fetchFinalClue() {
      try {
        const res = await fetch('/api/levels/final');
        if (res.ok) {
          const data = await res.json();
          setFinalClue(data.finalClue || "");
        }
      } catch (err) {
        setFinalClue("");
      }
    }
    fetchFinalClue();
  }, []);
>>>>>>> f0e38999 (Update: latest changes and fixes)

  useEffect(() => {
    // Check if final challenge is unlocked
    if (user && !user.progress?.finalUnlocked) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handlePhotoUpload = async (file) => {
    setIsSubmitting(true);
    setUploadError(null);
    try {
      const result = await submitFinal(file);
      if (result.success) {
        setShowAlert("Photo has been submitted for approval.");
        setShowSuccess(true);
        setTimeout(() => {
          setShowAlert("");
          navigate('/dashboard');
        }, 3000);
      }
    } catch (error) {
      setUploadError(error.message || 'Failed to submit final challenge');
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

  if (!user?.progress?.finalUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Final Challenge Locked</h1>
          <p className="text-gray-600 mb-8">You need to complete all levels before accessing the final challenge.</p>
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

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-green-900 mb-2">Final Challenge Submitted!</h1>
            <p className="text-green-700">
              Congratulations! You've completed the Photo Marathon. Your final submission is being reviewed.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h3>
            <ul className="text-left space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="mr-2 text-green-500">✓</span>
                <span>Your photo is being reviewed by our judges</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-500">✓</span>
                <span>You'll be notified of the results</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-500">✓</span>
                <span>Check the leaderboard for your final ranking</span>
              </li>
            </ul>
          </div>
          <p className="mt-6 text-sm text-green-600">
            Game complete! Redirecting to dashboard in a few seconds...<br />
            <span className="font-semibold">Go check your ranking on the leaderboard!</span>
          </p>
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
<<<<<<< HEAD
        
=======

        {/* Highlighted Clue Box */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-yellow-200 via-yellow-100 to-yellow-50 border-2 border-yellow-400 rounded-xl shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-yellow-900 mb-2">Final Challenge Clue</h2>
            <p className="text-lg text-yellow-800 font-semibold">
              {finalClue ? finalClue : "This is it! The ultimate test of your photography skills. Submit your best photo to complete the Photo Marathon."}
            </p>
          </div>
        </div>

>>>>>>> f0e38999 (Update: latest changes and fixes)
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏁 Final Challenge
          </h1>
<<<<<<< HEAD
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            This is it! The ultimate test of your photography skills. Submit your best photo to complete the Photo Marathon.
          </p>
=======
>>>>>>> f0e38999 (Update: latest changes and fixes)
        </div>
      </div>

  {showAlert && <SimpleAlert message={showAlert} type="success" onClose={() => setShowAlert("")} />}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Challenge Information */}
        <div>
          <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-lg p-8 border border-purple-200">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-4">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-purple-900 mb-2">The Ultimate Challenge</h2>
              <p className="text-purple-700">
<<<<<<< HEAD
                Show us what you've learned throughout this journey
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">Challenge Theme</h3>
                <p className="text-gray-700">
                  Create a photo that represents the spirit of adventure, creativity, and the joy of discovery. 
                  This is your chance to showcase your unique perspective and photographic vision.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">Judging Criteria</h3>
                <ul className="text-gray-700 space-y-1">
                  <li>• Creativity and originality</li>
                  <li>• Technical quality and composition</li>
                  <li>• Emotional impact and storytelling</li>
                  <li>• Adherence to the theme</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">Prize</h3>
                <p className="text-gray-700">
                  The winning team will be crowned Photo Marathon Champions and receive special recognition 
                  for their outstanding achievement!
                </p>
              </div>
            </div>
=======
                {finalClue ? finalClue : "Show us what you've learned throughout this journey"}
              </p>
            </div>
            {/* Optionally, you can add more dynamic fields for judging criteria and prize if you want them editable too */}
>>>>>>> f0e38999 (Update: latest changes and fixes)
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Final Photo</h3>
            <p className="text-gray-600 mb-6">
              This is your final submission. Make it count! Choose a photo that best represents your journey 
              and showcases your photography skills.
            </p>
            
            <UploadBox
              onUpload={handlePhotoUpload}
              isSubmitting={isSubmitting}
              acceptedFileTypes={['image/jpeg', 'image/jpg', 'image/png']}
              maxFileSize={15 * 1024 * 1024} // 15MB for final challenge
              maxDimensions={{ width: 6000, height: 6000 }}
              minDimensions={{ width: 1200, height: 800 }}
            />
            
            {uploadError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Submission Failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{uploadError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Important Notes */}
          <div className="mt-6 bg-yellow-50 rounded-lg p-6 border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">⚠️ Important Notes</h3>
            <ul className="space-y-2 text-yellow-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>This is your final submission - you cannot change it after submitting</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Make sure your photo meets all technical requirements</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Take your time to choose the perfect photo</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Once submitted, your Photo Marathon journey is complete!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalChallenge;
