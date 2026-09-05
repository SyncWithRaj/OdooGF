const { PrismaClient, QuotationStatus, RiskLevel, ProductCategory, ApprovalStage, ApprovalAction, Role } = require('../apps/backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function pushQuotationsToDb() {
  console.log('🚀 Pushing Quotation data directly to PostgreSQL Database...');

  // Get users
  const rep = await prisma.user.findUnique({ where: { email: 'rep@dealflow.com' } });
  const manager = await prisma.user.findUnique({ where: { email: 'manager@dealflow.com' } });
  const finance = await prisma.user.findUnique({ where: { email: 'finance@dealflow.com' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@dealflow.com' } });

  // Get customers
  const aryan = await prisma.customer.findFirst({ where: { email: 'aryansondharva25@gmail.com' } });
  const beta = await prisma.customer.findFirst({ where: { email: 'contact@betaindustries.com' } });
  const acme = await prisma.customer.findFirst({ where: { email: 'procurement@acmecorp.com' } });
  const delta = await prisma.customer.findFirst({ where: { email: 'deals@deltallc.com' } });

  // Get products
  const laptop = await prisma.product.findUnique({ where: { sku: 'HW-LAP-PRO14' } });
  const dock = await prisma.product.findUnique({ where: { sku: 'HW-DOC-STN' } });
  const mouse = await prisma.product.findUnique({ where: { sku: 'HW-MOU-WRL' } });
  const setup = await prisma.product.findUnique({ where: { sku: 'SRV-ONSITE-SET' } });
  const sla = await prisma.product.findUnique({ where: { sku: 'SUB-SLA-QTR' } });

  // Clean old quotations to avoid duplicate key errors
  await prisma.approvalAuditLog.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.quotationComment.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.fulfillmentSplitItem.deleteMany();
  await prisma.fulfillmentOrder.deleteMany();
  await prisma.quotation.deleteMany();

  console.log('Cleared existing quotation records.');

  // Quote 1: Draft for Aryan Sondharva (Bronze Tier)
  const q1 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1041',
      customerId: aryan.id,
      salesRepId: rep.id,
      status: QuotationStatus.DRAFT,
      blendedRiskScore: RiskLevel.LOW,
      subtotalAmount: 1650.0,
      totalDiscountAmount: 66.0,
      orderDiscountPercent: 4.0,
      totalTaxAmount: 0.0,
      totalAmount: 1584.0,
      totalCost: 1150.0,
      totalMarginPercent: 27.4,
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 1,
            unitPrice: 1200.0,
            unitCost: 800.0,
            discountPercent: 4.0,
            allowedLimitPercent: 5.0,
            isOverLimit: false,
            overLimitPoints: 0.0,
            lineTotal: 1152.0,
            lineCostTotal: 800.0,
            lineMarginPercent: 30.56,
          },
          {
            productId: setup.id,
            category: ProductCategory.SERVICES,
            quantity: 1,
            unitPrice: 450.0,
            unitCost: 350.0,
            discountPercent: 4.0,
            allowedLimitPercent: 5.0,
            isOverLimit: false,
            overLimitPoints: 0.0,
            lineTotal: 432.0,
            lineCostTotal: 350.0,
            lineMarginPercent: 18.98,
          },
        ],
      },
      comments: {
        create: [
          {
            authorRole: rep.role,
            authorName: rep.fullName,
            message: 'Draft workstation proposal prepared for onboarding Aryan Sondharva within Bronze 5% ceiling.',
          },
        ],
      },
    },
  });

  // Quote 2: Pending Sales Manager L1 Approval for Beta Industries (Silver Tier)
  const q2 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1042',
      customerId: beta.id,
      salesRepId: rep.id,
      status: QuotationStatus.PENDING_APPROVAL,
      blendedRiskScore: RiskLevel.MEDIUM,
      subtotalAmount: 2760.0,
      totalDiscountAmount: 331.2,
      orderDiscountPercent: 12.0,
      totalTaxAmount: 0.0,
      totalAmount: 2428.8,
      totalCost: 1780.0,
      totalMarginPercent: 26.71,
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 2,
            unitPrice: 1200.0,
            unitCost: 800.0,
            discountPercent: 12.0,
            allowedLimitPercent: 10.0,
            isOverLimit: true,
            overLimitPoints: 2.0,
            lineTotal: 2112.0,
            lineCostTotal: 1600.0,
            lineMarginPercent: 24.24,
          },
          {
            productId: dock.id,
            category: ProductCategory.HARDWARE,
            quantity: 2,
            unitPrice: 180.0,
            unitCost: 90.0,
            discountPercent: 12.0,
            allowedLimitPercent: 10.0,
            isOverLimit: true,
            overLimitPoints: 2.0,
            lineTotal: 316.8,
            lineCostTotal: 180.0,
            lineMarginPercent: 43.18,
          },
        ],
      },
      approvalRequests: {
        create: {
          currentStage: ApprovalStage.SALES_MANAGER,
          blendedRiskLevel: RiskLevel.MEDIUM,
          worstLineDeviation: 2.0,
          flagReasonSummary: 'Blended Risk MEDIUM: Moderate discount breach (+2pt over Silver 10% limit). Requires Sales Manager approval (L1).',
          isCompleted: false,
          auditLogs: {
            create: [
              {
                userId: rep.id,
                action: ApprovalAction.SUBMITTED,
                note: 'Submitted by Sales Rep for Manager L1 sign-off due to competitive pressure.',
              },
            ],
          },
        },
      },
      comments: {
        create: [
          {
            authorRole: rep.role,
            authorName: rep.fullName,
            message: 'Competitor offered 10% extra, requested 12% to close deal before month end.',
          },
        ],
      },
    },
  });

  // Quote 3: Pending Finance Controller L2 Approval for Acme Corp (Gold Tier)
  const q3 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1043',
      customerId: acme.id,
      salesRepId: rep.id,
      status: QuotationStatus.PENDING_APPROVAL,
      blendedRiskScore: RiskLevel.HIGH,
      subtotalAmount: 9000.0,
      totalDiscountAmount: 1980.0,
      orderDiscountPercent: 22.0,
      totalTaxAmount: 0.0,
      totalAmount: 7020.0,
      totalCost: 5200.0,
      totalMarginPercent: 25.93,
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 5,
            unitPrice: 1200.0,
            unitCost: 800.0,
            discountPercent: 22.0,
            allowedLimitPercent: 15.0,
            isOverLimit: true,
            overLimitPoints: 7.0,
            lineTotal: 4680.0,
            lineCostTotal: 4000.0,
            lineMarginPercent: 14.53,
          },
          {
            productId: sla.id,
            category: ProductCategory.SUBSCRIPTION,
            quantity: 10,
            unitPrice: 300.0,
            unitCost: 120.0,
            discountPercent: 22.0,
            allowedLimitPercent: 15.0,
            isOverLimit: true,
            overLimitPoints: 7.0,
            lineTotal: 2340.0,
            lineCostTotal: 1200.0,
            lineMarginPercent: 48.72,
          },
        ],
      },
      approvalRequests: {
        create: {
          currentStage: ApprovalStage.FINANCE,
          blendedRiskLevel: RiskLevel.HIGH,
          worstLineDeviation: 7.0,
          flagReasonSummary: 'Blended Risk HIGH: Significant discount breach (+7pt over Gold 15% limit) with laptop margin below 15%. Requires Sales Manager + Finance Controller (L2) sign-off.',
          isCompleted: false,
          auditLogs: {
            create: [
              {
                userId: rep.id,
                action: ApprovalAction.SUBMITTED,
                note: 'Strategic volume purchase deal submitted.',
              },
              {
                userId: manager.id,
                action: ApprovalAction.APPROVED,
                note: 'Approved by Sales Manager M. Shah. Escalated to Finance Controller due to tight hardware margins.',
              },
            ],
          },
        },
      },
      comments: {
        create: [
          {
            authorRole: manager.role,
            authorName: manager.fullName,
            message: 'Manager approved. High-volume expansion deal with Acme Corp. Finance sign-off required.',
          },
        ],
      },
    },
  });

  // Quote 4: Confirmed Order for Delta LLC (Bronze Tier)
  const q4 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1040',
      customerId: delta.id,
      salesRepId: rep.id,
      status: QuotationStatus.CONFIRMED,
      blendedRiskScore: RiskLevel.LOW,
      subtotalAmount: 1245.0,
      totalDiscountAmount: 62.25,
      orderDiscountPercent: 5.0,
      totalTaxAmount: 0.0,
      totalAmount: 1182.75,
      totalCost: 820.0,
      totalMarginPercent: 30.67,
      customerTermsConfirmed: true,
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 1,
            unitPrice: 1200.0,
            unitCost: 800.0,
            discountPercent: 5.0,
            allowedLimitPercent: 5.0,
            isOverLimit: false,
            overLimitPoints: 0.0,
            lineTotal: 1140.0,
            lineCostTotal: 800.0,
            lineMarginPercent: 29.82,
          },
          {
            productId: mouse.id,
            category: ProductCategory.HARDWARE,
            quantity: 1,
            unitPrice: 45.0,
            unitCost: 20.0,
            discountPercent: 5.0,
            allowedLimitPercent: 5.0,
            isOverLimit: false,
            overLimitPoints: 0.0,
            lineTotal: 42.75,
            lineCostTotal: 20.0,
            lineMarginPercent: 53.22,
          },
        ],
      },
      comments: {
        create: [
          {
            authorRole: Role.CUSTOMER,
            authorName: 'Delta LLC (Client Signer)',
            message: 'E-signed and confirmed by client. Transferred to fulfillment dispatch queue.',
          },
        ],
      },
    },
  });

  console.log('✅ Successfully pushed 4 Quotations directly into PostgreSQL:');
  console.log(`- ${q1.quoteNumber}: ${q1.status} (${q1.blendedRiskScore} risk) - $${q1.totalAmount}`);
  console.log(`- ${q2.quoteNumber}: ${q2.status} (${q2.blendedRiskScore} risk, Stage: SALES_MANAGER) - $${q2.totalAmount}`);
  console.log(`- ${q3.quoteNumber}: ${q3.status} (${q3.blendedRiskScore} risk, Stage: FINANCE) - $${q3.totalAmount}`);
  console.log(`- ${q4.quoteNumber}: ${q4.status} (${q4.blendedRiskScore} risk, Stage: APPROVED/CONFIRMED) - $${q4.totalAmount}`);
}

pushQuotationsToDb()
  .catch((e) => {
    console.error('❌ Failed to push quotations to DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
