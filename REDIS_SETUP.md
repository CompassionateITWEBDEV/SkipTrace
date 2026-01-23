# Redis Setup Guide for SkipTrace

Redis is required for:
- Background job queues (batch processing, monitoring)
- Distributed caching (shared across multiple instances)

## Option 1: Docker (Recommended - Easiest)

### Prerequisites
Install Docker Desktop for Windows: https://www.docker.com/products/docker-desktop

### Start Redis Container
```bash
docker run -d --name skiptrace-redis -p 6379:6379 redis:7-alpine
```

### Verify Redis is Running
```bash
docker ps
# You should see skiptrace-redis container running
```

### Test Connection
```bash
docker exec -it skiptrace-redis redis-cli ping
# Should return: PONG
```

### Stop Redis (when needed)
```bash
docker stop skiptrace-redis
```

### Start Redis Again
```bash
docker start skiptrace-redis
```

### Remove Redis Container (if needed)
```bash
docker stop skiptrace-redis
docker rm skiptrace-redis
```

## Option 2: Windows Native Installation

### Using WSL2 (Windows Subsystem for Linux)

1. **Install WSL2** (if not already installed):
   ```powershell
   wsl --install
   ```

2. **Install Redis in WSL2**:
   ```bash
   sudo apt update
   sudo apt install redis-server
   ```

3. **Start Redis**:
   ```bash
   sudo service redis-server start
   ```

4. **Configure Redis to start on boot**:
   ```bash
   sudo systemctl enable redis-server
   ```

### Using Memurai (Windows Native Redis Alternative)

1. Download Memurai from: https://www.memurai.com/get-memurai
2. Install and start the service
3. It runs on port 6379 by default

## Option 3: Cloud Redis (For Production)

### Upstash (Recommended for Serverless)

1. Sign up at https://upstash.com
2. Create a Redis database
3. Copy the connection details
4. Update your `.env` file:
   ```env
   REDIS_HOST=your-upstash-host.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-upstash-password
   ```

### Redis Cloud

1. Sign up at https://redis.com/try-free/
2. Create a free database
3. Update your `.env` with the connection details

## Verify Redis Connection

### Method 1: Health Check Endpoint
After starting your Next.js app, visit:
```
http://localhost:3000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "services": {
    "redis": {
      "status": "up",
      "responseTime": <number>
    }
  }
}
```

### Method 2: Test in Node.js
Create a test file `test-redis.js`:
```javascript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

redis.ping()
  .then(result => {
    console.log('✅ Redis connected!', result);
    redis.disconnect();
  })
  .catch(error => {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  });
```

Run it:
```bash
node test-redis.js
```

## Troubleshooting

### Error: ECONNREFUSED
- **Cause**: Redis is not running
- **Solution**: Start Redis using one of the methods above

### Error: Connection timeout
- **Cause**: Redis is running but not accessible
- **Solution**: 
  1. Check firewall settings
  2. Verify REDIS_HOST and REDIS_PORT in `.env`
  3. For Docker, ensure port 6379 is not in use by another service

### Error: Authentication failed
- **Cause**: Wrong password
- **Solution**: Check REDIS_PASSWORD in `.env` matches your Redis configuration

### Redis not required for development?
The app will work without Redis but with limitations:
- ✅ Caching falls back to in-memory (works for single instance)
- ❌ Background workers won't work (batch jobs, monitoring)
- ❌ Queue operations will fail

For full functionality, Redis is required.

## Quick Start (Docker - Recommended)

```bash
# Start Redis
docker run -d --name skiptrace-redis -p 6379:6379 redis:7-alpine

# Verify it's running
docker ps | grep skiptrace-redis

# Test connection
docker exec -it skiptrace-redis redis-cli ping

# Your app should now connect to Redis automatically
```

## Production Setup

For production, use a managed Redis service:
- **Upstash**: Best for serverless/edge deployments
- **Redis Cloud**: Free tier available, good for traditional deployments
- **AWS ElastiCache**: For AWS deployments
- **Azure Cache for Redis**: For Azure deployments

Update your production `.env` with the managed service credentials.
