const { GeminiClient } = require('../llm/geminiClient');

class LLMSearchEngine {
  constructor() {
    this.gemini = new GeminiClient();
    this.currentSpreadsheet = null; // Single file only
    this.selectedGlossaryTab = null; // User-selected training tab
    this.initialized = false;
  }

  async initialize() {
    console.log('🧠 Initializing LLM-powered search engine...');
    
    // LLM is required - no fallback
    await this.gemini.initialize();
    this.initialized = true;
    
    console.log('✅ LLM search engine ready');
  }

  async processSpreadsheet(filePath, fileBuffer) {
    try {
      console.log(`📊 Processing spreadsheet: ${filePath}`);
      
      // Parse Excel file
      const rawData = await this.parser.parseFile(fileBuffer);
      
      // Store single spreadsheet only (replace any existing)
      this.currentSpreadsheet = {
        fileName: filePath,
        data: rawData,
        processedAt: new Date().toISOString(),
        selectedGlossaryTab: null
      };
      
      console.log(`✅ Processed ${rawData.sheets.length} sheets with ${this.getTotalCells(rawData)} cells`);
      
      // Generate LLM description of the data
      const description = await this.generateDataDescription(rawData);
      
      return {
        data: rawData,
        description: description,
        stats: this.generateBasicStats(rawData),
        tabs: rawData.sheets.map(sheet => ({
          name: sheet.name,
          rowCount: sheet.data ? sheet.data.length : 0,
          hasFormulas: this.hasFormulas(sheet)
        }))
      };
    } catch (error) {
      console.error('❌ Error processing spreadsheet:', error);
      throw new Error(`Failed to process spreadsheet: ${error.message}`);
    }
  }

  async processGoogleSheetsData(formattedData) {
    try {
      console.log(`📊 Processing Google Sheets data`);
      
      // Store single spreadsheet only (replace any existing)
      this.currentSpreadsheet = {
        fileName: formattedData.title || 'Google Sheets',
        data: formattedData,
        processedAt: new Date().toISOString(),
        selectedGlossaryTab: null
      };
      
      console.log(`✅ Processed ${formattedData.sheets.length} sheets with ${this.getTotalCells(formattedData)} cells`);
      
      // Generate LLM description of the data
      console.log('🧠 Generating LLM description...');
      const description = await this.generateDataDescription(formattedData);
      console.log('✅ Successfully generated LLM description');
      
      return {
        title: formattedData.title || 'Google Sheets',
        data: formattedData,
        description: description,
        stats: this.generateBasicStats(formattedData),
        tabs: formattedData.sheets.map(sheet => ({
          name: sheet.name,
          rowCount: sheet.data ? sheet.data.length : 0,
          hasFormulas: this.hasFormulas(sheet)
        }))
      };
    } catch (error) {
      console.error('❌ Error processing Google Sheets data:', error);
      throw new Error(`Failed to process Google Sheets data: ${error.message}`);
    }
  }

  async search(query, options = {}) {
    try {
      console.log(`🔍 LLM Search for: "${query}"`);
      
      // Check if we have a spreadsheet loaded
      if (!this.currentSpreadsheet) {
        return {
          query: query,
          answer: 'No spreadsheet loaded',
          message: 'Please upload a spreadsheet first to enable search.'
        };
      }

      // Use LLM to find the best answer across ALL tabs
      return await this.llmSearch(query, this.currentSpreadsheet);
      
    } catch (error) {
      console.error('❌ Search error:', error);
      return {
        query: query,
        results: [],
        message: `Search failed: ${error.message}`
      };
    }
  }

  async llmSearch(query, spreadsheet) {
    // Build context for LLM using ALL tabs
    const context = this.buildLLMContext(spreadsheet.data);
    
    // Add glossary context if a tab is selected
    let glossaryContext = '';
    if (spreadsheet.selectedGlossaryTab) {
      const glossarySheet = spreadsheet.data.sheets.find(s => s.name === spreadsheet.selectedGlossaryTab);
      if (glossarySheet) {
        glossaryContext = this.buildGlossaryContext(glossarySheet);
      }
    }
    
    const prompt = `
You are a professional spreadsheet analysis expert. A user is asking: "${query}"

SPREADSHEET DATA (ALL TABS):
${context}

${glossaryContext ? `GLOSSARY/TRAINING DATA from tab "${spreadsheet.selectedGlossaryTab}":
${glossaryContext}

Use this glossary to understand business terms and definitions.
` : ''}

IMPORTANT: Provide a clean, professional response suitable for business demos.

Your task:
1. Analyze ALL tabs to find the BEST answer
2. Use data from multiple tabs if needed 
3. Use existing formulas from the spreadsheet when available
4. If calculation is needed, show the formula clearly
5. Give ONE perfect answer with clear explanation

Respond with VALID JSON only (no extra text):
{
  "answer": "Clear, direct answer to the question",
  "location": "Specific sheet and cell references",
  "value": "Actual numeric value or result as STRING",
  "explanation": "Concise explanation of how you found this answer",
  "calculation": "Formula used (if any) as STRING",
  "tabsUsed": ["list", "of", "sheet", "names"],
  "alternatives": ["other", "relevant", "findings"],
  "suggestion": "Additional insights or recommendations"
}

CRITICAL: All values must be strings or arrays, NO objects. Keep responses concise and professional.
`;

    const response = await this.gemini.generateText(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('LLM returned invalid response format');
    }

    const llmResult = JSON.parse(jsonMatch[0]);
    
    return {
      query: query,
      answer: llmResult.answer || 'No answer provided',
      location: llmResult.location || 'Location not specified',
      value: typeof llmResult.value === 'object' ? JSON.stringify(llmResult.value) : (llmResult.value || 'N/A'),
      explanation: llmResult.explanation || 'No explanation provided',
      calculation: typeof llmResult.calculation === 'object' ? JSON.stringify(llmResult.calculation) : (llmResult.calculation || 'No calculation performed'),
      tabsUsed: Array.isArray(llmResult.tabsUsed) ? llmResult.tabsUsed : [],
      alternatives: Array.isArray(llmResult.alternatives) ? llmResult.alternatives : [],
      suggestion: llmResult.suggestion || '',
      isLLMGenerated: true
    };
  }


  async generateDataDescription(rawData) {
    const context = this.buildLLMContext(rawData);
    
    const prompt = `
Analyze this spreadsheet data and provide a ONE LINE description of what it contains:

${context}

Respond with just one sentence describing what this data is about, like:
"Your data is school financial data with student fees, teacher salaries, and performance metrics across 3 tabs"
or
"Your data is company financial statements with revenue, costs, and profitability metrics"

Keep it simple and descriptive.
`;

    try {
      const description = await this.gemini.generateText(prompt);
      return description.trim();
    } catch (error) {
      console.error('❌ Error generating data description:', error);
      
      // For testing: provide fallback description when LLM quota exceeded
      if (error.status === 429 || error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests')) {
        console.log('⚠️ Using fallback description due to quota limits');
        const sheetNames = spreadsheetData.sheets.map(s => s.name).join(', ');
        const totalCells = this.getTotalCells(spreadsheetData);
        return `Business data with ${spreadsheetData.sheets.length} sheets (${sheetNames}) containing ${totalCells} cells of metrics and KPIs.`;
      }
      
      throw new Error(`LLM data description failed: ${error.message}`);
    }
  }

  buildLLMContext(spreadsheetData) {
    let context = '';
    
    for (const sheet of spreadsheetData.sheets) {
      context += `\nSHEET: ${sheet.name}\n`;
      
      // Add headers
      if (sheet.data.length > 0) {
        const headers = Object.values(sheet.data[0]).filter(Boolean);
        context += `HEADERS: ${headers.join(', ')}\n`;
        
        // Add sample data (first few rows)
        context += 'SAMPLE DATA:\n';
        sheet.data.slice(0, 5).forEach((row, index) => {
          const rowData = Object.values(row).join(' | ');
          context += `Row ${index + 1}: ${rowData}\n`;
        });
        
        // Add formulas if any
        const formulas = this.extractFormulas(sheet);
        if (formulas.length > 0) {
          context += `FORMULAS: ${formulas.join(', ')}\n`;
        }
      }
      context += '\n';
    }
    
    return context.substring(0, 4000); // Increased limit for more context
  }

  buildGlossaryContext(glossarySheet) {
    let context = 'DEFINITIONS AND BUSINESS TERMS:\n';
    
    if (glossarySheet.data && glossarySheet.data.length > 0) {
      glossarySheet.data.forEach(row => {
        // Handle new object-based row structure
        if (row && typeof row === 'object') {
          const term = row.A || row.a; // First column (A)
          const definition = row.B || row.b; // Second column (B)
          
          if (term && definition && typeof term === 'string' && typeof definition === 'string') {
            context += `${term}: ${definition}\n`;
          }
        }
      });
    }
    
    return context.substring(0, 1000); // Limit glossary context
  }

  extractFormulas(sheet) {
    const formulas = [];
    if (sheet.data) {
      sheet.data.forEach((row, rowIndex) => {
        Object.entries(row).forEach(([colLetter, cellValue]) => {
          if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
            formulas.push(`${colLetter}${rowIndex + 1}: ${cellValue}`);
          }
        });
      });
    }
    return formulas.slice(0, 10); // Limit to 10 formulas
  }

  hasFormulas(sheet) {
    if (!sheet.data) return false;
    
    return sheet.data.some(row => 
      Object.values(row).some(cellValue => 
        typeof cellValue === 'string' && cellValue.startsWith('=')
      )
    );
  }


  generateSpreadsheetId(filePath) {
    return `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTotalCells(data) {
    if (!data || !data.sheets) {
      return 0;
    }
    
    return data.sheets.reduce((total, sheet) => {
      if (!sheet.data) return total;
      return total + sheet.data.reduce((sheetTotal, row) => {
        if (!row) return sheetTotal;
        return sheetTotal + Object.keys(row).length;
      }, 0);
    }, 0);
  }

  generateBasicStats(data) {
    const totalCells = this.getTotalCells(data);
    const formulaCells = data.sheets.reduce((total, sheet) => 
      total + sheet.data.reduce((sheetTotal, row) => 
        sheetTotal + Object.values(row).filter(cellValue => 
          typeof cellValue === 'string' && cellValue.startsWith('=')
        ).length, 0), 0);

    return {
      sheets: data.sheets.length,
      totalCells: totalCells,
      formulaCells: formulaCells,
      businessConcepts: this.extractBasicConcepts(data)
    };
  }

  extractBasicConcepts(data) {
    const concepts = new Set();
    
    data.sheets.forEach(sheet => {
      if (sheet.data && sheet.data.length > 0) {
        // Use first row as headers
        const firstRow = sheet.data[0];
        Object.values(firstRow).forEach(cellValue => {
          if (cellValue && typeof cellValue === 'string' && cellValue.trim()) {
            concepts.add(cellValue.toLowerCase());
          }
        });
      }
    });
    
    return Array.from(concepts).slice(0, 20);
  }

  getCurrentSpreadsheet() {
    if (!this.currentSpreadsheet) {
      return null;
    }
    
    return {
      fileName: this.currentSpreadsheet.fileName,
      stats: this.generateBasicStats(this.currentSpreadsheet.data),
      tabs: this.currentSpreadsheet.data.sheets.map(sheet => ({
        name: sheet.name,
        rowCount: sheet.data ? sheet.data.length : 0,
        hasFormulas: this.hasFormulas(sheet),
        isGlossaryTab: this.currentSpreadsheet.selectedGlossaryTab === sheet.name
      })),
      selectedGlossaryTab: this.currentSpreadsheet.selectedGlossaryTab,
      processedAt: this.currentSpreadsheet.processedAt
    };
  }

  async selectGlossaryTab(tabName) {
    if (!this.currentSpreadsheet) {
      throw new Error('No spreadsheet loaded');
    }

    const tabExists = this.currentSpreadsheet.data.sheets.some(sheet => sheet.name === tabName);
    if (!tabExists) {
      throw new Error(`Tab "${tabName}" not found`);
    }

    this.currentSpreadsheet.selectedGlossaryTab = tabName;
    console.log(`📚 Selected glossary tab: ${tabName}`);
    
    return {
      success: true,
      selectedTab: tabName,
      message: `Tab "${tabName}" selected as training/glossary data`
    };
  }
}

// Global instance
let searchEngine = null;

async function initializeSearchEngine() {
  if (!searchEngine) {
    searchEngine = new LLMSearchEngine();
    await searchEngine.initialize();
  }
  return searchEngine;
}

function getSearchEngine() {
  if (!searchEngine) {
    throw new Error('Search engine not initialized. Call initializeSearchEngine() first.');
  }
  return searchEngine;
}

module.exports = {
  LLMSearchEngine,
  initializeSearchEngine,
  getSearchEngine
};
