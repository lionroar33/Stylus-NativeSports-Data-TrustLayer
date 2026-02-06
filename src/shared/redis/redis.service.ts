/**
 * Redis Service - Pub/Sub for Real-Time Updates
 * Phase 4: Redis integration for real-time messaging
 */

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private publisher: Redis;
  private subscriber: Redis;
  private subscriptions: Map<string, Set<(message: string, channel: string) => void>> = new Map();
  private isConnected = false;

  constructor() {
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    };

    this.initializeConnections(config);
  }

  private initializeConnections(config: RedisConfig): void {
    // Publisher connection
    this.publisher = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn('Redis connection failed, running without Redis');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    // Subscriber connection (separate connection for subscriptions)
    this.subscriber = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    this.setupEventHandlers();
    this.connect();
  }

  private setupEventHandlers(): void {
    this.publisher.on('connect', () => {
      this.logger.log('Redis publisher connected');
      this.isConnected = true;
    });

    this.publisher.on('error', (err) => {
      this.logger.warn(`Redis publisher error: ${err.message}`);
      this.isConnected = false;
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.subscriber.on('error', (err) => {
      this.logger.warn(`Redis subscriber error: ${err.message}`);
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message, channel);
          } catch (err) {
            this.logger.error(`Error in subscription handler for ${channel}: ${err}`);
          }
        });
      }
    });

    this.subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
      const handlers = this.subscriptions.get(pattern);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message, channel);
          } catch (err) {
            this.logger.error(`Error in pattern subscription handler for ${pattern}: ${err}`);
          }
        });
      }
    });
  }

  private async connect(): Promise<void> {
    try {
      await this.publisher.connect();
      await this.subscriber.connect();
    } catch (err) {
      this.logger.warn('Redis connection failed, running in fallback mode');
    }
  }

  // ============================================
  // Pub/Sub Methods
  // ============================================

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: any): Promise<number> {
    if (!this.isConnected) {
      this.logger.debug(`Redis not connected, skipping publish to ${channel}`);
      return 0;
    }

    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      return await this.publisher.publish(channel, payload);
    } catch (err) {
      this.logger.error(`Failed to publish to ${channel}: ${err}`);
      return 0;
    }
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, handler: (message: string, channel: string) => void): Promise<void> {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      try {
        await this.subscriber.subscribe(channel);
        this.logger.debug(`Subscribed to channel: ${channel}`);
      } catch (err) {
        this.logger.warn(`Failed to subscribe to ${channel}: ${err}`);
      }
    }
    this.subscriptions.get(channel)!.add(handler);
  }

  /**
   * Subscribe to a pattern (e.g., match:*)
   */
  async psubscribe(pattern: string, handler: (message: string, channel: string) => void): Promise<void> {
    if (!this.subscriptions.has(pattern)) {
      this.subscriptions.set(pattern, new Set());
      try {
        await this.subscriber.psubscribe(pattern);
        this.logger.debug(`Subscribed to pattern: ${pattern}`);
      } catch (err) {
        this.logger.warn(`Failed to psubscribe to ${pattern}: ${err}`);
      }
    }
    this.subscriptions.get(pattern)!.add(handler);
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, handler?: (message: string, channel: string) => void): Promise<void> {
    const handlers = this.subscriptions.get(channel);
    if (!handlers) return;

    if (handler) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscriptions.delete(channel);
        try {
          await this.subscriber.unsubscribe(channel);
        } catch (err) {
          this.logger.warn(`Failed to unsubscribe from ${channel}: ${err}`);
        }
      }
    } else {
      this.subscriptions.delete(channel);
      try {
        await this.subscriber.unsubscribe(channel);
      } catch (err) {
        this.logger.warn(`Failed to unsubscribe from ${channel}: ${err}`);
      }
    }
  }

  // ============================================
  // Cache Methods
  // ============================================

  /**
   * Set a value with optional TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.publisher.setex(key, ttlSeconds, payload);
      } else {
        await this.publisher.set(key, payload);
      }
    } catch (err) {
      this.logger.error(`Failed to set ${key}: ${err}`);
    }
  }

  /**
   * Get a value
   */
  async get<T = string>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const value = await this.publisher.get(key);
      if (!value) return null;

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (err) {
      this.logger.error(`Failed to get ${key}: ${err}`);
      return null;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.publisher.del(key);
    } catch (err) {
      this.logger.error(`Failed to delete ${key}: ${err}`);
    }
  }

  /**
   * Store match state for quick access
   */
  async setMatchState(matchId: string, state: any): Promise<void> {
    await this.set(`match:${matchId}:state`, state, 3600); // 1 hour TTL
  }

  /**
   * Get match state
   */
  async getMatchState(matchId: string): Promise<any | null> {
    return this.get(`match:${matchId}:state`);
  }

  // ============================================
  // Lifecycle
  // ============================================

  async onModuleDestroy(): Promise<void> {
    try {
      await this.publisher.quit();
      await this.subscriber.quit();
      this.logger.log('Redis connections closed');
    } catch (err) {
      this.logger.error(`Error closing Redis connections: ${err}`);
    }
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }
}
