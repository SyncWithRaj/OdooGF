import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      status: 'ok',
      db: dbStatus,
      services: {
        backend: 'connected',
        database: dbStatus,
      },
      details: dbDetails,
      timestamp: new Date().toISOString(),
    };
  }
}
