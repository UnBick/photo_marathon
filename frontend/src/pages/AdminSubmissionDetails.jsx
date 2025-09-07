import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { formatDate } from '../utils/formatDate';

const AdminSubmissionDetails = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const submissionData = await adminService.getSubmissionDetails(submissionId);
        setSubmission(submissionData);
        if (submissionData.levelId) {
          setLevel(submissionData.levelId);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load submission details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [submissionId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }
  if (success) {
    return <div className="min-h-screen flex items-center justify-center text-green-600">{success}</div>;
  }
  if (!submission) {
    return <div className="min-h-screen flex items-center justify-center">Submission not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back
        </button>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <h2 className="text-lg font-semibold mb-2">Team's Submitted Photo</h2>
            <img
              src={(() => {
                let src = submission.fileUrl || submission.photoUrl;
                if (!src) return 'https://via.placeholder.com/300x300?text=No+Photo';
                // Normalize to /uploads/<filename>
                src = src.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
                return `/uploads/${src}`;
              })()}
              alt="Submitted by team"
              className="w-full max-w-xs rounded-lg border mb-2"
              onError={e => { e.target.src = 'https://via.placeholder.com/300x300?text=No+Photo'; }}
            />
            <div className="text-sm text-gray-600">Submitted: {formatDate(submission.submittedAt)}</div>
            <div className="text-sm text-gray-600">Team: {submission.teamId?.teamName || 'Unknown'}</div>
            <div className="text-sm text-gray-600">Status: {submission.status}</div>
            <div className="text-sm text-gray-600">Score: {submission.similarityScore || '-'}</div>
          {/* Level Reference Photo */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <h2 className="text-lg font-semibold mb-2">Level Reference Photo</h2>
      {level && (level.photoUrl || level.thumbnailUrl) ? (
              <img
                src={(() => {
                  // Prefer the original photoUrl for the reference image
                  let src = level.photoUrl || level.thumbnailUrl;
                  if (!src) return 'https://via.placeholder.com/300x300?text=No+Photo';
                  // Always serve from /uploads/ and use the filename as is
                  src = src.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
                  // Remove _thumb if present
                  src = src.replace(/_thumb(?=\.[a-zA-Z0-9]+$)/, '');
                  return `/uploads/${src}`;
                })()}
                alt={level.title}
                className="w-full max-w-xs rounded-lg border mb-2"
                onError={e => { e.target.src = 'https://via.placeholder.com/300x300?text=No+Photo'; }}
              />
            ) : (
              <div className="text-gray-400">No reference photo available</div>
            )}
            <div className="text-sm text-gray-600">Level: {level?.title || 'Unknown'}</div>
            <div className="text-sm text-gray-600">Order: {level?.order || '-'}</div>
          </div>
        </div>
        {/* Approve/Reject Actions */}
        <div className="mt-8 flex space-x-4">
          <button
            onClick={async () => {
              setSaving(true);
              try {
                await adminService.approveSubmission(submission._id);
                setSuccess('Submission approved and saved!');
                // Optionally, navigate(-1) after a delay
              } catch (e) {
                setError('Failed to approve submission');
              } finally {
                setSaving(false);
              }
            }}
            className={`px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Approve'}
          </button>
          <button
            onClick={async () => {
              setSaving(true);
              try {
                await adminService.rejectSubmission(submission._id, 'Rejected by admin');
                setSuccess('Submission rejected and saved!');
                // Optionally, navigate(-1) after a delay
              } catch (e) {
                setError('Failed to reject submission');
              } finally {
                setSaving(false);
              }
            }}
            className={`px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSubmissionDetails;
