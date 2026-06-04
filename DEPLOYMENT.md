# Deployment Guide

## Production Deployment

### Prerequisites
- Ubuntu 20.04 LTS (or similar Linux distribution)
- Docker and Docker Compose installed
- Domain name (SSL certificate)
- SSH access to server
- 2GB+ RAM, 20GB+ disk space

### 1. Server Setup

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y curl git docker.io docker-compose ffmpeg redis-server postgresql

# Add current user to docker group (optional, for running without sudo)
sudo usermod -aG docker $USER

# Verify Docker installation
docker --version
docker-compose --version
```

### 2. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/yusufnoor786/video-downloader-platform.git
cd video-downloader-platform
```

### 3. Configure Environment

Create `.env` file:

```bash
sudo nano .env
```

```env
# Production Configuration
NODE_ENV=production
PORT=3000
BACKEND_URL=https://yourdomain.com

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# Database (PostgreSQL in production)
DATABASE_URL=postgresql://user:password@postgres:5432/video_downloader
DATABASE_SYNC=false
DATABASE_POOL_SIZE=20

# Redis (for queue distribution)
REDIS_URL=redis://redis:6379
USE_REDIS=true

# Download Settings
MAX_CONCURRENT_DOWNLOADS=10
DOWNLOAD_TIMEOUT=7200
DOWNLOAD_CHUNK_SIZE=10485760

# Security
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRATION=7d
RATE_LIMIT=1000
RATE_LIMIT_WINDOW=3600000

# CORS
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# Storage
DOWNLOAD_DIR=/data/downloads
TEMP_DIR=/data/tmp
MAX_STORAGE_GB=500

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=$(openssl rand -base64 32)
```

### 4. SSL Configuration

#### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem
sudo chown $USER:$USER ./ssl/*.pem
```

#### Manual Certificate Upload

```bash
mkdir -p ./ssl
# Place your cert.pem and key.pem in this directory
```

### 5. Docker Compose Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/video_downloader
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./data/downloads:/app/downloads
      - ./data/tmp:/app/tmp
      - ./data/logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=video_downloader
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./docker/html:/usr/share/nginx/html:ro
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 6. Start Production Services

```bash
# Build and start services
sudo docker-compose -f docker-compose.prod.yml build
sudo docker-compose -f docker-compose.prod.yml up -d

# Verify services are running
sudo docker-compose ps

# Check logs
sudo docker-compose logs -f backend
```

### 7. Verify Deployment

```bash
# Check backend health
curl -k https://yourdomain.com/api/health

# Check database connection
sudo docker-compose exec backend npm run db:check

# View logs
sudo docker-compose logs --tail=100 backend
```

## Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
sudo docker-compose logs -f backend

# Last 100 lines
sudo docker-compose logs --tail=100 backend

# Specific service
sudo docker-compose logs backend postgres redis
```

### System Monitoring

```bash
# CPU and memory usage
top

# Disk usage
df -h

# Docker stats
docker stats

# Process monitoring
ps aux | grep docker
```

### Database Backup

```bash
# Backup database
sudo docker-compose exec postgres pg_dump -U postgres video_downloader > backup-$(date +%Y%m%d).sql

# Backup downloads
tar -czf downloads-backup-$(date +%Y%m%d).tar.gz ./data/downloads

# Schedule automated backups (cron)
0 2 * * * cd /opt/video-downloader-platform && sudo docker-compose exec postgres pg_dump -U postgres video_downloader > /backups/db-$(date +\%Y\%m\%d).sql
```

### Update Services

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
sudo docker-compose -f docker-compose.prod.yml build --no-cache
sudo docker-compose -f docker-compose.prod.yml up -d

# Verify new deployment
sudo docker-compose logs backend
```

## Troubleshooting

### Check Container Status

```bash
sudo docker ps -a
sudo docker-compose ps
```

### View Container Logs

```bash
sudo docker-compose logs backend
sudo docker-compose logs postgres
sudo docker-compose logs redis
sudo docker-compose logs nginx
```

### Restart Services

```bash
# Restart all services
sudo docker-compose restart

# Restart specific service
sudo docker-compose restart backend
sudo docker-compose restart postgres
```

### Check Network

```bash
# Test connectivity between containers
sudo docker-compose exec backend curl http://postgres:5432
sudo docker-compose exec backend curl http://redis:6379
```

## Security Hardening

### 1. Firewall Configuration

```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### 2. SSH Hardening

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
Port 22022              # Change default port
PermitRootLogin no
PasswordAuthentication no  # Use key-based auth
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3

# Restart SSH
sudo systemctl restart ssh
```

### 3. API Rate Limiting

Already configured in `.env`:
```env
RATE_LIMIT=1000
RATE_LIMIT_WINDOW=3600000  # 1 hour
```

### 4. Regular Updates

```bash
# Enable automatic security updates
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Performance Tuning

### Increase File Descriptors

```bash
sudo nano /etc/security/limits.conf

# Add:
* soft nofile 65535
* hard nofile 65535
```

### Tune TCP Settings

```bash
sudo nano /etc/sysctl.conf

# Add:
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 10000 65535
```

### Redis Optimization

```bash
# Monitor Redis
sudo docker-compose exec redis redis-cli
> INFO server
> INFO memory
> DBSIZE
```

## Scaling

### Horizontal Scaling

1. **Load Balancer Setup**
   - Deploy multiple backend instances
   - Use Nginx as load balancer
   - Configure round-robin or least-conn

2. **Database Replication**
   - Set up PostgreSQL streaming replication
   - Configure read replicas

3. **Redis Cluster**
   - Switch from single Redis to cluster mode
   - Configure Redis Sentinel for HA

## Disaster Recovery

### Regular Backups

```bash
# Daily database backup
0 2 * * * cd /opt/video-downloader-platform && sudo docker-compose exec postgres pg_dump -U postgres video_downloader | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Keep last 30 days
find /backups -name 'db-*.sql.gz' -mtime +30 -delete
```

### Recovery Procedure

```bash
# Restore database from backup
sudo docker-compose exec -T postgres psql -U postgres video_downloader < backup-20240110.sql

# Restore downloads
tar -xzf downloads-backup-20240110.tar.gz
```

## Next Steps

1. Set up monitoring (Prometheus, Grafana)
2. Configure alerting (PagerDuty, Slack)
3. Implement CI/CD pipeline (GitHub Actions)
4. Set up log aggregation (ELK, Datadog)
5. Performance load testing
6. Security audit and penetration testing
