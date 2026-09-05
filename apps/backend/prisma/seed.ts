import { PrismaClient, Role, CustomerTier, ProductCategory, RecurringInterval, RiskLevel, ApprovalAction, ApprovalStage, QuotationStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DealFlow360 database seed...');

  // 1. Clean existing records in reverse dependency order
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionProrationLog.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlanTemplate.deleteMany();
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

  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@dealflow.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Vikram Mehta (Procurement Lead)',
      role: Role.CUSTOMER,
      teamName: 'External Client',
      isEmailVerified: true,
    },
  });

  console.log('✅ Users seeded (Admin, Rep, Manager, Finance, Customer).');

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

  console.log('✅ AI Upsell / Cross-Sell pairing rules seeded.');

  // 9. Seed Subscription Plan Templates (A5)
  await prisma.subscriptionPlanTemplate.createMany({
    data: [
      {
        code: 'MONTHLY_STANDARD',
        name: 'Monthly Flexible Plan',
        description: 'Billed monthly. Standard proration calculated by calendar days.',
        interval: RecurringInterval.MONTHLY,
        discountPercent: 0.0,
        prorationPolicy: 'CALENDAR_DAYS',
        cancellationPolicy: 'PRORATED_REFUND',
        isActive: true,
      },
      {
        code: 'QUARTERLY_PRO',
        name: 'Quarterly Growth Plan',
        description: 'Billed quarterly with 5% discount incentive.',
        interval: RecurringInterval.QUARTERLY,
        discountPercent: 5.0,
        prorationPolicy: 'CALENDAR_DAYS',
        cancellationPolicy: 'PRORATED_REFUND',
        isActive: true,
      },
      {
        code: 'ANNUAL_SAVER',
        name: 'Annual Enterprise Plan',
        description: 'Billed annually with 15% discount incentive.',
        interval: RecurringInterval.YEARLY,
        discountPercent: 15.0,
        prorationPolicy: 'FIXED_30_DAYS',
        cancellationPolicy: 'NO_REFUND',
        isActive: true,
      },
    ],
  });

  console.log('✅ Subscription Plan Templates seeded.');

  // 10. Seed Realistic Quotations across Stages (B1, B2, B3)
  // Quote 1: DRAFT (LOW Risk) for Acme Gold
  const q1 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1001',
      customerId: acme.id,
      salesRepId: rep.id,
      status: QuotationStatus.DRAFT,
      blendedRiskScore: RiskLevel.LOW,
      subtotalAmount: 6900.0,
      totalDiscountAmount: 708.0,
      orderDiscountPercent: 0.0,
      totalAmount: 6192.0,
      totalCost: 4450.0,
      totalMarginPercent: 28.13,
      portalToken: 'portal-acme-q1001-demo-token',
    },
  });

  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: q1.id,
        productId: laptop.id,
        category: ProductCategory.HARDWARE,
        quantity: 5,
        unitCost: 800.0,
        unitPrice: 1200.0,
        discountPercent: 10.0,
        allowedLimitPercent: 15.0,
        isOverLimit: false,
        overLimitPoints: 0.0,
        lineTotal: 5400.0,
        lineCostTotal: 4000.0,
        lineMarginPercent: 25.93,
      },
      {
        quotationId: q1.id,
        productId: docking.id,
        category: ProductCategory.HARDWARE,
        quantity: 5,
        unitCost: 90.0,
        unitPrice: 180.0,
        discountPercent: 12.0,
        allowedLimitPercent: 15.0,
        isOverLimit: false,
        overLimitPoints: 0.0,
        lineTotal: 792.0,
        lineCostTotal: 450.0,
        lineMarginPercent: 43.18,
      },
    ],
  });

  // Quote 2: PENDING_APPROVAL (MEDIUM Risk, +4pt deviation) for Beta Silver
  const q2 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1002',
      customerId: beta.id,
      salesRepId: rep.id,
      status: QuotationStatus.PENDING_APPROVAL,
      blendedRiskScore: RiskLevel.MEDIUM,
      subtotalAmount: 12450.0,
      totalDiscountAmount: 1716.0,
      orderDiscountPercent: 0.0,
      totalAmount: 10734.0,
      totalCost: 8200.0,
      totalMarginPercent: 23.61,
      portalToken: 'portal-beta-q1002-demo-token',
    },
  });

  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: q2.id,
        productId: laptop.id,
        category: ProductCategory.HARDWARE,
        quantity: 10,
        unitCost: 800.0,
        unitPrice: 1200.0,
        discountPercent: 14.0, // Silver tier limit is 10% -> 4% over limit!
        allowedLimitPercent: 10.0,
        isOverLimit: true,
        overLimitPoints: 4.0,
        lineTotal: 10320.0,
        lineCostTotal: 8000.0,
        lineMarginPercent: 22.48,
      },
      {
        quotationId: q2.id,
        productId: mouse.id,
        category: ProductCategory.HARDWARE,
        quantity: 10,
        unitCost: 20.0,
        unitPrice: 45.0,
        discountPercent: 8.0,
        allowedLimitPercent: 10.0,
        isOverLimit: false,
        overLimitPoints: 0.0,
        lineTotal: 414.0,
        lineCostTotal: 200.0,
        lineMarginPercent: 51.69,
      },
    ],
  });

  const appReqQ2 = await prisma.approvalRequest.create({
    data: {
      quotationId: q2.id,
      currentStage: ApprovalStage.SALES_MANAGER,
      blendedRiskLevel: RiskLevel.MEDIUM,
      worstLineDeviation: 4.0,
      flagReasonSummary: 'Sales Manager Approval Required: Max line discount deviation +4.0pt on Hardware',
      isCompleted: false,
    },
  });

  await prisma.approvalAuditLog.create({
    data: {
      approvalRequestId: appReqQ2.id,
      userId: rep.id,
      action: ApprovalAction.SUBMITTED,
      note: 'Competitive deal against Dell. Requesting 14% discount exception on laptops.',
    },
  });

  // Quote 3: PENDING_APPROVAL (HIGH Risk, +9pt deviation) for Delta Bronze
  const q3 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1003',
      customerId: delta.id,
      salesRepId: rep.id,
      status: QuotationStatus.PENDING_APPROVAL,
      blendedRiskScore: RiskLevel.HIGH,
      subtotalAmount: 28500.0,
      totalDiscountAmount: 3810.0,
      orderDiscountPercent: 0.0,
      totalAmount: 24690.0,
      totalCost: 19500.0,
      totalMarginPercent: 21.02,
      portalToken: 'portal-delta-q1003-demo-token',
    },
  });

  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: q3.id,
        productId: laptop.id,
        category: ProductCategory.HARDWARE,
        quantity: 20,
        unitCost: 800.0,
        unitPrice: 1200.0,
        discountPercent: 14.0, // Bronze tier limit is 5% -> 9% over limit!
        allowedLimitPercent: 5.0,
        isOverLimit: true,
        overLimitPoints: 9.0,
        lineTotal: 20640.0,
        lineCostTotal: 16000.0,
        lineMarginPercent: 22.48,
      },
      {
        quotationId: q3.id,
        productId: setupService.id,
        category: ProductCategory.SERVICES,
        quantity: 10,
        unitCost: 350.0,
        unitPrice: 450.0,
        discountPercent: 10.0, // Bronze limit 5% -> 5% over limit!
        allowedLimitPercent: 5.0,
        isOverLimit: true,
        overLimitPoints: 5.0,
        lineTotal: 4050.0,
        lineCostTotal: 3500.0,
        lineMarginPercent: 13.58,
      },
    ],
  });

  const appReqQ3 = await prisma.approvalRequest.create({
    data: {
      quotationId: q3.id,
      currentStage: ApprovalStage.SALES_MANAGER,
      blendedRiskLevel: RiskLevel.HIGH,
      worstLineDeviation: 9.0,
      flagReasonSummary: 'Two-Tier Approval Required (Sales Manager -> Finance): Max line discount deviation +9.0pt',
      isCompleted: false,
    },
  });

  await prisma.approvalAuditLog.create({
    data: {
      approvalRequestId: appReqQ3.id,
      userId: rep.id,
      action: ApprovalAction.SUBMITTED,
      note: 'Large enterprise pilot. Significant volume discount requested by customer.',
    },
  });

  // Quote 4: UNDER_NEGOTIATION (Sent to Customer, counter proposal received)
  const q4 = await prisma.quotation.create({
    data: {
      quoteNumber: 'Q-1004',
      customerId: acme.id,
      salesRepId: rep.id,
      status: QuotationStatus.UNDER_NEGOTIATION,
      blendedRiskScore: RiskLevel.LOW,
      subtotalAmount: 1104.0,
      totalDiscountAmount: 88.32,
      orderDiscountPercent: 0.0,
      totalAmount: 1015.68,
      totalCost: 600.0,
      totalMarginPercent: 40.93,
      portalToken: 'portal-acme-q1004-negotiate-token',
      counterDiscountProposed: 12.0,
    },
  });

  await prisma.quotationLine.createMany({
    data: [
      {
        quotationId: q4.id,
        productId: carePlan.id,
        category: ProductCategory.SUBSCRIPTION,
        quantity: 12,
        unitCost: 15.0,
        unitPrice: 46.0,
        discountPercent: 8.0,
        allowedLimitPercent: 15.0,
        isOverLimit: false,
        overLimitPoints: 0.0,
        lineTotal: 507.84,
        lineCostTotal: 180.0,
        lineMarginPercent: 64.55,
      },
      {
        quotationId: q4.id,
        productId: supportSla.id,
        category: ProductCategory.SUBSCRIPTION,
        quantity: 2,
        unitCost: 120.0,
        unitPrice: 300.0,
        discountPercent: 8.0,
        allowedLimitPercent: 15.0,
        isOverLimit: false,
        overLimitPoints: 0.0,
        lineTotal: 552.0,
        lineCostTotal: 240.0,
        lineMarginPercent: 56.52,
      },
    ],
  });

  console.log('✅ Realistic quotations (Q-1001..Q-1004) and approval requests seeded.');

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
