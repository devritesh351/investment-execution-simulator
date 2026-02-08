export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
      details: err.details
    });
  }

  // Duplicate key (PostgreSQL)
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Resource already exists'
    });
  }

  // Foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referenced resource does not exist'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
}
