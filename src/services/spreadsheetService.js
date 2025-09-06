const { getSearchEngine } = require('../core/llmSearchEngine');
const { GeminiClient } = require('../llm/geminiClient');

class SpreadsheetService {

  async searchSpreadsheets(query, spreadsheetId = null, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Invalid query provided');
    }

    console.log(`🔍 Search request: "${query}"`);
    
    const searchEngine = getSearchEngine();
    const results = await searchEngine.search(query, spreadsheetId, options);

    return results;
  }

  async getCurrentSpreadsheet() {
    const searchEngine = getSearchEngine();
    const spreadsheet = searchEngine.getCurrentSpreadsheet();

    return {
      spreadsheet: spreadsheet,
      hasData: !!spreadsheet
    };
  }

  async selectGlossaryTab(tabName) {
    const searchEngine = getSearchEngine();
    return await searchEngine.selectGlossaryTab(tabName);
  }

  async getAnalytics() {
    const searchEngine = getSearchEngine();
    const spreadsheet = searchEngine.getCurrentSpreadsheet();
    
    if (!spreadsheet) {
      return {
        hasData: false,
        message: 'No spreadsheet loaded',
        timestamp: new Date().toISOString()
      };
    }
    
    const analytics = {
      hasData: true,
      fileName: spreadsheet.fileName,
      totalSheets: spreadsheet.stats.sheets,
      totalCells: spreadsheet.stats.totalCells,
      totalFormulas: spreadsheet.stats.formulaCells,
      businessConcepts: spreadsheet.stats.businessConcepts.length,
      selectedGlossaryTab: spreadsheet.selectedGlossaryTab,
      tabs: spreadsheet.tabs,
      processedAt: spreadsheet.processedAt,
      timestamp: new Date().toISOString()
    };

    return analytics;
  }

  async generateSuggestions(partialQuery, maxSuggestions = 8) {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    const searchEngine = getSearchEngine();
    const spreadsheets = Array.from(searchEngine.spreadsheetData.values());
    
    if (spreadsheets.length === 0) {
      return [];
    }

    const spreadsheetData = spreadsheets[0];
    const headers = this.extractHeaders(spreadsheetData);

    const suggestions = [
      ...headers.slice(0, 5).map(header => `Find all ${header} data`),
      ...headers.slice(0, 3).map(header => `Show ${header} values`),
      'Find maximum values',
      'Show totals and averages',
      'Calculate growth rates',
      'Compare performance metrics'
    ].filter(Boolean).slice(0, maxSuggestions);

    return suggestions;
  }

  extractHeaders(spreadsheetData) {
    const headers = new Set();
    
    if (spreadsheetData.data && spreadsheetData.data.sheets) {
      spreadsheetData.data.sheets.forEach(sheet => {
        if (sheet.data && sheet.data.length > 0) {
          sheet.data[0].cells.forEach(cell => {
            if (cell.header && cell.header.trim()) {
              headers.add(cell.header.trim());
            }
          });
        }
      });
    }
    
    return Array.from(headers);
  }

  getExampleQueries() {
    return [
      {
        category: 'Financial Metrics',
        queries: [
          'Find all revenue data',
          'Show profit calculations',
          'Where are my margins?',
          'Calculate growth rates'
        ]
      },
      {
        category: 'Performance Analysis',
        queries: [
          'Find top performers',
          'Show efficiency metrics',
          'Compare quarterly results',
          'Analyze trends over time'
        ]
      },
      {
        category: 'Data Exploration',
        queries: [
          'Show all calculations',
          'Find percentage values',
          'Where are the totals?',
          'List all metrics'
        ]
      }
    ];
  }

  async checkLLMHealth() {
    try {
      const gemini = new GeminiClient();
      await gemini.initialize();
      
      const healthStatus = await gemini.healthCheck();
      const statusMessage = gemini.getStatusMessage(healthStatus);
      
      return {
        ...healthStatus,
        message: statusMessage,
        superjoinStatus: healthStatus.available ? 'UP' : 'DOWN'
      };
    } catch (error) {
      console.error('❌ LLM health check failed:', error);
      return {
        status: 'error',
        available: false,
        apiKeyConfigured: !!process.env.GEMINI_API_KEY,
        initialized: false,
        lastChecked: new Date().toISOString(),
        responseTime: null,
        error: error.message,
        message: '🔴 SYSTEM DOWN - LLM health check failed',
        superjoinStatus: 'DOWN'
      };
    }
  }

  async processGoogleSheetsLink(link) {
    try {
        console.log('🔗 Processing Google Sheets link:', link);
        
        const googleSheetsService = require('./googleSheetsService');
        const spreadsheetId = googleSheetsService.extractSpreadsheetId(link);
        
        if (!spreadsheetId) {
            throw new Error('Invalid Google Sheets URL');
        }
        
        console.log('📊 Extracted spreadsheet ID:', spreadsheetId);

        console.log('📥 Fetching data from Google Sheets API...');
        const data = await googleSheetsService.getSpreadsheetData(spreadsheetId);
        console.log('✅ Successfully fetched Google Sheets data');
        
        console.log('🔄 Processing spreadsheet data...');
        // Process the data similar to uploaded files
        const processedData = await this.processSpreadsheetData(data);
        console.log('✅ Successfully processed spreadsheet data');
        
        return processedData;
    } catch (error) {
        console.error('❌ Error in processGoogleSheetsLink:', error);
        throw new Error(`Failed to process Google Sheets link: ${error.message}`);
    }
  }

  async processSpreadsheetData(googleSheetsData) {
    try {
      console.log('🔄 Converting Google Sheets format...');
      // Convert Google Sheets format to our internal format
      const formattedData = this.convertGoogleSheetsFormat(googleSheetsData);
      
      console.log('🔄 Processing with LLM search engine...');
      // Process with LLM search engine
      const searchEngine = getSearchEngine();
      const result = await searchEngine.processGoogleSheetsData(formattedData);
      
      return result;
    } catch (error) {
      console.error('❌ Error in processSpreadsheetData:', error);
      throw new Error(`Failed to process spreadsheet data: ${error.message}`);
    }
  }

  convertGoogleSheetsFormat(googleSheetsData) {
    try {
      console.log('🔄 Converting sheets data...');
      const sheets = [];
      
      if (!googleSheetsData || !googleSheetsData.sheets) {
        throw new Error('Invalid Google Sheets data structure');
      }
      
      // Extract spreadsheet title from metadata
      const title = googleSheetsData.metadata?.properties?.title || 'Untitled Spreadsheet';
      
      for (const [sheetName, values] of Object.entries(googleSheetsData.sheets)) {
        console.log(`📄 Processing sheet: ${sheetName}`);
        
        // Skip empty sheets
        if (!values || values.length === 0) {
          console.log(`⚠️ Skipping empty sheet: ${sheetName}`);
          continue;
        }
        
        // Convert 2D array to our format
        const sheetData = {
          name: sheetName,
          data: values.map((row, rowIndex) => {
            const rowData = {};
            if (row && row.length > 0) {
              row.forEach((cell, colIndex) => {
                try {
                  const colLetter = this.numberToColumnLetter(colIndex + 1);
                  // Handle formulas and error values safely
                  let cellValue = cell;
                  if (typeof cell === 'string') {
                    // Handle formula errors
                    if (cell.includes('#DIV/0!') || cell.includes('#NAME?') || cell.includes('#REF!') || cell.includes('#VALUE!')) {
                      cellValue = '0'; // Replace errors with 0 for processing
                    }
                    // Handle formulas starting with = 
                    else if (cell.startsWith('=')) {
                      cellValue = cell; // Keep formula as-is, but ensure it's safe
                    }
                  }
                  rowData[colLetter] = cellValue || '';
                } catch (cellError) {
                  console.error(`Error processing cell [${rowIndex}][${colIndex}]:`, cellError);
                  rowData[this.numberToColumnLetter(colIndex + 1)] = '';
                }
              });
            }
            return rowData;
          })
        };
        
        sheets.push(sheetData);
        console.log(`✅ Processed sheet: ${sheetName} with ${sheetData.data.length} rows`);
      }
      
      const result = {
        title: title,
        sheets: sheets,
        metadata: googleSheetsData.metadata || {}
      };
      
      console.log(`✅ Converted ${sheets.length} sheets successfully`);
      return result;
    } catch (error) {
      console.error('❌ Error in convertGoogleSheetsFormat:', error);
      throw error;
    }
  }

  numberToColumnLetter(num) {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  }
}

module.exports = new SpreadsheetService();