const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { imageHash } = require('image-hash');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  // Check file type
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false);
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Invalid file extension'), false);
  }
  
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1 // Only allow 1 file per request
  }
});

// Middleware to process uploaded image
const processImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    
    // Generate thumbnail
    const thumbnailPath = path.join(
      path.dirname(filePath),
      'thumbnails',
      'thumb_' + fileName
    );
    
    // Create thumbnails directory if it doesn't exist
    const thumbDir = path.dirname(thumbnailPath);
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
    
    // Create thumbnail (resize to 300x300, maintain aspect ratio)
    await sharp(filePath)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    // Generate perceptual hash
    const phash = await generateImageHash(filePath);
    
    // Extract EXIF data (basic)
    const exifData = await extractBasicExif(filePath);
    
    // Add processed data to request
    req.processedImage = {
      originalPath: filePath,
      thumbnailPath: thumbnailPath,
      originalUrl: `/uploads/${fileName}`,
      thumbnailUrl: `/uploads/thumbnails/thumb_${fileName}`,
      phash: phash,
      exif: exifData,
      fileSize: req.file.size,
      dimensions: await getImageDimensions(filePath)
    };
    // Set phash on req.file for controller compatibility
    req.file.phash = phash;
    next();
  } catch (error) {
    // Clean up uploaded file if processing fails
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      message: 'Image processing failed',
      error: error.message
    });
  }
};

// Generate perceptual hash for image
const generateImageHash = (filePath) => {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 8, true, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

// Extract basic EXIF data
const extractBasicExif = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasProfile: metadata.hasProfile,
      hasAlpha: metadata.hasAlpha
    };
  } catch (error) {
    console.warn('Failed to extract EXIF data:', error.message);
    return {};
  }
};

// Get image dimensions
const getImageDimensions = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    return { width: 0, height: 0 };
  }
};

// Middleware to validate image dimensions
const validateImageDimensions = (minWidth = 200, minHeight = 200) => {
  return (req, res, next) => {
    if (!req.processedImage || !req.processedImage.dimensions) {
      return res.status(400).json({
        success: false,
        message: 'Image dimensions not available'
      });
    }
    
    const { width, height } = req.processedImage.dimensions;
    
    if (width < minWidth || height < minHeight) {
      return res.status(400).json({
        success: false,
        message: `Image dimensions must be at least ${minWidth}x${minHeight} pixels`
      });
    }
    
    next();
  };
};

// Middleware to validate image quality
const validateImageQuality = (maxFileSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.processedImage) {
      return res.status(400).json({
        success: false,
        message: 'Processed image not available'
      });
    }
    
    if (req.processedImage.fileSize > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`
      });
    }
    
    next();
  };
};

// Cleanup middleware to remove temporary files on error
const cleanupOnError = (req, res, next) => {
  res.on('finish', () => {
    // If response indicates an error, clean up uploaded files
    if (res.statusCode >= 400 && req.file) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        if (req.processedImage && req.processedImage.thumbnailPath) {
          if (fs.existsSync(req.processedImage.thumbnailPath)) {
            fs.unlinkSync(req.processedImage.thumbnailPath);
          }
        }
      } catch (error) {
        console.error('Failed to cleanup files:', error);
      }
    }
  });
  
  next();
};

// Middleware to handle upload errors
const handleUploadErrors = (error, req, res, next) => {
  // Log all Multer and file upload errors
  console.error('[Multer Upload Error]', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  if (error.message === 'Invalid file extension') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  // Generic error
  return res.status(500).json({
    success: false,
    message: 'File upload failed',
    error: error.message
  });
};

// Export middleware functions
module.exports = {
  upload,
  processImage,
  validateImageDimensions,
  validateImageQuality,
  cleanupOnError,
  handleUploadErrors,
  generateImageHash,
  extractBasicExif,
  getImageDimensions
};
