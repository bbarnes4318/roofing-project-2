/**
 * Alert Cache Service
 * Provides in-memory caching for alerts to reduce database load
 */

class AlertCacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = 60000; // 60 seconds default TTL
    this.maxSize = 1000; // Maximum cache entries
  }

  /**
   * Generate cache key
   */
  generateKey(type, id) {
    return `${type}:${id}`;
  }

  /**
   * Set cache entry with TTL
   */
  set(key, value, ttlSeconds = 60) {
    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (first in map)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, {
      value,
      expiry,
      hits: 0
    });

    // Schedule cleanup
    setTimeout(() => {
      this.delete(key);
    }, ttlSeconds * 1000);

    return value;
  }

  /**
   * Get cache entry
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Increment hit counter
    entry.hits++;
    
    return entry.value;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0;
    let expired = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      totalHits += entry.hits;
      if (now > entry.expiry) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      expired,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  /**
   * Cache user alerts
   */
  cacheUserAlerts(userId, alerts, ttl = 60) {
    const key = this.generateKey('user-alerts', userId);
    return this.set(key, alerts, ttl);
  }

  /**
   * Get cached user alerts
   */
  getCachedUserAlerts(userId) {
    const key = this.generateKey('user-alerts', userId);
    return this.get(key);
  }

  /**
   * Cache project alerts
   */
  cacheProjectAlerts(projectId, alerts, ttl = 60) {
    const key = this.generateKey('project-alerts', projectId);
    return this.set(key, alerts, ttl);
  }

  /**
   * Get cached project alerts
   */
  getCachedProjectAlerts(projectId) {
    const key = this.generateKey('project-alerts', projectId);
    return this.get(key);
  }

  /**
   * Invalidate user alerts cache
   */
  invalidateUserAlerts(userId) {
    const key = this.generateKey('user-alerts', userId);
    return this.delete(key);
  }

  /**
   * Invalidate project alerts cache
   */
  invalidateProjectAlerts(projectId) {
    const key = this.generateKey('project-alerts', projectId);
    return this.delete(key);
  }

  /**
   * Invalidate all alerts for a project (including user caches)
   */
  invalidateProjectRelatedAlerts(projectId, userIds = []) {
    // Invalidate project cache
    this.invalidateProjectAlerts(projectId);
    
    // Invalidate user caches
    userIds.forEach(userId => {
      this.invalidateUserAlerts(userId);
    });

    console.log(`🗑️ Invalidated alert cache for project ${projectId} and ${userIds.length} users`);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(prisma) {
    try {
      // Get active users
      const activeUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          lastLogin: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: { id: true }
      });

      // Pre-load alerts for active users
      for (const user of activeUsers) {
        const alerts = await prisma.workflowAlert.findMany({
          where: {
            assignedToId: user.id,
            status: 'ACTIVE'
          },
          take: 20,
          orderBy: { priority: 'desc' }
        });

        this.cacheUserAlerts(user.id, alerts, 120); // Cache for 2 minutes
      }

      console.log(`🔥 Warmed up alert cache for ${activeUsers.length} active users`);
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }
}

// Export singleton instance
module.exports = new AlertCacheService();