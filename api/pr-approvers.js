/**
 * Vercel Serverless Function for all API endpoints
 * This file exports the Express app as a serverless function
 * Handles: /api/pr-approvers, /api/ml/*, /api/feedback, /health, etc.
 */

const app = require('../server/index.js');

// Export the Express app as a Vercel serverless function
module.exports = app; 