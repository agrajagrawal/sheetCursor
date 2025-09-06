const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ;
    this.client = null;
    this.model = null;
    this.initialized = false;
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error('❌ GEMINI_API_KEY is required. Add it to your .env file. Get one from: https://ai.google.dev/');
    }

    try {
      this.client = new GoogleGenerativeAI(this.apiKey);
      this.model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      this.initialized = true;
      console.log('✅ Gemini AI client initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error.message);
      throw new Error(`❌ Gemini initialization failed: ${error.message}`);
    }
  }

  async generateText(prompt, options = {}) {
    // Verify fetch is available
    if (typeof global.fetch !== 'function') {
      console.error('❌ fetch is not available:', typeof global.fetch);
      throw new Error('fetch is not available - ensure node-fetch is properly configured');
    }
    
    if (!this.initialized) {
      throw new Error('Gemini client not initialized');
    }

    console.log('🔍 Generating text with Gemini...');
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('✅ Successfully generated text');
      return text;
    } catch (error) {
      console.error('❌ Error generating text with Gemini:', error.message);
      throw error;
    }
  }

  async analyzeQuery(query, spreadsheetContext) {
    const prompt = `
You are an expert at understanding natural language queries about spreadsheet data.

SPREADSHEET CONTEXT:
- Headers: ${spreadsheetContext.headers.join(', ')}
- Data types: ${spreadsheetContext.dataTypes.join(', ')}
- Sample values: ${spreadsheetContext.sampleValues.join(', ')}
- Domain detected: ${spreadsheetContext.domain || 'Unknown'}

USER QUERY: "${query}"

Analyze this query and return a JSON response with:
{
  "intent": "find|compare|analyze|filter|calculate|summarize",
  "concepts": ["list", "of", "relevant", "concepts", "from", "actual", "data"],
  "queryType": "conceptual|functional|comparative|temporal",
  "suggestedColumns": ["column", "names", "that", "match"],
  "searchTerms": ["key", "terms", "to", "search", "for"],
  "explanation": "Brief explanation of what the user is looking for"
}

Focus on concepts that actually exist in the provided spreadsheet data, not generic business terms.
`;

    try {
      const response = await this.generateText(prompt);
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid LLM response format - no JSON found');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('❌ Error analyzing query with Gemini:', error);
      throw new Error(`LLM analysis failed: ${error.message}`);
    }
  }

  async detectDomain(spreadsheetData) {
    const sampleData = this.extractSampleData(spreadsheetData);
    
    const prompt = `
Analyze this spreadsheet data and determine what domain/field it belongs to:

HEADERS: ${sampleData.headers.join(', ')}
SAMPLE DATA: ${sampleData.samples.join(', ')}

Return a JSON response with:
{
  "domain": "finance|education|sales|hr|marketing|operations|healthcare|retail|other",
  "confidence": 0.0-1.0,
  "relevantConcepts": ["list", "of", "concepts", "relevant", "to", "this", "domain"],
  "explanation": "Why you think this is the domain"
}

Base your analysis on the actual column headers and data patterns you see.
`;

    try {
      const response = await this.generateText(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid LLM response format - no JSON found');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('❌ Error detecting domain with Gemini:', error);
      throw new Error(`LLM domain detection failed: ${error.message}`);
    }
  }

  async generateSearchSuggestions(query, spreadsheetContext) {
    const prompt = `
Based on this spreadsheet data and partial user query, suggest relevant search queries:

SPREADSHEET HEADERS: ${spreadsheetContext.headers.join(', ')}
PARTIAL QUERY: "${query}"

Generate 5-8 relevant search suggestions that would help the user find information in this specific spreadsheet.
Return as a simple array of strings, one suggestion per line.

Focus on queries that make sense for the actual data available.
`;

    try {
      const response = await this.generateText(prompt);
      return response.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 8);
    } catch (error) {
      console.error('❌ Error generating suggestions with Gemini:', error);
      throw new Error(`LLM suggestion generation failed: ${error.message}`);
    }
  }

  extractSampleData(spreadsheetData) {
    const headers = new Set();
    const samples = new Set();
    
    if (spreadsheetData.sheets) {
      spreadsheetData.sheets.forEach(sheet => {
        if (sheet.data && sheet.data.length > 0) {
          // Get headers from first row
          sheet.data[0].cells.forEach(cell => {
            if (cell.header) headers.add(cell.header);
          });
          
          // Get sample values from first few rows
          sheet.data.slice(0, 3).forEach(row => {
            row.cells.forEach(cell => {
              if (cell.value && typeof cell.value === 'string' && cell.value.length < 50) {
                samples.add(cell.value);
              }
            });
          });
        }
      });
    }
    
    return {
      headers: Array.from(headers).slice(0, 20),
      samples: Array.from(samples).slice(0, 10)
    };
  }


  isAvailable() {
    return this.initialized && this.apiKey;
  }

  async healthCheck() {
    const healthStatus = {
      status: 'unknown',
      available: false,
      apiKeyConfigured: !!this.apiKey,
      initialized: this.initialized,
      lastChecked: new Date().toISOString(),
      responseTime: null,
      error: null
    };

    if (!this.apiKey) {
      healthStatus.status = 'no_api_key';
      healthStatus.error = 'CRITICAL: No Gemini API key configured - System DOWN';
      return healthStatus;
    }

    if (!this.initialized) {
      healthStatus.status = 'not_initialized';
      healthStatus.error = 'CRITICAL: Gemini client not initialized - System DOWN';
      return healthStatus;
    }

    try {
      const startTime = Date.now();
      
      // Simple test prompt that won't use many tokens
      const testPrompt = 'Respond with just the word "OK" if you can understand this message.';
      
      const response = await this.generateText(testPrompt);
      const responseTime = Date.now() - startTime;
      
      healthStatus.status = 'healthy';
      healthStatus.available = true;
      healthStatus.responseTime = responseTime;
      
      // Validate response
      if (response && response.toLowerCase().includes('ok')) {
        healthStatus.status = 'healthy';
      } else {
        healthStatus.status = 'unexpected_response';
        healthStatus.error = 'LLM responded but with unexpected content';
      }

    } catch (error) {
      healthStatus.status = 'error';
      healthStatus.available = false;
      healthStatus.error = error.message;
      
      // Categorize common errors
      if (error.message.includes('API key')) {
        healthStatus.status = 'invalid_api_key';
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        healthStatus.status = 'quota_exceeded';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        healthStatus.status = 'network_error';
      }
    }

    return healthStatus;
  }

  getStatusMessage(healthStatus) {
    const messages = {
      'healthy': '🟢 LLM is working perfectly',
      'no_api_key': '🔴 SYSTEM DOWN - No API key configured',
      'not_initialized': '🔴 SYSTEM DOWN - LLM not initialized',
      'invalid_api_key': '🔴 SYSTEM DOWN - Invalid or expired API key',
      'quota_exceeded': '🔴 SYSTEM DOWN - API quota exceeded',
      'network_error': '🔴 SYSTEM DOWN - Network connectivity issues',
      'error': '🔴 SYSTEM DOWN - LLM service error',
      'unexpected_response': '🔴 SYSTEM DOWN - LLM malfunction'
    };

    return messages[healthStatus.status] || '🔴 SYSTEM DOWN - Unknown error';
  }
}

module.exports = { GeminiClient };
