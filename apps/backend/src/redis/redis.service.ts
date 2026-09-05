import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(`Redis connection failed after ${times} retries. Rate limiting will fail-open.`);
            return null;
          }
          return Math.min(times * 200, 1000);
        },
        lazyConnect: false,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Connected to Redis server successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis client warning: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch (err: any) {
      this.logger.error(`Failed to initialize Redis client: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  get isReady(): boolean {
    return this.isConnected && this.client !== null && this.client.status === 'ready';
  }

  async ping(): Promise<string> {
    if (!this.client) return 'DISCONNECTED';
    return this.client.ping();
  }

  async increment(key: string, ttlSeconds: number): Promise<{ current: number; ttl: number }> {
    if (!this.client || !this.isReady) {
      return { current: 1, ttl: ttlSeconds };
    }

    try {
      // Pipeline for atomic INCR and TTL
      const pipeline = this.client.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const results = await pipeline.exec();

      if (!results || results.length < 2) {
        return { current: 1, ttl: ttlSeconds };
      }

      const current = (results[0][1] as number) || 1;
      let ttl = (results[1][1] as number) || -1;

      // If key had no TTL (new key or key without expiry), set expiration
      if (ttl === -1 || current === 1) {
        await this.client.expire(key, ttlSeconds);
        ttl = ttlSeconds;
      }

      return { current, ttl: ttl > 0 ? ttl : ttlSeconds };
    } catch (err: any) {
      this.logger.warn(`Redis increment error on key ${key}: ${err.message}`);
      return { current: 1, ttl: ttlSeconds };
    }
  }
}
