const Redis = require('ioredis');

const redis = new Redis({
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || 'casinored1s',
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: false,
});

redis.on('connect',  () => console.log('[Redis] Connected'));
redis.on('error',    (err) => console.error('[Redis] Error:', err.message));

module.exports = redis;
