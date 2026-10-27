/**
 * Vercel Serverless Function Handler
 * Routes all /api/* requests to the GrowthNest request handler with SQLite database support
 */

const requestHandler = require('../server.js');

module.exports = (req, res) => {
  return requestHandler(req, res);
};
