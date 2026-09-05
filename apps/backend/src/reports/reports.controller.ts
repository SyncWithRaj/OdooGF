import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';

@ApiTags('Reports & Dashboards')
@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('admin')
  @ApiOperation({
    summary: 'Executive Admin Dashboard Report (Overall revenue, sales by team/rep, product performance, discount & approval analytics)',
  })
  @ApiResponse({ status: 200, description: 'Admin report data returned successfully' })
  async getAdminReport(@Query() query: ReportsQueryDto) {
    return this.reportsService.getAdminReport(query);
  }

  @Get('manager')
  @ApiOperation({
    summary: 'Sales Manager Dashboard Report (Team revenue, salesperson leaderboard, quotes pipeline, discount patterns, and deal health)',
  })
  @ApiResponse({ status: 200, description: 'Manager report data returned successfully' })
  async getManagerReport(@Query() query: ReportsQueryDto) {
    return this.reportsService.getManagerReport(query);
  }

  @Get('rep')
  @ApiOperation({
    summary: 'Sales Rep Dashboard Report (Personal performance, quotes/orders, conversion, approval tracking)',
  })
  @ApiResponse({ status: 200, description: 'Sales rep report data returned successfully' })
  async getRepReport(@Query() query: ReportsQueryDto) {
    return this.reportsService.getRepReport(query, query.repId);
  }

  @Get('deal-health')
  @ApiOperation({
    summary: 'Deal Health & Stalled Deals Report (Reviewed throughout the sales cycle by Sales Managers)',
  })
  @ApiResponse({ status: 200, description: 'Deal health intelligence data returned successfully' })
  async getDealHealthMetrics(@Query() query: ReportsQueryDto) {
    return this.reportsService.getDealHealthMetrics(query);
  }
}
