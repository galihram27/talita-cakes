export const errorHandler = (err, req, res, next) => {
  // body-parser: request body melebihi limit express.json()
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Ukuran data terlalu besar. Gunakan gambar yang lebih kecil.',
    });
  }

  // multer: file upload melebihi limit fileSize
  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Ukuran gambar maksimal 5MB.',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  if (!err.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details || undefined,
  });
};

export default errorHandler;