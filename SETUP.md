# 🛠️ Setup Guide - Superjoin Semantic Search Engine

> **Complete setup instructions for development and production environments**

## 📋 Table of Contents

- [⚡ Quick Setup](#-quick-setup)
- [📋 Prerequisites](#-prerequisites)
- [🔑 API Keys Configuration](#-api-keys-configuration)
- [💻 Development Setup](#-development-setup)
- [🚀 Production Deployment](#-production-deployment)
- [🧪 Testing](#-testing)
- [🔧 Troubleshooting](#-troubleshooting)
- [📊 Environment Variables](#-environment-variables)

---

## ⚡ Quick Setup

**For the impatient developer:**

```bash
# 1. Clone and install
git clone <repository-url>
cd superjoin
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your API keys (see below)

# 3. Start development server
npm run dev

# 4. Open in browser
open http://localhost:3000
```

**🎯 Expected Result**: You should see the Superjoin interface with LLM status indicator.

---

## 📋 Prerequisites

### **System Requirements**

| Component | Version | Notes |
|-----------|---------|-------|
| **Node.js** | 20.x or higher | Use `nvm` for version management |
| **npm** | 10.x or higher | Comes with Node.js |
| **Git** | Latest | For version control |

### **API Access Required**

| Service | Purpose | Cost |
|---------|---------|------|
| **Google Gemini API** | LLM processing | Free tier: 50 requests/day |
| **Google Sheets API** | Spreadsheet integration | Free: 100 requests/100 seconds |

---

## 🔑 API Keys Configuration

### **1. Google Gemini API Key**

1. **Visit Google AI Studio**: https://aistudio.google.com/
2. **Create Account**: Sign in with your Google account
3. **Generate API Key**:
   - Click "Get API Key"
   - Create new project or select existing
   - Copy the generated key

### **2. Google Sheets API Key**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create/Select Project**:
   ```
   Project Name: superjoin-semantic-search
   ```
3. **Enable Google Sheets API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. **Create Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated key
   - **Optional**: Restrict key to Google Sheets API only

### **3. Environment Configuration**

Create `.env` file in project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your keys:

```env
# LLM Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Google Sheets Integration
GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional: Logging
LOG_LEVEL=info
```

---

## 💻 Development Setup

### **1. Install Dependencies**

```bash
# Install all packages
npm install

# Verify installation
npm list --depth=0
```

**Expected packages:**
- `express`: Web framework
- `@google/generative-ai`: Gemini LLM client
- `googleapis`: Google Sheets API client
- `dotenv`: Environment variable management

### **2. Verify Node.js Version**

```bash
# Check Node.js version
node --version
# Should output: v20.x.x or higher

# If using nvm (recommended)
nvm use 20
nvm alias default 20
```

### **3. Start Development Server**

```bash
# Start with auto-reload
npm run dev

# Or start normally
npm start

# Or start with Node.js directly
node src/index.js
```

**🎯 Success Indicators:**
```
✅ Fetch polyfill configured globally
🧠 Initializing LLM-powered search engine...
✅ Gemini AI client initialized
🚀 Superjoin Semantic Search running on port 3000
📊 Web interface: http://localhost:3000
🔍 API endpoint: http://localhost:3000/api
✅ LLM search engine ready
```

### **4. Verify Setup**

1. **Open Browser**: Navigate to http://localhost:3000
2. **Check LLM Status**: Should show "🟢 Superjoin UP"
3. **Test Google Sheets**: Paste a test spreadsheet URL
4. **Run Sample Query**: Try "Find revenue calculations"

---

## 🚀 Production Deployment

### **Environment Setup**

```bash
# Set production environment
export NODE_ENV=production

# Install production dependencies only
npm ci --only=production

# Start with PM2 (recommended)
npm install -g pm2
pm2 start src/index.js --name "superjoin-semantic-search"
```

### **Nginx Configuration** (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Docker Deployment** (Optional)

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["node", "src/index.js"]
```

---

## 🧪 Testing

### **Manual Testing Checklist**

#### **✅ Basic Functionality**
- [ ] Server starts without errors
- [ ] Web interface loads at http://localhost:3000
- [ ] LLM health check shows "UP" status
- [ ] Google Sheets URL processing works

#### **✅ Semantic Search**
Test with sample spreadsheet: `https://docs.google.com/spreadsheets/d/14eiRz4_IevXEIWcxkJHALf6jdF6DjF-TGD6FScV7aYo/edit`

- [ ] Query: "Find revenue calculations" → Returns relevant results
- [ ] Query: "Compare regional performance" → Shows cross-tab analysis
- [ ] Query: "Show variance analysis" → Displays budget vs actual data

#### **✅ Visualization**
- [ ] Click "Visualize" button → Shows loading spinner
- [ ] Chart renders correctly → Interactive and responsive
- [ ] Different query types → Generate appropriate chart types

### **API Testing**

```bash
# Test LLM health endpoint
curl http://localhost:3000/api/llm/health

# Test search endpoint (after loading spreadsheet)
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Find revenue calculations"}'
```

---

## 🔧 Troubleshooting

### **Common Issues**

#### **🚨 "Port 3000 already in use"**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm start
```

#### **🚨 "Gemini API Key Invalid"**
```bash
# Verify your API key
echo $GEMINI_API_KEY

# Test API key manually
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY"
```

#### **🚨 "Google Sheets API Forbidden"**
1. **Check API Key**: Ensure it's correctly set in `.env`
2. **Enable API**: Verify Google Sheets API is enabled in Google Cloud Console
3. **Check Quotas**: Ensure you haven't exceeded rate limits
4. **Public Sheets**: Make sure test spreadsheets are publicly accessible

#### **🚨 "Module Not Found Errors"**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Verify Node.js version
node --version  # Should be 20.x or higher
```

### **Debug Mode**

```bash
# Start with debug logging
DEBUG=* npm start

# Or set log level
LOG_LEVEL=debug npm start
```

### **Performance Issues**

#### **Slow LLM Responses**
- **Check Internet**: LLM calls require stable internet
- **API Quotas**: Verify you haven't hit rate limits
- **Model Selection**: Ensure using `gemini-1.5-flash` (fastest)

#### **Memory Issues**
```bash
# Monitor memory usage
node --max-old-space-size=4096 src/index.js

# Check system resources
top -p $(pgrep -f "node src/index.js")
```

---

## 📊 Environment Variables

### **Complete Reference**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | - | Google Gemini LLM API key |
| `GOOGLE_SHEETS_API_KEY` | ✅ Yes | - | Google Sheets API key |
| `PORT` | ❌ No | 3000 | Server port number |
| `NODE_ENV` | ❌ No | development | Environment mode |
| `LOG_LEVEL` | ❌ No | info | Logging verbosity |

### **Example .env File**

```env
# Required API Keys
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_SHEETS_API_KEY=your_sheets_key_here

# Optional Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Development Settings (optional)
DEBUG=superjoin:*
MAX_MEMORY=4096
```

---

## 🎯 Verification Checklist

After setup, verify everything works:

### **✅ Server Health**
- [ ] Server starts without errors
- [ ] All required environment variables loaded
- [ ] LLM client initializes successfully
- [ ] Google Sheets API connection works

### **✅ Web Interface**
- [ ] Homepage loads at http://localhost:3000
- [ ] LLM status shows "🟢 UP"
- [ ] Google Sheets input field accepts URLs
- [ ] Search interface is responsive

### **✅ Core Functionality**
- [ ] Can load sample spreadsheet
- [ ] Semantic search returns results
- [ ] Visualization button works
- [ ] Charts render correctly

### **✅ Demo Ready**
- [ ] Sample queries work smoothly
- [ ] Response times are acceptable (< 5 seconds)
- [ ] Error handling is graceful
- [ ] UI is professional and polished

---

## 🆘 Getting Help

### **Resources**
- **Documentation**: This README and setup guide
- **API References**: 
  - [Google Gemini API](https://ai.google.dev/docs)
  - [Google Sheets API](https://developers.google.com/sheets/api)
- **Dependencies**: Check `package.json` for version requirements

### **Support Channels**
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub discussions for questions
- **Email**: Contact maintainers for urgent issues

---

<div align="center">

**🎉 Setup Complete! Ready to explore semantic search magic!**

[← Back to README](README.md) • [🚀 Start Demo](http://localhost:3000)

</div>
