// Global error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error('❌ API Error:', error);
  
  // Default error response
  const errorResponse = {
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Send error response
  const statusCode = error.statusCode || error.status || 500;
  res.status(statusCode).json(errorResponse);
};

// 404 handler for API routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `API endpoint ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
