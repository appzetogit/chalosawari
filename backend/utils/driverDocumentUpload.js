const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Local Disk Storage Engine for Driver Documents
 * Writes incoming files to backend/public/uploads/driver-documents
 * and attaches relative URLs (/uploads/driver-documents/{filename}) to req.file
 */
function DriverDocumentStorageEngine() {
  this.folder = 'driver-documents';
}

DriverDocumentStorageEngine.prototype._handleFile = function(req, file, cb) {
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
      path: relativeUrl, // Relative URL saved to DB
      secure_url: relativeUrl,
      url: relativeUrl,
      public_id: `${this.folder}/${filename.replace(ext, '')}`,
      bytes: outStream.bytesWritten,
      size: outStream.bytesWritten,
      format: ext.replace('.', '')
    });
  });
};

DriverDocumentStorageEngine.prototype._removeFile = function(req, file, cb) {
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

const driverDocumentStorage = new DriverDocumentStorageEngine();

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

// Multer for driver document uploads
const uploadDriverDocument = multer({
  storage: driverDocumentStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for documents
    files: 1
  },
  fileFilter: documentFileFilter
});

// Middleware for single document upload
const uploadSingleDocument = uploadDriverDocument.single('document');

// Add error handling wrapper for document upload
const uploadDocumentWithErrorHandling = (req, res, next) => {
  uploadSingleDocument(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 15MB.'
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

// Function to delete document from local storage
const deleteDocument = async (documentPathOrId) => {
  if (!documentPathOrId) return;
  try {
    let relativePath = documentPathOrId;
    if (typeof documentPathOrId === 'string') {
      if (documentPathOrId.startsWith('http://') || documentPathOrId.startsWith('https://')) {
        const match = documentPathOrId.match(/\/uploads\/.+/);
        if (match) {
          relativePath = match[0];
        } else {
          return;
        }
      }

      if (relativePath.startsWith('/uploads/')) {
        const fullPath = path.join(__dirname, '../public', relativePath);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
      } else {
        const folders = ['driver-documents', 'vehicle-documents', 'documents'];
        for (const folder of folders) {
          const potentialPath = path.join(__dirname, '../public/uploads', folder, documentPathOrId);
          if (fs.existsSync(potentialPath)) {
            await fs.promises.unlink(potentialPath);
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error deleting document from local storage:', error);
  }
};

// Function to get document URL
const getDocumentUrl = (documentPath) => {
  if (documentPath) {
    return documentPath;
  }
  return null;
};

// Function to generate thumbnail for documents
const generateDocumentThumbnail = async (imageUrl) => {
  return imageUrl;
};

module.exports = {
  uploadDocumentWithErrorHandling,
  deleteDocument,
  getDocumentUrl,
  generateDocumentThumbnail,
  DriverDocumentStorageEngine
};
