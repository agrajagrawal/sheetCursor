const spreadsheetService = require('../services/spreadsheetService');

class SpreadsheetController {
  // Health check endpoint
  async healthCheck(req, res) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }


  // Search endpoint
  async search(req, res) {
    try {
      const { query, spreadsheetId, options = {} } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid query',
          message: 'Please provide a valid search query'
        });
      }

      const results = await spreadsheetService.searchSpreadsheets(query, spreadsheetId, options);

      res.json({
        success: true,
        ...results
      });

    } catch (error) {
      console.error('❌ Search error:', error);
      res.status(500).json({
        error: 'Search failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Get current spreadsheet
  async getCurrentSpreadsheet(req, res) {
    try {
      const result = await spreadsheetService.getCurrentSpreadsheet();

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('❌ Error fetching spreadsheet:', error);
      res.status(500).json({
        error: 'Failed to fetch spreadsheet',
        message: error.message
      });
    }
  }

  // Select glossary tab
  async selectGlossaryTab(req, res) {
    try {
      const { tabName } = req.body;

      if (!tabName || typeof tabName !== 'string') {
        return res.status(400).json({
          error: 'Invalid tab name',
          message: 'Please provide a valid tab name'
        });
      }

      const result = await spreadsheetService.selectGlossaryTab(tabName);

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('❌ Error selecting glossary tab:', error);
      res.status(500).json({
        error: 'Failed to select tab',
        message: error.message
      });
    }
  }

  // Get search suggestions
  async getSuggestions(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          suggestions: []
        });
      }

      const suggestions = await spreadsheetService.generateSuggestions(q);

      res.json({
        success: true,
        suggestions: suggestions
      });

    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
      res.status(500).json({
        error: 'Failed to generate suggestions',
        message: error.message
      });
    }
  }

  // Get analytics
  async getAnalytics(req, res) {
    try {
      const analytics = await spreadsheetService.getAnalytics();

      res.json({
        success: true,
        analytics: analytics
      });

    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics',
        message: error.message
      });
    }
  }

  // Get example queries
  async getExamples(req, res) {
    try {
      const examples = spreadsheetService.getExampleQueries();

      res.json({
        success: true,
        examples: examples
      });

    } catch (error) {
      console.error('❌ Error fetching examples:', error);
      res.status(500).json({
        error: 'Failed to fetch examples',
        message: error.message
      });
    }
  }

  // Check LLM health status
  async checkLLMHealth(req, res) {
    try {
      console.log('🔍 Checking LLM health status...');
      
      const healthStatus = await spreadsheetService.checkLLMHealth();
      
      // Always return 200 OK, but include the actual status in the response
      res.json({
        success: true,
        llm: healthStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error checking LLM health:', error);
      res.json({
        success: false,
        llm: {
          status: 'error',
          available: false,
          message: '🔴 Health check failed',
          error: error.message,
          superjoinStatus: 'DEGRADED'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleGoogleSheetsLink(req, res) {
    const { link } = req.body;
    try {
        const data = await spreadsheetService.processGoogleSheetsLink(link);
        res.status(200).json({ success: true, message: 'Google Sheets data processed successfully', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to process Google Sheets link', error: error.message });
    }
  }
}

module.exports = new SpreadsheetController();