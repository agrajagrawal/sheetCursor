const express = require('express');
const router = express.Router();

const spreadsheetController = require('../controllers/spreadsheetController');
const { notFoundHandler } = require('../middleware/errorMiddleware');

// Health checks
router.get('/health', spreadsheetController.healthCheck);
router.get('/health/llm', spreadsheetController.checkLLMHealth);

// Spreadsheet operations
router.get('/spreadsheet', spreadsheetController.getCurrentSpreadsheet);
router.post('/glossary-tab', spreadsheetController.selectGlossaryTab);
router.post('/sheets-link', spreadsheetController.handleGoogleSheetsLink);

// Search operations
router.post('/search', spreadsheetController.search);
router.get('/suggestions', spreadsheetController.getSuggestions);

// Analytics and examples
router.get('/analytics', spreadsheetController.getAnalytics);
router.get('/examples', spreadsheetController.getExamples);

// Error handling
router.use('*', notFoundHandler);

module.exports = router;
