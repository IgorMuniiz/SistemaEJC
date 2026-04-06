const path = require('path');
const multer = require('multer');

const createImageUpload = () => {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'uploads/');
    },
    filename(req, file, cb) {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  });

  return multer({
    storage,
    fileFilter(req, file, cb) {
      const allowed = ['.png', '.jpg', '.jpeg'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG and PNG images are allowed'));
      }
    },
  });
};

const createImportUploadSingle = ({ normalizeTextInput = (value) => String(value || '').trim() } = {}) => {
  const importUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  return (req, res, next) => {
    importUpload.single('arquivo')(req, res, (err) => {
      if (!err) return next();

      if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Arquivo muito grande. O limite para importacao e 25MB.',
        });
      }

      return res.status(400).json({
        success: false,
        error: `Falha ao processar arquivo de importacao: ${normalizeTextInput(err.message) || 'erro desconhecido.'}`,
      });
    });
  };
};

module.exports = {
  createImageUpload,
  createImportUploadSingle,
};
