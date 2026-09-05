import {
  PrismaClient,
  Role,
  CustomerTier,
  ProductCategory,
  RecurringInterval,
  RiskLevel,
  QuotationStatus,
  ApprovalStage,
  HealthIssueType,
  ApprovalAction,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DealFlow360 database seed...');

  // 1. Clean existing records in reverse dependency order
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionProrationLog.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.fulfillmentSplitItem.deleteMany();
  await prisma.fulfillmentOrder.deleteMany();
  await prisma.approvalAuditLog.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.quotationComment.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.dealHealthAlert.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.productCoPurchaseRule.deleteMany();
  await prisma.priceListRule.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tierDiscountCeiling.deleteMany();
  await prisma.categoryDiscountCeiling.deleteMany();
  await prisma.approvalChainMatrix.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data.');

  // Default hashed password for demo accounts ("123456")
  const defaultPasswordHash = await argon2.hash('123456');

  // 2. Seed Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@dealflow.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Aniket Dabhi (Admin)',
      role: Role.ADMIN,
      teamName: 'Executive',
      isEmailVerified: true,
    },
  });

  const rep = await prisma.user.create({
    data: {
      email: 'rep@dealflow.com',
      passwordHash: defaultPasswordHash,
      fullName: 'J. Rao (Sales Rep)',
      role: Role.SALES_REP,
      teamName: 'Direct Sales',
      isEmailVerified: true,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah.jenkins@dealflow.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Sarah Jenkins (Sales Rep)',
      role: Role.SALES_REP,
      teamName: 'Direct Sales',
      isEmailVerified: true,
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: 'alex.chen@dealflow.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Alex Chen (Key Accounts)',
      role: Role.SALES_REP,
      teamName: 'Enterprise Key Accounts',
      isEmailVerified: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@dealflow.com',
      passwordHash: defaultPasswordHash,
      fullName: 'M. Shah (Sales Manager)',
      role: Role.SALES_MANAGER,
      teamName: 'Direct Sales',
      isEmailVerified: true,
    },
  });

  const finance = await prisma.user.create({
    data: {
      email: 'finance@dealflow.com',
      passwordHash: defaultPasswordHash,
      fullName: 'R. Iyer (Finance Controller)',
      role: Role.FINANCE,
      teamName: 'Finance & Operations',
      isEmailVerified: true,
    },
  });

  console.log('✅ Users seeded (Admin, Rep, Manager, Finance).');

  // 3. Seed Customers
  const acme = await prisma.customer.create({
    data: {
      name: 'Acme Corp',
      email: 'procurement@acmecorp.com',
      phone: '+1-555-0199',
      companyName: 'Acme Enterprises Inc',
      tier: CustomerTier.GOLD,
      assignedRepId: rep.id,
      historicalAvgDisc: 8.0,
    },
  });

  const beta = await prisma.customer.create({
    data: {
      name: 'Beta Industries',
      email: 'contact@betaindustries.com',
      phone: '+1-555-0144',
      companyName: 'Beta Manufacturing Ltd',
      tier: CustomerTier.SILVER,
      assignedRepId: rep.id,
      historicalAvgDisc: 6.5,
    },
  });

  const delta = await prisma.customer.create({
    data: {
      name: 'Delta LLC',
      email: 'deals@deltallc.com',
      phone: '+1-555-0188',
      companyName: 'Delta Logistics LLC',
      tier: CustomerTier.BRONZE,
      assignedRepId: rep.id,
      historicalAvgDisc: 4.0,
    },
  });

  console.log('✅ Customers seeded (Acme Gold, Beta Silver, Delta Bronze).');

  // 4. Seed Discount Ceilings & Matrices (Screen 18)
  await prisma.tierDiscountCeiling.createMany({
    data: [
      { tier: CustomerTier.BRONZE, maxDiscount: 5.0 },
      { tier: CustomerTier.SILVER, maxDiscount: 10.0 },
      { tier: CustomerTier.GOLD, maxDiscount: 15.0 },
    ],
  });

  await prisma.categoryDiscountCeiling.createMany({
    data: [
      { category: ProductCategory.HARDWARE, maxDiscount: 15.0 },
      { category: ProductCategory.SERVICES, maxDiscount: 10.0 },
      { category: ProductCategory.SUBSCRIPTION, maxDiscount: 15.0 },
    ],
  });

  await prisma.approvalChainMatrix.createMany({
    data: [
      {
        riskLevel: RiskLevel.LOW,
        description: 'Within tier and category limits',
        requiresManagerApproval: false,
        requiresFinanceApproval: false,
      },
      {
        riskLevel: RiskLevel.MEDIUM,
        description: 'Over limit, blended risk medium',
        requiresManagerApproval: true,
        requiresFinanceApproval: false,
      },
      {
        riskLevel: RiskLevel.HIGH,
        description: 'Over limit, blended risk high',
        requiresManagerApproval: true,
        requiresFinanceApproval: true,
      },
    ],
  });

  console.log('✅ Discount ceilings and approval chain seeded.');

  // 5. Seed Warehouses (Screen 7 & 8)
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Main Warehouse',
      location: 'Central Depot - Bay 4',
      shippingCostWeight: 1.0,
    },
  });

  const eastDepot = await prisma.warehouse.create({
    data: {
      name: 'East Depot',
      location: 'East Coast Logistics Hub',
      shippingCostWeight: 1.2,
    },
  });

  console.log('✅ Warehouses seeded (Main Warehouse, East Depot).');

  // 6. Seed Products (Hardware, Services, Subscriptions)
  const laptop = await prisma.product.create({
    data: {
      sku: 'HW-LAP-PRO14',
      name: 'Laptop Pro 14',
      description: 'High-performance 14-inch developer workstation laptop',
      category: ProductCategory.HARDWARE,
      unit: 'Each',
      baseCost: 800.0,
      basePrice: 1200.0,
      taxPercent: 15.0,
      isSubscription: false,
      isPromoted: false,
      minMarginThreshold: 20.0,
    },
  });

  const docking = await prisma.product.create({
    data: {
      sku: 'HW-DOC-STN',
      name: 'Docking Station',
      description: 'Universal Thunderbolt 4 Quad-Display Dock',
      category: ProductCategory.HARDWARE,
      unit: 'Each',
      baseCost: 90.0,
      basePrice: 180.0,
      taxPercent: 15.0,
      isSubscription: false,
      isPromoted: true,
      minMarginThreshold: 25.0,
    },
  });

  const mouse = await prisma.product.create({
    data: {
      sku: 'HW-MOU-WRL',
      name: 'Wireless Ergonomic Mouse',
      description: 'Rechargeable wireless ergonomic optical mouse',
      category: ProductCategory.HARDWARE,
      unit: 'Each',
      baseCost: 20.0,
      basePrice: 45.0,
      taxPercent: 15.0,
      isSubscription: false,
      isPromoted: true,
      minMarginThreshold: 30.0,
    },
  });

  const setupService = await prisma.product.create({
    data: {
      sku: 'SRV-ONSITE-SET',
      name: 'Onsite Setup Service',
      description: 'Professional hardware installation, imaging and network setup',
      category: ProductCategory.SERVICES,
      unit: 'Each',
      baseCost: 350.0,
      basePrice: 450.0,
      taxPercent: 10.0,
      isSubscription: false,
      isPromoted: false,
      minMarginThreshold: 15.0,
    },
  });

  const carePlan = await prisma.product.create({
    data: {
      sku: 'SUB-CARE-2YR',
      name: 'Care Plan 2yr',
      description: 'Comprehensive 2-year hardware warranty with next business day replacement',
      category: ProductCategory.SUBSCRIPTION,
      unit: 'Month',
      baseCost: 15.0,
      basePrice: 46.0,
      taxPercent: 0.0,
      isSubscription: true,
      recurringInterval: RecurringInterval.MONTHLY,
      isPromoted: true,
      minMarginThreshold: 40.0,
    },
  });

  const supportSla = await prisma.product.create({
    data: {
      sku: 'SUB-SLA-QTR',
      name: 'Support SLA 24/7',
      description: 'Dedicated 24/7 mission critical support desk with 1-hour SLA',
      category: ProductCategory.SUBSCRIPTION,
      unit: 'Quarter',
      baseCost: 120.0,
      basePrice: 300.0,
      taxPercent: 0.0,
      isSubscription: true,
      recurringInterval: RecurringInterval.QUARTERLY,
      isPromoted: false,
      minMarginThreshold: 35.0,
    },
  });

  console.log('✅ Products seeded across Hardware, Services, Subscriptions.');

  // 7. Seed Warehouse Stock Levels (Main vs East)
  await prisma.warehouseStock.createMany({
    data: [
      // Laptop: 40 in Main, 10 in East (Total 50)
      { warehouseId: mainWarehouse.id, productId: laptop.id, inStock: 40, reserved: 18, available: 22 },
      { warehouseId: eastDepot.id, productId: laptop.id, inStock: 10, reserved: 6, available: 4 },
      // Docking Station: 65 in Main
      { warehouseId: mainWarehouse.id, productId: docking.id, inStock: 65, reserved: 12, available: 53 },
      // Mouse: 100 in Main, 50 in East
      { warehouseId: mainWarehouse.id, productId: mouse.id, inStock: 100, reserved: 0, available: 100 },
      { warehouseId: eastDepot.id, productId: mouse.id, inStock: 50, reserved: 0, available: 50 },
    ],
  });

  console.log('✅ Warehouse stocks seeded.');

  // 8. Seed AI Upsell / Co-Purchase Rules (Screen 4)
  await prisma.productCoPurchaseRule.createMany({
    data: [
      {
        baseProductId: laptop.id,
        recommendedProductId: mouse.id,
        coPurchaseScore: 0.92,
        marginDeltaBoost: 18.0,
        promotionTag: 'Popular Accessory',
      },
      {
        baseProductId: laptop.id,
        recommendedProductId: docking.id,
        coPurchaseScore: 0.88,
        marginDeltaBoost: 35.0,
        promotionTag: 'Promo: 12% off',
      },
      {
        baseProductId: laptop.id,
        recommendedProductId: carePlan.id,
        coPurchaseScore: 0.79,
        marginDeltaBoost: 46.0,
        promotionTag: 'Recommended Protection',
      },
    ],
  });

  // Seed Customer OmniTech
  const omnitech = await prisma.customer.create({
    data: {
      name: 'OmniTech Solutions',
      email: 'procurement@omnitech.io',
      phone: '+1-555-0177',
      companyName: 'OmniTech Enterprise Systems',
      tier: CustomerTier.GOLD,
      assignedRepId: sarah.id,
      historicalAvgDisc: 9.0,
    },
  });

  // 9. Seed Quotations & CPQ Lines
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Quote 1: Confirmed ($32,775) - J. Rao
  const q1 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1041',
      customerId: acme.id,
      salesRepId: rep.id,
      status: QuotationStatus.CONFIRMED,
      blendedRiskScore: RiskLevel.LOW,
      subtotalAmount: 30000.0,
      orderDiscountPercent: 5.0,
      totalDiscountAmount: 1500.0,
      totalTaxAmount: 4275.0,
      totalAmount: 32775.0,
      totalCost: 19500.0,
      totalMarginPercent: 31.6,
      customerTermsConfirmed: true,
      createdAt: daysAgo(28),
      lastActivityAt: daysAgo(28),
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 20,
            unitCost: 800.0,
            unitPrice: 1200.0,
            discountPercent: 5.0,
            allowedLimitPercent: 15.0,
            lineTotal: 22800.0,
            lineCostTotal: 16000.0,
            lineMarginPercent: 29.8,
          },
          {
            productId: setupService.id,
            category: ProductCategory.SERVICES,
            quantity: 16,
            unitCost: 350.0,
            unitPrice: 450.0,
            discountPercent: 0.0,
            allowedLimitPercent: 10.0,
            lineTotal: 7200.0,
            lineCostTotal: 5600.0,
            lineMarginPercent: 22.2,
          },
        ],
      },
    },
  });

  // Quote 2: Confirmed ($16,343.8) - J. Rao
  const q2 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1042',
      customerId: beta.id,
      salesRepId: rep.id,
      status: QuotationStatus.CONFIRMED,
      blendedRiskScore: RiskLevel.LOW,
      subtotalAmount: 15200.0,
      orderDiscountPercent: 6.5,
      totalDiscountAmount: 988.0,
      totalTaxAmount: 2131.8,
      totalAmount: 16343.8,
      totalCost: 9100.0,
      totalMarginPercent: 36.0,
      customerTermsConfirmed: true,
      createdAt: daysAgo(18),
      lastActivityAt: daysAgo(18),
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 10,
            unitCost: 800.0,
            unitPrice: 1200.0,
            discountPercent: 6.5,
            allowedLimitPercent: 10.0,
            lineTotal: 11220.0,
            lineCostTotal: 8000.0,
            lineMarginPercent: 28.7,
          },
          {
            productId: carePlan.id,
            category: ProductCategory.SUBSCRIPTION,
            quantity: 10,
            unitCost: 15.0,
            unitPrice: 46.0,
            discountPercent: 0.0,
            allowedLimitPercent: 15.0,
            lineTotal: 460.0,
            lineCostTotal: 150.0,
            lineMarginPercent: 67.4,
          },
        ],
      },
    },
  });

  // Quote 3: Pending Approval ($47,196, High Risk) - J. Rao
  const q3 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1043',
      customerId: delta.id,
      salesRepId: rep.id,
      status: QuotationStatus.PENDING_APPROVAL,
      blendedRiskScore: RiskLevel.HIGH,
      subtotalAmount: 48000.0,
      orderDiscountPercent: 14.5,
      totalDiscountAmount: 6960.0,
      totalTaxAmount: 6156.0,
      totalAmount: 47196.0,
      totalCost: 32000.0,
      totalMarginPercent: 22.0,
      createdAt: daysAgo(4),
      lastActivityAt: daysAgo(4),
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 35,
            unitCost: 800.0,
            unitPrice: 1200.0,
            discountPercent: 14.5,
            allowedLimitPercent: 5.0,
            isOverLimit: true,
            overLimitPoints: 9.5,
            lineTotal: 35910.0,
            lineCostTotal: 28000.0,
            lineMarginPercent: 22.0,
          },
        ],
      },
    },
  });

  // Create Approval Request for Q3
  const ar3 = await prisma.approvalRequest.create({
    data: {
      quotationId: q3.id,
      currentStage: ApprovalStage.SALES_MANAGER,
      blendedRiskLevel: RiskLevel.HIGH,
      worstLineDeviation: 9.5,
      flagReasonSummary: 'Hardware discount of 14.5% exceeds Bronze tier ceiling of 5.0% by 9.5 points.',
      isCompleted: false,
    },
  });

  // Quote 4: Confirmed ($22,770) - Sarah Jenkins
  const q4 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1044',
      customerId: acme.id,
      salesRepId: sarah.id,
      status: QuotationStatus.CONFIRMED,
      blendedRiskScore: RiskLevel.LOW,
      subtotalAmount: 21000.0,
      orderDiscountPercent: 5.7,
      totalDiscountAmount: 1200.0,
      totalTaxAmount: 2970.0,
      totalAmount: 22770.0,
      totalCost: 13200.0,
      totalMarginPercent: 33.3,
      customerTermsConfirmed: true,
      createdAt: daysAgo(14),
      lastActivityAt: daysAgo(14),
      lines: {
        create: [
          {
            productId: docking.id,
            category: ProductCategory.HARDWARE,
            quantity: 50,
            unitCost: 90.0,
            unitPrice: 180.0,
            discountPercent: 5.0,
            allowedLimitPercent: 15.0,
            lineTotal: 8550.0,
            lineCostTotal: 4500.0,
            lineMarginPercent: 47.4,
          },
          {
            productId: setupService.id,
            category: ProductCategory.SERVICES,
            quantity: 25,
            unitCost: 350.0,
            unitPrice: 450.0,
            discountPercent: 0.0,
            allowedLimitPercent: 10.0,
            lineTotal: 11250.0,
            lineCostTotal: 8750.0,
            lineMarginPercent: 22.2,
          },
        ],
      },
    },
  });

  // Quote 5: Under Negotiation / Stalled ($40,204) - Sarah Jenkins
  const q5 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1045',
      customerId: omnitech.id,
      salesRepId: sarah.id,
      status: QuotationStatus.UNDER_NEGOTIATION,
      blendedRiskScore: RiskLevel.MEDIUM,
      subtotalAmount: 38000.0,
      orderDiscountPercent: 8.0,
      totalDiscountAmount: 3040.0,
      totalTaxAmount: 5244.0,
      totalAmount: 40204.0,
      totalCost: 24000.0,
      totalMarginPercent: 31.4,
      isStalled: true,
      createdAt: daysAgo(12),
      lastActivityAt: daysAgo(9),
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 25,
            unitCost: 800.0,
            unitPrice: 1200.0,
            discountPercent: 8.0,
            allowedLimitPercent: 15.0,
            lineTotal: 27600.0,
            lineCostTotal: 20000.0,
            lineMarginPercent: 27.5,
          },
        ],
      },
    },
  });

  // Quote 6: Confirmed ($59,800) - Alex Chen (Enterprise)
  const q6 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1046',
      customerId: beta.id,
      salesRepId: alex.id,
      status: QuotationStatus.CONFIRMED,
      blendedRiskScore: RiskLevel.LOW,
      subtotalAmount: 55000.0,
      orderDiscountPercent: 5.4,
      totalDiscountAmount: 3000.0,
      totalTaxAmount: 7800.0,
      totalAmount: 59800.0,
      totalCost: 35000.0,
      totalMarginPercent: 32.7,
      customerTermsConfirmed: true,
      createdAt: daysAgo(8),
      lastActivityAt: daysAgo(8),
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 40,
            unitCost: 800.0,
            unitPrice: 1200.0,
            discountPercent: 5.0,
            allowedLimitPercent: 10.0,
            lineTotal: 45600.0,
            lineCostTotal: 32000.0,
            lineMarginPercent: 29.8,
          },
          {
            productId: supportSla.id,
            category: ProductCategory.SUBSCRIPTION,
            quantity: 4,
            unitCost: 120.0,
            unitPrice: 300.0,
            discountPercent: 0.0,
            allowedLimitPercent: 15.0,
            lineTotal: 1200.0,
            lineCostTotal: 480.0,
            lineMarginPercent: 60.0,
          },
        ],
      },
    },
  });

  // Quote 7: Draft ($25,760) - Alex Chen
  const q7 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1047',
      customerId: delta.id,
      salesRepId: alex.id,
      status: QuotationStatus.DRAFT,
      blendedRiskScore: RiskLevel.MEDIUM,
      subtotalAmount: 24000.0,
      orderDiscountPercent: 6.6,
      totalDiscountAmount: 1600.0,
      totalTaxAmount: 3360.0,
      totalAmount: 25760.0,
      totalCost: 16000.0,
      totalMarginPercent: 28.6,
      createdAt: daysAgo(2),
      lastActivityAt: daysAgo(2),
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 18,
            unitCost: 800.0,
            unitPrice: 1200.0,
            discountPercent: 6.6,
            allowedLimitPercent: 5.0,
            isOverLimit: true,
            overLimitPoints: 1.6,
            lineTotal: 20174.4,
            lineCostTotal: 14400.0,
            lineMarginPercent: 28.6,
          },
        ],
      },
    },
  });

  // Quote 8: Cancelled ($18,975) - J. Rao
  const q8 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1048',
      customerId: omnitech.id,
      salesRepId: rep.id,
      status: QuotationStatus.CANCELLED,
      blendedRiskScore: RiskLevel.LOW,
      subtotalAmount: 17000.0,
      orderDiscountPercent: 3.0,
      totalDiscountAmount: 500.0,
      totalTaxAmount: 2475.0,
      totalAmount: 18975.0,
      totalCost: 11000.0,
      totalMarginPercent: 33.3,
      createdAt: daysAgo(22),
      lastActivityAt: daysAgo(20),
      lines: {
        create: [
          {
            productId: laptop.id,
            category: ProductCategory.HARDWARE,
            quantity: 12,
            unitCost: 800.0,
            unitPrice: 1200.0,
            discountPercent: 3.0,
            allowedLimitPercent: 15.0,
            lineTotal: 13968.0,
            lineCostTotal: 9600.0,
            lineMarginPercent: 31.3,
          },
        ],
      },
    },
  });

  // 10. Seed Deal Health Alerts for Managers (Screen 14)
  await prisma.dealHealthAlert.createMany({
    data: [
      {
        quotationId: q5.id,
        issueType: HealthIssueType.STALLED_DEAL,
        description: 'Customer has not opened portal in 8 days. Proposal stalled in negotiation.',
        isEscalated: true,
        isResolved: false,
        assignedToId: sarah.id,
        flaggedAt: daysAgo(3),
      },
      {
        quotationId: q3.id,
        issueType: HealthIssueType.DISCOUNT_ANOMALY,
        description: 'Rep requested 14.5% discount on Bronze tier (ceiling 5.0%). Excess: 9.5 points.',
        isEscalated: true,
        isResolved: false,
        assignedToId: rep.id,
        flaggedAt: daysAgo(4),
      },
      {
        quotationId: q7.id,
        issueType: HealthIssueType.DELIVERY_SLIPPAGE,
        description: 'Requested delivery in 5 days cannot be fulfilled from East Depot without replenishment.',
        isEscalated: false,
        isResolved: false,
        assignedToId: alex.id,
        flaggedAt: daysAgo(1),
      },
    ],
  });

  // Seed Approval Audit Logs for tracking
  await prisma.approvalAuditLog.createMany({
    data: [
      {
        approvalRequestId: ar3.id,
        userId: manager.id,
        action: ApprovalAction.SUBMITTED,
        note: 'Submitted for managerial review due to 9.5% discount ceiling breach.',
        createdAt: daysAgo(4),
      },
    ],
  });

  console.log('✅ Diverse Quotations, Lines, Approvals, and Deal Health Alerts seeded.');

  console.log('🎉 DealFlow360 seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
