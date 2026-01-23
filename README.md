# SkipTrace - People Search & Skip Tracing Platform

A comprehensive web-based skip tracing tool built with Next.js, providing multi-method search capabilities, analytics, batch processing, and monitoring features.

## Features

- **Multi-Method Search**: Email, Phone, Name, Address, and Comprehensive AI-Enhanced search
- **User Authentication**: NextAuth-based authentication with user plans
- **Analytics Dashboard**: Real-time search analytics and usage statistics
- **Batch Processing**: Process multiple searches in bulk with background workers
- **Monitoring**: Automated monitoring of individuals with change detection
- **Rate Limiting**: Plan-based rate limiting (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
- **Search Logging**: Comprehensive logging of all searches for analytics
- **Reports & Saved Searches**: Save and share search results

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (Supabase recommended)
- Redis (for background jobs and caching)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables in `.env`:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   DIRECT_URL="your-direct-postgresql-connection-string"
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   RAPIDAPI_KEY="your-rapidapi-key"
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   REDIS_HOST="localhost"
   REDIS_PORT="6379"
   REDIS_PASSWORD=""
   ```

4. Run database migrations:
   ```bash
   pnpm prisma migrate dev
   ```

5. Generate Prisma client:
   ```bash
   pnpm prisma generate
   ```

## Running the Application

### Development Mode

Start the Next.js development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### Production Mode

Build the application:
```bash
pnpm build
```

Start the production server:
```bash
pnpm start
```

## Background Workers

The application uses background workers for batch processing and monitoring. These must be run as separate processes.

### Setup Redis

Redis is required for background workers and distributed caching. See [REDIS_SETUP.md](./REDIS_SETUP.md) for detailed instructions.

**Quick Start (Docker - Recommended):**
```bash
# Start Redis container
docker run -d --name skiptrace-redis -p 6379:6379 redis:7-alpine

# Verify it's running
docker exec -it skiptrace-redis redis-cli ping
# Should return: PONG
```

**Alternative Options:**
- **WSL2**: Install Redis in Windows Subsystem for Linux
- **Memurai**: Windows-native Redis alternative (https://www.memurai.com)
- **Cloud**: Use Upstash (free tier) or Redis Cloud for production

**Verify Connection:**
After starting Redis, test the connection:
```bash
# Visit in browser or use curl
curl http://localhost:3000/api/health
```

The app will work without Redis but with limitations (no background workers, in-memory cache only).

### Running Workers

**All Workers:**
```bash
pnpm worker
```

**Individual Workers:**
```bash
# Batch processing worker
pnpm worker:batch

# Monitoring worker
pnpm worker:monitoring
```

### Process Management

For production, use a process manager:

**PM2:**
```bash
pm2 start pnpm --name "skiptrace-worker" -- worker
pm2 save
pm2 startup
```

**Docker Compose:**
```yaml
services:
  worker:
    build: .
    command: pnpm worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
    depends_on:
      - redis
```

## Health Check

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

This returns the status of:
- Database connection
- Redis connection
- Overall system health

## API Endpoints

### Search Endpoints

- `POST /api/skip-trace` - Email search
- `POST /api/search-phone` - Phone search
- `POST /api/search-name` - Name search
- `POST /api/search-address` - Address search
- `POST /api/enrich-data` - Comprehensive search

### Batch Processing

- `POST /api/batch-search` - Submit batch search job
- `GET /api/batch-search/[jobId]` - Get batch job status

### Analytics

- `GET /api/analytics/stats` - Get analytics statistics

### Monitoring

- `GET /api/relationship-monitor` - Get monitoring services
- `POST /api/monitoring` - Create monitoring subscription

### Health

- `GET /api/health` - System health check

## Database Schema

The application uses Prisma with the following main models:

- **User**: User accounts with plans
- **ApiKey**: API keys for external access
- **SearchLog**: Log of all searches
- **SavedSearch**: Saved search results
- **Report**: Generated reports
- **MonitoringSubscription**: Active monitoring subscriptions
- **BatchJob**: Batch processing jobs

## Error Handling

The application includes comprehensive error handling:

- Database errors are caught and converted to user-friendly messages
- External API errors are handled with retries and fallbacks
- Validation errors provide clear feedback
- Rate limit errors include remaining quota information

## Development

### Code Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── analytics/          # Analytics page
│   └── ...
├── components/             # React components
├── lib/                   # Utility libraries
│   ├── db.ts              # Database client
│   ├── queue.ts           # Queue management
│   ├── error-handler.ts   # Error handling
│   └── ...
├── workers/               # Background workers
│   ├── batch-processor.ts
│   └── monitoring-processor.ts
└── prisma/                # Prisma schema and migrations
```

### Environment Variables

See `.env.example` for all required environment variables.

## Troubleshooting

### Database Connection Issues

If you see `ECONNREFUSED` or timeout errors:

1. Verify your `DATABASE_URL` is correct
2. Check that your database is accessible
3. For Supabase, ensure you're using the correct pooler URL (port 6543)
4. Increase connection timeout if needed (default is 10 seconds)

### Redis Connection Issues

If workers fail to start:

1. Verify Redis is running: `redis-cli ping` (should return `PONG`)
2. Check `REDIS_HOST` and `REDIS_PORT` in `.env`
3. For production, verify Redis credentials

### Worker Not Processing Jobs

1. Ensure worker process is running
2. Check Redis connection
3. Verify jobs are being added to the queue
4. Check worker logs for errors

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub.
