import { PrismaClient, Role, CustomerTier, ProductCategory, RecurringInterval, RiskLevel } from '@prisma/client';
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

  console.log('✅ AI Upsell / Cross-Sell pairing rules seeded.');

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
