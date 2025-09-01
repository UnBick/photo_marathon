import React, { useState, useRef, useCallback } from 'react';
import { teamService } from '../services/teamService';

const UploadBox = ({ 
  onUpload, 
  onError, 
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  showPreview = true,
  className = '',
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const validateFile = useCallback(async (file) => {
    const errors = [];

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not supported. Please use: ${acceptedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      errors.push(`File size must be less than ${maxSizeMB}MB`);
    }

    // Check dimensions (optional)
    try {
      const dimensions = await getImageDimensions(file);
      if (dimensions.width < 100 || dimensions.height < 100) {
        errors.push('Image dimensions must be at least 100x100 pixels');
      }
    } catch (error) {
      errors.push('Could not read image dimensions');
    }

    return errors;
  }, [acceptedTypes, maxSize]);

  const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;

    // Clear previous errors
    setValidationErrors([]);

    // Validate file
    const errors = await validateFile(file);
    if (errors.length > 0) {
      setValidationErrors(errors);
      onError?.(errors);
      return;
    }

    // Set file and preview
    setSelectedFile(file);
    
    if (showPreview) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    // Auto-upload if onUpload is provided
    if (onUpload) {
      handleUpload(file);
    }
  }, [validateFile, showPreview, onUpload, onError]);

  const handleUpload = async (file = selectedFile) => {
    if (!file || !onUpload) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await onUpload(file, (progress) => {
        setUploadProgress(progress);
      });
      
      // Clear file and preview after successful upload
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      
      return result;
    } catch (error) {
      console.error('Upload failed:', error);
      onError?.([error.message || 'Upload failed']);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAcceptedTypesText = () => {
    return acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ');
  };

  const getMaxSizeText = () => {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return `${maxSizeMB}MB`;
  };

  const renderDropZone = () => (
    <div
      ref={dropZoneRef}
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
    >
      <div className="space-y-2">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        <div className="text-gray-600">
          <p className="text-sm">
            <span className="font-medium text-blue-600 hover:text-blue-500">
              Click to upload
            </span>{' '}
            or drag and drop
          </p>
          <p className="text-xs mt-1">
            {getAcceptedTypesText()} up to {getMaxSizeText()}
          </p>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!showPreview || !previewUrl || !selectedFile) return null;

    return (
      <div className="mt-4">
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full h-32 object-cover rounded-lg border border-gray-200"
          />
          <button
            type="button"
            onClick={removeFile}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          <p>{selectedFile.name}</p>
          <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      </div>
    );
  };

  const renderUploadProgress = () => {
    if (!isUploading) return null;

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Uploading...</span>
          <span>{uploadProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null;

    return (
      <div className="mt-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload failed</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderManualUploadButton = () => {
    if (!onUpload || !selectedFile) return null;

    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => handleUpload()}
          disabled={isUploading || disabled}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isUploading ? 'Uploading...' : 'Upload Photo'}
        </button>
      </div>
    );
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      {renderDropZone()}
      {renderPreview()}
      {renderUploadProgress()}
      {renderValidationErrors()}
      {renderManualUploadButton()}
    </div>
  );
};

export default UploadBox;
