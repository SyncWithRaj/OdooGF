import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipRateLimit } from './common/decorators/rate-limit.decorator';

@ApiTags('Health')
@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Check health probe and database connection' })
  @ApiResponse({
    status: 200,
    description: 'System health report with PostgreSQL connectivity details',
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
