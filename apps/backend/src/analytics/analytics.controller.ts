import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { NudgeRepDto, ReportFilterDto } from './dto/analytics.dto';

@ApiTags('Intelligence, Deal Health & Reports (Screens 2, 14, 15)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Get KPI metrics for sales operations dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard KPI metrics' })
  async getDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getDashboardMetrics(
      user.id,
      user.role as Role,
    );
  }

  @Get('deal-health')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'List deal health alerts, stalled deals, and discount anomalies' })
  @ApiResponse({ status: 200, description: 'Deal health alerts and anomalies' })
  async getDealHealth() {
    return this.analyticsService.getDealHealthAlerts();
  }

  @Post('nudge')
  @Roles(Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Nudge sales representative regarding an inactive or stalled quote' })
  @ApiResponse({ status: 200, description: 'Nudge alert delivered' })
  async nudgeRep(
    @CurrentUser() user: any,
    @Body() dto: NudgeRepDto,
  ) {
    return this.analyticsService.nudgeRep(dto, {
      fullName: user.fullName || user.email,
      role: user.role as Role,
    });
  }

  @Get('reports')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Aggregate analytics reports across categories, customer tiers, and period filters' })
  @ApiResponse({ status: 200, description: 'Executive report aggregations' })
  async getReports(@Query() filter: ReportFilterDto) {
    return this.analyticsService.getReports(filter);
  }

  @Get(['export/csv', 'export/xls'])
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Export full sales pipeline report as CSV/XLS spreadsheet (Screen 15 / A7)' })
  @ApiResponse({ status: 200, description: 'Downloadable CSV/XLS report' })
  async exportCsv(@Res() res: Response) {
    const csvData = await this.analyticsService.exportPipelineCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="dealflow360_pipeline_export_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvData);
  }

  @Get('export/pdf')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Export executive pipeline report formatted for print/PDF (Screen 15 / A7)' })
  @ApiResponse({ status: 200, description: 'Downloadable PDF/Printable report' })
  async exportPdf(@Res() res: Response) {
    const reportHtml = await this.analyticsService.exportPipelineHtmlReport();
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(reportHtml);
  }
}
