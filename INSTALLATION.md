# Installation Guide

## Prerequisites

### System Requirements
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- FFmpeg (for video processing)
- Redis (optional, for distributed queue)

### Install FFmpeg

#### Windows
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

#### macOS
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

#### Linux (Fedora)
```bash
sudo dnf install ffmpeg
```

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/yusufnoor786/video-downloader-platform.git
cd video-downloader-platform
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm run install-all

# Or manually:
cd extension && npm install && cd ..
cd backend && npm install && cd ..
```

### 3. Configure Backend

Create `.env` file in backend directory:

```env
# Backend Configuration
NODE_ENV=development
PORT=3000
BACKEND_URL=http://localhost:3000

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# Database
DATABASE_URL=sqlite:./data/database.db
DATABASE_SYNC=true

# Redis (optional, for queue distribution)
REDIS_URL=redis://localhost:6379
USE_REDIS=false

# Download Settings
MAX_CONCURRENT_DOWNLOADS=5
DOWNLOAD_TIMEOUT=3600
DOWNLOAD_CHUNK_SIZE=1048576

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
RATE_LIMIT=100
RATE_LIMIT_WINDOW=900000

# CORS
CORS_ORIGIN=chrome-extension://*
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# Storage
DOWNLOAD_DIR=./downloads
TEMP_DIR=./tmp
MAX_STORAGE_GB=100
```

### 4. Initialize Backend

```bash
cd backend

# Create necessary directories
mkdir -p data logs downloads tmp

# Build backend
npm run build
```

### 5. Build Extension

```bash
cd extension

# Build for production
npm run build

# Output will be in dist/ folder
```

## Development Setup

### Start Backend Development Server

```bash
cd backend
npm run dev
```

Server will run at `http://localhost:3000`

### Start Extension Development Build

```bash
cd extension
npm run dev
```

This watches for changes and rebuilds automatically.

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. Extension will appear in your extensions list

### Pin Extension to Toolbar

1. Click the Extensions icon in Chrome toolbar
2. Find "Video Downloader Platform"
3. Click the pin icon to keep it visible

## Docker Setup

### Build Docker Images

```bash
npm run docker-build
```

### Start Services

```bash
npm run docker-up
```

This starts:
- Backend API (port 3000)
- PostgreSQL Database (port 5432)
- Redis Cache (port 6379)
- Nginx Reverse Proxy (port 80, 443)

### View Logs

```bash
npm run docker-logs
```

### Stop Services

```bash
npm run docker-down
```

## Verify Installation

### Backend Health Check

```bash
# Should return 200 OK
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-10T12:00:00Z",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

### Test Extension

1. Navigate to a website with videos (YouTube, etc.)
2. Click the extension icon in toolbar
3. Should show detected videos
4. Try analyzing a video

## Troubleshooting

### FFmpeg not found

```bash
# Verify FFmpeg is installed
ffmpeg -version
ffprobe -version

# Update .env with correct path
# Windows: C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe
# Linux: /usr/bin/ffmpeg
# macOS: /usr/local/bin/ffmpeg
```

### Port Already in Use

```bash
# Change port in .env
PORT=3001

# Or kill existing process
# Linux/macOS:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Extension not loading

1. Check browser console for errors: F12 > Console
2. Check extension page errors: chrome://extensions (Developer mode)
3. Verify manifest.json is valid: `npm run lint`
4. Try reloading extension: Click refresh icon on extension card

### Backend connection failed

1. Verify backend is running: `http://localhost:3000/api/health`
2. Check CORS settings in .env
3. Check firewall settings
4. Review backend logs: `tail -f backend/logs/app.log`

### Database errors

```bash
# Reset database
rm backend/data/database.db

# Rebuild will auto-create tables
npm run build --workspace=backend
```

## Next Steps

1. Read [API_REFERENCE.md](./docs/API_REFERENCE.md) for API documentation
2. Review [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design
3. Check [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production setup
4. Explore source code in `extension/src` and `backend/src`

## Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET in .env
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure Redis
- [ ] Set up PostgreSQL
- [ ] Configure backup strategy
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Review security settings
- [ ] Set up logging aggregation
- [ ] Load test the system
- [ ] Create disaster recovery plan
