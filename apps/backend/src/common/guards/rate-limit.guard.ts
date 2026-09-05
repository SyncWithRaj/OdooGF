import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
  SKIP_RATE_LIMIT_KEY,
} from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  // Default global limits: 100 requests per 60 seconds
  private readonly defaultLimit = 100;
  private readonly defaultTtl = 60;

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSkipped = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isSkipped) {
      return true;
    }

    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const limit = options?.limit ?? this.defaultLimit;
    const ttl = options?.ttl ?? this.defaultTtl;

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Clean IP extraction
    const rawIp =
      request.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      '127.0.0.1';
    const ip = rawIp.replace(/^.*:/, '') || '127.0.0.1';

    const userId = request.user?.id || request.user?.sub;
    const clientIdentifier = userId ? `user:${userId}` : `ip:${ip}`;

    // Scope key by HTTP method and route path
    const routePath = request.route?.path || request.path || '';
    const rateLimitKey = `rl:${clientIdentifier}:${request.method}:${routePath}`;

    try {
      const { current, ttl: remainingTtl } = await this.redisService.increment(rateLimitKey, ttl);

      const remaining = Math.max(0, limit - current);
      const resetTime = Math.floor(Date.now() / 1000) + remainingTtl;

      // Attach standard rate limit headers to response
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('X-RateLimit-Limit', limit);
        response.setHeader('X-RateLimit-Remaining', remaining);
        response.setHeader('X-RateLimit-Reset', resetTime);
      }

      if (current > limit) {
        if (response && typeof response.setHeader === 'function') {
          response.setHeader('Retry-After', remainingTtl);
        }
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Rate limit exceeded. Maximum ${limit} requests per ${ttl}s allowed. Try again in ${remainingTtl} seconds.`,
            error: 'Too Many Requests',
            retryAfter: remainingTtl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      // Fail-open: allow request if Redis temporarily has issues
      this.logger.warn(`Rate limiter fallback (Redis error): ${(err as Error).message}`);
      return true;
    }
  }
}
