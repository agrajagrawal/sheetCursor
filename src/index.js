// Load fetch polyfill FIRST - before any other imports
const fetch = require('node-fetch');
const FormData = require('form-data');

// Set up global polyfills immediately
global.fetch = fetch;
global.Request = fetch.Request;
global.Response = fetch.Response;
global.Headers = fetch.Headers;
global.FormData = FormData;
global.URL = require('url').URL;
global.URLSearchParams = require('url').URLSearchParams;

console.log('✅ Fetch polyfill configured globally');

// Now import everything else
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const router = require('./routes/api');
const { initializeSearchEngine } = require('./core/llmSearchEngine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Initialize search engine
initializeSearchEngine().then(() => {
  console.log('🧠 Semantic search engine initialized');
}).catch(console.error);

// API routes
app.use('/api', router);

// Serve demo HTML for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../demo.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Superjoin Semantic Search running on port ${PORT}`);
  console.log(`📊 Web interface: http://localhost:${PORT}`);
  console.log(`🔍 API endpoint: http://localhost:${PORT}/api`);
});

module.exports = app;

