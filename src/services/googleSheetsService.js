const { google } = require('googleapis');
require('dotenv').config();

class GoogleSheetsService {
    constructor() {
        this.sheets = null;
        this.apiKey = process.env.GOOGLE_SHEETS_API_KEY;
        if (!this.apiKey) {
            throw new Error('GOOGLE_SHEETS_API_KEY is required in .env file');
        }
    }

    async initialize() {
        try {
            this.sheets = google.sheets({
                version: 'v4',
                auth: this.apiKey
            });
        } catch (error) {
            throw new Error(`Failed to initialize Google Sheets API: ${error.message}`);
        }
    }

    async getSpreadsheetData(spreadsheetId) {
        if (!this.sheets) {
            await this.initialize();
        }

        try {
            console.log('📊 Fetching spreadsheet metadata...');
            // Get spreadsheet metadata
            const metadata = await this.sheets.spreadsheets.get({
                spreadsheetId
            });

            const allData = {};
            const sheets = metadata.data.sheets;

            console.log(`📄 Found ${sheets.length} sheets`);

            // Get data from all sheets
            for (const sheet of sheets) {
                const sheetTitle = sheet.properties.title;
                console.log(`📥 Fetching data from sheet: ${sheetTitle}`);

                try {
                    const response = await this.sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range: `${sheetTitle}!A1:Z1000`
                    });

                    allData[sheetTitle] = response.data.values || [];
                    console.log(`✅ Retrieved ${(response.data.values || []).length} rows from sheet: ${sheetTitle}`);
                } catch (sheetError) {
                    console.error(`❌ Error getting data from sheet ${sheetTitle}:`, sheetError.message);
                    allData[sheetTitle] = []; // Empty array for failed sheets
                }
            }

            return {
                metadata: metadata.data,
                sheets: allData
            };
        } catch (error) {
            console.error('❌ Error in getSpreadsheetData:', error);
            throw new Error(`Failed to fetch spreadsheet data: ${error.message}`);
        }
    }

    extractSpreadsheetId(url) {
        try {
            const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            return match ? match[1] : null;
        } catch (error) {
            return null;
        }
    }
}

module.exports = new GoogleSheetsService();
