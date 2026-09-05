import { Injectable, Logger } from '@nestjs/common';
import { HealthIssueType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * DealHealthStubService
 * ---------------------
 * Dummy / placeholder analysis service for deal health scoring and risk alerts.
 * Implemented as a modular stub so teammate can plug in the real ML/analytics
 * service without breaking quotation workflows.
 */
@Injectable()
export class DealHealthStubService {
  private readonly logger = new Logger(DealHealthStubService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dummy deal health evaluation based on margin thresholds and activity recency
   */
  async evaluateAndSyncHealth(quotationId: string, marginPercent: number, isStalled: boolean = false) {
    this.logger.debug(`[DealHealthStub] Evaluating quotation ${quotationId} (Margin: ${marginPercent}%)`);

    if (marginPercent < 25.0) {
      // Flag a discount anomaly alert if margin drops dangerously low
      return this.prisma.dealHealthAlert.create({
        data: {
          quotationId,
          issueType: HealthIssueType.DISCOUNT_ANOMALY,
          description: `Margin critically low at ${marginPercent.toFixed(1)}%. Review high discount concessions.`,
          isEscalated: marginPercent < 15.0,
          isResolved: false,
        },
      });
    }

    if (isStalled) {
      return this.prisma.dealHealthAlert.create({
        data: {
          quotationId,
          issueType: HealthIssueType.STALLED_DEAL,
          description: 'Deal has had no customer or sales rep interaction for over 7 days.',
          isEscalated: false,
          isResolved: false,
        },
      });
    }

    return null;
  }
}
