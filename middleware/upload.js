const multer = require('multer');
const path = require('path');
const { normalizeTextInput } = require('../utils/normalization');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowed = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG images are allowed'));
    }
  },
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const importUploadSingle = (req, res, next) => {
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

module.exports = {
  upload,
  importUpload,
  importUploadSingle,
};
