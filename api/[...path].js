/**
 * GrowthNest Tech Solutions - Vercel Serverless Function Catch-All Handler
 * Captures all /api/* routes (e.g. /api/admin/stats, /api/auth/login)
 * and passes them directly to the GrowthNest request handler with full URL intact.
 */

const requestHandler = require('../server.js');

module.exports = (req, res) => {
  return requestHandler(req, res);
};
