package com.arenahub.utils;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory rate limiter using sliding window
 * Prevents abuse of API endpoints (chat spam, booking loops, etc.)
 */
public class RateLimiter {
  private static final Map<String, RequestBucket> buckets = new ConcurrentHashMap<>();
  private static final long WINDOW_MS = 60000; // 1 minute window
  
  /**
   * Request tracking bucket
   */
  public static class RequestBucket {
    public int count;
    public long resetTime;
    
    public RequestBucket() {
      this.count = 0;
      this.resetTime = System.currentTimeMillis() + WINDOW_MS;
    }
  }
  
  /**
   * Check if request exceeds rate limit
   * @param key Unique identifier (e.g., "chat:userId_1" or "booking:userId_2")
   * @param maxRequests Maximum requests allowed per minute
   * @return true if rate limited, false if allowed
   */
  public static boolean isRateLimited(String key, int maxRequests) {
    long now = System.currentTimeMillis();
    RequestBucket bucket = buckets.computeIfAbsent(key, k -> new RequestBucket());
    
    // Reset if window expired
    if (now > bucket.resetTime) {
      bucket.count = 0;
      bucket.resetTime = now + WINDOW_MS;
    }
    
    bucket.count++;
    return bucket.count > maxRequests;
  }
  
  /**
   * Get remaining quota for a key
   */
  public static int getRemainingQuota(String key, int maxRequests) {
    RequestBucket bucket = buckets.get(key);
    if (bucket == null) return maxRequests;
    return Math.max(0, maxRequests - bucket.count);
  }
  
  /**
   * Get time until reset (milliseconds)
   */
  public static long getTimeUntilReset(String key) {
    RequestBucket bucket = buckets.get(key);
    if (bucket == null) return 0;
    long remaining = bucket.resetTime - System.currentTimeMillis();
    return Math.max(0, remaining);
  }
  
  /**
   * Cleanup expired buckets (call periodically, e.g., via scheduled task)
   */
  public static void cleanupExpired() {
    long now = System.currentTimeMillis();
    buckets.entrySet().removeIf(e -> e.getValue().resetTime < now);
  }
  
  /**
   * Clear all buckets (for testing)
   */
  public static void clearAll() {
    buckets.clear();
  }
  
  /**
   * Recommended rate limits per endpoint:
   * - Chat: 10 messages/minute
   * - Booking: 5 bookings/minute
   * - Squad JOIN: 20 joins/minute (joining different squads)
   * - Login attempts: 5 attempts/minute
   */
}
