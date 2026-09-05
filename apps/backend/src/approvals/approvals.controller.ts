import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApprovalsService } from './approvals.service';
import { ActionApprovalDto, ApprovalQueueQueryDto } from './dto/approval.dto';

@ApiTags('Approval Governance & Multi-Tier Matrix (Screens 5 & 6, B4)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get(['', 'queue'])
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Get pending approvals queue routed by role stage' })
  @ApiResponse({ status: 200, description: 'Approval queue items with line details' })
  async getQueue(
    @CurrentUser() user: any,
    @Query() query: ApprovalQueueQueryDto,
  ) {
    return this.approvalsService.getQueue(query, {
      id: user.id,
      role: user.role as Role,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE, Role.SALES_REP)
  @ApiOperation({ summary: 'Get approval request details and full audit log' })
  @ApiResponse({ status: 200, description: 'Approval request details' })
  async getById(@Param('id') id: string) {
    return this.approvalsService.getApprovalById(id);
  }

  @Post(':id/action')
  @Roles(Role.ADMIN, Role.SALES_MANAGER, Role.FINANCE)
  @ApiOperation({ summary: 'Action an approval request (Approve, Return, or Reject)' })
  @ApiResponse({ status: 200, description: 'Action result and updated request' })
  async actionApproval(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ActionApprovalDto,
  ) {
    return this.approvalsService.actionApproval(
      id,
      dto,
      {
        id: user.id,
        fullName: user.fullName || user.email,
        role: user.role as Role,
      },
    );
  }
}
