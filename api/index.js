/**
 * GrowthNest Tech Solutions - Vercel Serverless Function Root Handler
 * Handles root /api and /api/ requests.
 */

const requestHandler = require('../server.js');

module.exports = (req, res) => {
  return requestHandler(req, res);
};
