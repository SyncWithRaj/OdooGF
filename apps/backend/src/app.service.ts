import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getHealth() {
    let dbStatus = 'disconnected';
    let dbDetails: any = null;

    try {
      const result = await this.prisma.$queryRaw<
        Array<{ result: number }>
      >`SELECT 1 as result`;
      if (result && result.length > 0) {
        dbStatus = 'connected';
        dbDetails = {
          database: 'PostgreSQL 16',
          status: 'healthy',
          ping: '1',
        };
      }
    } catch (err: any) {
      dbStatus = 'disconnected';
      dbDetails = {
        error: err?.message || 'Database connection error',
      };
    }

    const redisStatus = this.redisService.isReady ? 'connected' : 'disconnected';

    return {
      status: 'ok',
      db: dbStatus,
      services: {
        backend: 'connected',
        database: dbStatus,
        redis: redisStatus,
      },
      details: {
        ...dbDetails,
        redis: {
          status: redisStatus,
          url: 'redis://localhost:6379',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
