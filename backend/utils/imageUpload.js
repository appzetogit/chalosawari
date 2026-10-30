const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Local Disk Storage Engine for VPS storage
 * Writes incoming files to backend/public/uploads/{folder}
 * and attaches relative URLs (/uploads/{folder}/{filename}) to req.file / req.files
 */
function LocalStorageEngine(options = {}) {
  this.folder = options.folder || 'vehicles';
}

LocalStorageEngine.prototype._handleFile = function(req, file, cb) {
  const uploadDir = path.join(__dirname, '../public/uploads', this.folder);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  const filename = `${uniqueId}${ext}`;
  const finalFilePath = path.join(uploadDir, filename);
  const relativeUrl = `/uploads/${this.folder}/${filename}`;

  const outStream = fs.createWriteStream(finalFilePath);
  file.stream.pipe(outStream);

  outStream.on('error', (err) => {
    cb(err);
  });

  outStream.on('finish', () => {
    cb(null, {
      destination: uploadDir,
      filename: filename,
      path: relativeUrl, // Saved in database (e.g., /uploads/vehicles/xyz.jpg)
      secure_url: relativeUrl,
      url: relativeUrl,
      public_id: `${this.folder}/${filename.replace(ext, '')}`,
      bytes: outStream.bytesWritten,
      size: outStream.bytesWritten,
      format: ext.replace('.', '')
    });
  });
};

LocalStorageEngine.prototype._removeFile = function(req, file, cb) {
  if (file && file.filename) {
    const filePath = path.join(__dirname, '../public/uploads', this.folder, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, cb);
    } else {
      cb(null);
    }
  } else {
    cb(null);
  }
};

// Storage instances for different folders
const vehicleStorage = new LocalStorageEngine({ folder: 'vehicles' });
const offerStorage = new LocalStorageEngine({ folder: 'offers' });
const documentStorage = new LocalStorageEngine({ folder: 'vehicle-documents' });
const avatarStorage = new LocalStorageEngine({ folder: 'avatars' });

// Image file filter
const imageFileFilter = (req, file, cb) => {
  // Both must match: the stored file keeps its extension and is served statically (SVG/HTML could run scripts)
  const extname = /^\.(jpe?g|png|webp|gif)$/.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed!'));
  }
};

// Document file filter (images + PDF)
const documentFileFilter = (req, file, cb) => {
  // Both must match: the stored file keeps its extension and is served statically
  const extname = /^\.(jpe?g|png|webp|pdf)$/.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed for documents!'));
  }
};

// Multer instances
const upload = multer({
  storage: vehicleStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10
  },
  fileFilter: imageFileFilter
});

const uploadSingle = upload.single('image');
const uploadMultiple = upload.array('images', 10);

const uploadOfferImage = multer({
  storage: offerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: imageFileFilter
}).single('image');

const uploadDocuments = multer({
  storage: documentStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for documents
    files: 2
  },
  fileFilter: documentFileFilter
}).fields([
  { name: 'insurancePhoto', maxCount: 1 },
  { name: 'rcPhoto', maxCount: 1 }
]);

// Add error handling wrapper for uploadOfferImage
const uploadOfferImageWithErrorHandling = (req, res, next) => {
  uploadOfferImage(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    next();
  });
};

// Add error handling wrapper for document uploads
const uploadDocumentsWithErrorHandling = (req, res, next) => {
  uploadDocuments(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 15MB for documents.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 2 document files allowed.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Document upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Document upload failed'
      });
    }
    next();
  });
};

// Multer instance for avatar
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatar
    files: 1
  },
  fileFilter: imageFileFilter
}).single('avatar');

// Add error handling wrapper for uploadAvatar
const uploadAvatarWithErrorHandling = (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'File too large. Maximum avatar size is 5MB.',
            statusCode: 400
          }
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          message: `Avatar upload error: ${err.message}`,
          statusCode: 400
        }
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: {
          message: err.message || 'Avatar upload failed',
          statusCode: 400
        }
      });
    }
    next();
  });
};

// Function to delete image from local storage
const deleteImage = async (imagePathOrId) => {
  if (!imagePathOrId) return;
  try {
    let relativePath = imagePathOrId;
    if (typeof imagePathOrId === 'string') {
      if (imagePathOrId.startsWith('http://') || imagePathOrId.startsWith('https://')) {
        const match = imagePathOrId.match(/\/uploads\/.+/);
        if (match) {
          relativePath = match[0];
        } else {
          // Cloudinary or external URL
          return;
        }
      }

      if (relativePath.startsWith('/uploads/')) {
        const fullPath = path.join(__dirname, '../public', relativePath);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
      } else {
        const folders = ['vehicles', 'offers', 'vehicle-documents', 'driver-documents', 'avatars'];
        for (const folder of folders) {
          const potentialPath = path.join(__dirname, '../public/uploads', folder, imagePathOrId);
          if (fs.existsSync(potentialPath)) {
            await fs.promises.unlink(potentialPath);
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error deleting image from local storage:', error);
  }
};

// Function to get image URL
const getImageUrl = (file) => {
  if (file && file.path) {
    return file.path;
  }
  return null;
};

// Pass-through helpers for backward compatibility
const optimizeImage = async (imageBuffer, options = {}) => {
  return imageBuffer;
};

const generateThumbnail = async (imageUrl) => {
  return imageUrl;
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadOfferImage,
  uploadOfferImageWithErrorHandling,
  uploadDocuments,
  uploadDocumentsWithErrorHandling,
  uploadAvatar,
  uploadAvatarWithErrorHandling,
  deleteImage,
  getImageUrl,
  optimizeImage,
  generateThumbnail,
  LocalStorageEngine
};
