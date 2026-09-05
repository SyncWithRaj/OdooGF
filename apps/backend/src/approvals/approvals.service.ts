import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  ApprovalStage,
  QuotationStatus,
  RiskLevel,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActionApprovalDto, ApprovalQueueQueryDto } from './dto/approval.dto';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------------------
  // B4: APPROVAL QUEUE (Screens 5 & 6)
  // ----------------------------------------------------------------------------
  async getQueue(
    query: ApprovalQueueQueryDto,
    currentUser: { id: string; role: Role },
  ) {
    const where: any = {};

    // By default, show active/uncompleted approval requests
    if (query.isCompleted !== undefined) {
      where.isCompleted = query.isCompleted;
    } else {
      where.isCompleted = false;
    }

    if (query.riskLevel) {
      where.blendedRiskLevel = query.riskLevel;
    }

    // Role-based routing filter
    if (query.stage) {
      where.currentStage = query.stage;
    } else {
      if (currentUser.role === Role.SALES_MANAGER) {
        where.currentStage = ApprovalStage.SALES_MANAGER;
      } else if (currentUser.role === Role.FINANCE) {
        where.currentStage = ApprovalStage.FINANCE;
      }
      // ADMIN sees all stages if not filtered
    }

    return this.prisma.approvalRequest.findMany({
      where,
      include: {
        quotation: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                companyName: true,
                tier: true,
              },
            },
            salesRep: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            lines: {
              include: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    category: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        auditLogs: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApprovalById(id: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        quotation: {
          include: {
            customer: true,
            salesRep: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
            lines: {
              include: {
                product: true,
                variant: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        auditLogs: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with ID '${id}' not found`);
    }

    return request;
  }

  // ----------------------------------------------------------------------------
  // B4: ACTION APPROVAL (Approve / Return / Reject with Stage Progression)
  // ----------------------------------------------------------------------------
  async actionApproval(
    id: string,
    dto: ActionApprovalDto,
    currentUser: { id: string; fullName: string; role: Role },
  ) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { quotation: true },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with ID '${id}' not found`);
    }

    if (request.isCompleted) {
      throw new BadRequestException('This approval request has already been finalized');
    }

    // RBAC Stage Guards
    if (request.currentStage === ApprovalStage.SALES_MANAGER) {
      if (
        currentUser.role !== Role.SALES_MANAGER &&
        currentUser.role !== Role.ADMIN
      ) {
        throw new ForbiddenException(
          'Only a Sales Manager or Admin can approve this stage',
        );
      }
    } else if (request.currentStage === ApprovalStage.FINANCE) {
      if (currentUser.role !== Role.FINANCE && currentUser.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Only Finance Controller or Admin can approve this stage',
        );
      }
    }

    if (dto.action === ApprovalAction.APPROVED) {
      // Check if this requires multi-tier escalation to Finance
      if (
        request.currentStage === ApprovalStage.SALES_MANAGER &&
        request.blendedRiskLevel === RiskLevel.HIGH
      ) {
        // Advance to Finance stage
        const updated = await this.prisma.approvalRequest.update({
          where: { id },
          data: {
            currentStage: ApprovalStage.FINANCE,
            isCompleted: false,
          },
        });

        await this.prisma.approvalAuditLog.create({
          data: {
            approvalRequestId: id,
            userId: currentUser.id,
            action: ApprovalAction.APPROVED,
            note:
              dto.note ||
              `Approved by Sales Manager (${currentUser.fullName}). Escalated to Finance Controller for Tier-2 sign-off.`,
          },
        });

        return {
          success: true,
          status: 'ESCALATED_TO_FINANCE',
          message:
            'Stage 1 approved. High-risk quotation advanced to Finance Controller queue.',
          approvalRequest: await this.getApprovalById(id),
        };
      } else {
        // Final Approval!
        await this.prisma.approvalRequest.update({
          where: { id },
          data: {
            currentStage: ApprovalStage.APPROVED,
            isCompleted: true,
          },
        });

        await this.prisma.quotation.update({
          where: { id: request.quotationId },
          data: {
            status: QuotationStatus.SENT_TO_CUSTOMER,
          },
        });

        await this.prisma.approvalAuditLog.create({
          data: {
            approvalRequestId: id,
            userId: currentUser.id,
            action: ApprovalAction.APPROVED,
            note:
              dto.note ||
              `Final sign-off granted by ${currentUser.fullName} (${currentUser.role}). Quotation released for customer presentation.`,
          },
        });

        return {
          success: true,
          status: 'FULLY_APPROVED',
          message:
            'Quotation has been fully approved and marked ready for customer.',
          approvalRequest: await this.getApprovalById(id),
        };
      }
    } else if (dto.action === ApprovalAction.RETURNED_FOR_REVISION) {
      await this.prisma.approvalRequest.update({
        where: { id },
        data: {
          currentStage: ApprovalStage.RETURNED,
          isCompleted: true,
        },
      });

      await this.prisma.quotation.update({
        where: { id: request.quotationId },
        data: {
          status: QuotationStatus.DRAFT,
        },
      });

      await this.prisma.approvalAuditLog.create({
        data: {
          approvalRequestId: id,
          userId: currentUser.id,
          action: ApprovalAction.RETURNED_FOR_REVISION,
          note:
            dto.note ||
            `Returned to Sales Rep by ${currentUser.fullName} for line discount revision.`,
        },
      });

      return {
        success: true,
        status: 'RETURNED_TO_REP',
        message: 'Quotation returned to Draft for sales rep discount revision.',
        approvalRequest: await this.getApprovalById(id),
      };
    } else if (dto.action === ApprovalAction.REJECTED) {
      await this.prisma.approvalRequest.update({
        where: { id },
        data: {
          currentStage: ApprovalStage.REJECTED,
          isCompleted: true,
        },
      });

      await this.prisma.quotation.update({
        where: { id: request.quotationId },
        data: {
          status: QuotationStatus.CANCELLED,
        },
      });

      await this.prisma.approvalAuditLog.create({
        data: {
          approvalRequestId: id,
          userId: currentUser.id,
          action: ApprovalAction.REJECTED,
          note:
            dto.note ||
            `Quotation rejected by ${currentUser.fullName} (${currentUser.role}).`,
        },
      });

      return {
        success: true,
        status: 'REJECTED',
        message: 'Quotation has been formally rejected and cancelled.',
        approvalRequest: await this.getApprovalById(id),
      };
    } else {
      throw new BadRequestException(`Unsupported approval action '${dto.action}'`);
    }
  }
}
