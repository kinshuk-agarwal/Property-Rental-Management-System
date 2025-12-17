const { query } = require('../db/connection');

const auditMiddleware = (req, res, next) => {
  // Store the original end method
  const originalEnd = res.end;

  // Override the end method to log after response is sent
  res.end = function(...args) {
    // Log the request after response is finished
    const userId = req.user ? req.user.aadhar : null;
    const route = req.originalUrl || req.url;
    const method = req.method;
    const statusCode = res.statusCode;

    // Log to database asynchronously (don't wait for it)
    query(
      'INSERT INTO audit_logs (user_id, route, method, status_code) VALUES ($1, $2, $3, $4)',
      [userId, route, method, statusCode]
    ).catch(error => {
      console.error('Failed to log audit entry:', error);
    });

    // Call the original end method
    originalEnd.apply(this, args);
  };

  next();
};

module.exports = auditMiddleware;


