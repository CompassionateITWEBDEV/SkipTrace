/* global setTimeout */
// Test script to verify Upstash Redis connection
// Run with: node test-upstash-connection.js
// Or use: pnpm tsx test-upstash-connection.js

import Redis from 'ioredis';

// Upstash Redis credentials (from .env)
const redisHost = 'clever-dog-51699.upstash.io';
const redisPort = 6379; // Try 6380 if this doesn't work
const redisPassword = 'AcnzAAIncDE0NWZkMGY5OTY3NTg0Y2U4ODA4OTg1YmQxOGMxNTcxY3AxNTE2OTk';

console.log('Testing Upstash Redis connection...');
console.log(`Host: ${redisHost}`);
console.log(`Port: ${redisPort}`);
console.log('');

// Try with TLS
const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  tls: { rejectUnauthorized: false },
  connectTimeout: 10000,
  retryStrategy: () => null, // Don't retry for test
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis!');
});

redis.on('ready', async () => {
  try {
    const result = await redis.ping();
    console.log(`✅ Redis ping successful: ${result}`);
    
    // Test a simple operation
    await redis.set('test:connection', 'success', 'EX', 10);
    const value = await redis.get('test:connection');
    console.log(`✅ Test write/read successful: ${value}`);
    
    await redis.del('test:connection');
    console.log('✅ Connection test complete!');
    
    redis.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during test:', error);
    redis.disconnect();
    process.exit(1);
  }
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error.message);
  
  // If port 6379 fails, suggest trying 6380
  if (redisPort === 6379 && error.code === 'ECONNREFUSED') {
    console.log('');
    console.log('💡 Tip: If connection fails, try port 6380 instead.');
    console.log('   Update REDIS_PORT="6380" in your .env file');
  }
  
  redis.disconnect();
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('❌ Connection timeout');
  redis.disconnect();
  process.exit(1);
}, 15000);
