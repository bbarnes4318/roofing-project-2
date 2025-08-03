const Redis = require('ioredis');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
};

// Create Redis client
let redis = null;

// Initialize Redis connection
const initRedis = () => {
  try {
    // Only initialize Redis if URL is provided (for production)
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL);
    } else if (process.env.NODE_ENV === 'production') {
      // In production, use configured Redis
      redis = new Redis(redisConfig);
    } else {
      // In development, Redis is optional - use in-memory cache fallback
      console.log('🟡 Redis not configured - using in-memory cache fallback');
      return null;
    }

    // Event handlers
    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
      // Don't crash the app if Redis fails
      redis = null;
    });

    redis.on('ready', () => {
      console.log('✅ Redis ready to accept commands');
    });

    return redis;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error.message);
    return null;
  }
};

// In-memory cache fallback for when Redis is not available
class InMemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  async get(key) {
    const value = this.cache.get(key);
    return value ? JSON.stringify(value) : null;
  }

  async set(key, value, expirationMode, time) {
    const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
    this.cache.set(key, parsedValue);
    
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // Set expiration
    if (expirationMode === 'EX' && time) {
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, time * 1000);
      this.timers.set(key, timer);
    }
    
    return 'OK';
  }

  async del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key) ? 1 : 0;
  }

  async flushall() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
    return 'OK';
  }

  async keys(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }
}

// Create cache instance (Redis or in-memory fallback)
const cache = initRedis() || new InMemoryCache();

// Cache service with automatic fallback
class CacheService {
  constructor() {
    this.defaultTTL = 300; // 5 minutes default TTL
  }

  // Generate cache key
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  // Get from cache
  async get(key) {
    try {
      if (!cache) return null;
      
      const data = await cache.get(key);
      if (data) {
        console.log(`📦 Cache hit: ${key}`);
        return JSON.parse(data);
      }
      console.log(`📭 Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set in cache
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!cache) return;
      
      await cache.set(key, JSON.stringify(value), 'EX', ttl);
      console.log(`📥 Cached: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Delete from cache
  async del(key) {
    try {
      if (!cache) return;
      
      await cache.del(key);
      console.log(`🗑️ Cache deleted: ${key}`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern) {
    try {
      if (!cache) return;
      
      const keys = await cache.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => cache.del(key)));
        console.log(`🗑️ Cleared ${keys.length} cache entries matching: ${pattern}`);
      }
    } catch (error) {
      console.error('Cache clear pattern error:', error);
    }
  }

  // Clear all cache
  async flush() {
    try {
      if (!cache) return;
      
      await cache.flushall();
      console.log('🗑️ All cache cleared');
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  // Cache middleware for Express routes
  middleware(prefix, ttl = 300) {
    return async (req, res, next) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key from request
      const key = this.generateKey(prefix, {
        ...req.query,
        ...req.params,
        userId: req.user?.id // Include user ID if authenticated
      });

      // Try to get from cache
      const cachedData = await this.get(key);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode === 200) {
          this.set(key, data, ttl);
        }
        return originalJson(data);
      };

      next();
    };
  }

  // Invalidate related cache entries
  async invalidateRelated(entityType, entityId) {
    const patterns = {
      project: [
        `projects:*`,
        `project:${entityId}:*`,
        `tasks:*project*${entityId}*`,
        `workflow:*project*${entityId}*`,
        `alerts:*project*${entityId}*`
      ],
      customer: [
        `customers:*`,
        `customer:${entityId}:*`,
        `projects:*customer*${entityId}*`
      ],
      task: [
        `tasks:*`,
        `task:${entityId}:*`,
        `projects:*`
      ],
      workflow: [
        `workflow:*`,
        `projects:*`,
        `alerts:*`
      ]
    };

    const patternsToInvalidate = patterns[entityType] || [`${entityType}:*`];
    
    for (const pattern of patternsToInvalidate) {
      await this.clearPattern(pattern);
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = {
  redis,
  cache,
  cacheService
};