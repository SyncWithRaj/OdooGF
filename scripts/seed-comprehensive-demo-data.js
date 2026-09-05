/**
 * DealFlow360 Comprehensive Database Seeder
 * Injects rich, realistic dummy data across all platform aspects:
 * - Internal Users & Personas (Admin, Sales Reps, Managers, Finance, Customers)
 * - Customer Master (Enterprise, Mid-Market, Tier Gold/Silver/Bronze)
 * - Products Catalog & Product Variants (Hardware, Services, Subscriptions)
 * - Warehouses & Physical Inventory Stock Lines across Depots
 * - Quotations across every pipeline stage (Draft, Pending Approval, Sent, Negotiation, Confirmed)
 * - Invoices & Multi-Method Payment Settlements
 * - Recurring Subscriptions & MRR Contracts
 * - Discount Governance Ceilings & Approval Chain Matrix
 */

const { PrismaClient, Role, CustomerTier, ProductCategory, RecurringInterval, RiskLevel, QuotationStatus, ApprovalStage, ApprovalAction, InvoiceStatus } = require('../apps/backend/node_modules/@prisma/client');
const argon2 = require('../apps/backend/node_modules/argon2');

const prisma = new PrismaClient();

async function seed() {
  console.log('🚀 Starting Comprehensive DealFlow360 Database Enrichment...');

  const passwordHash = await argon2.hash('123456');

  // ==========================================
  // 1. Internal Users (Admin, Reps, Managers, Finance, Customers)
  // ==========================================
  console.log('👤 Seeding Users...');
  const usersData = [
    { email: 'admin@dealflow.com', fullName: 'Aniket Dabhi (Admin)', role: Role.ADMIN, teamName: 'Executive' },
    { email: 'manager@dealflow.com', fullName: 'M. Shah (Sales Manager)', role: Role.SALES_MANAGER, teamName: 'Enterprise Sales' },
    { email: 'marcus.manager@dealflow.com', fullName: 'Marcus Vance (Regional Director)', role: Role.SALES_MANAGER, teamName: 'Global Operations' },
    { email: 'rep@dealflow.com', fullName: 'J. Rao (Sales Rep)', role: Role.SALES_REP, teamName: 'Direct Sales' },
    { email: 'sarah.rep@dealflow.com', fullName: 'Sarah Chen (Senior Account Exec)', role: Role.SALES_REP, teamName: 'Strategic Accounts' },
    { email: 'david.rep@dealflow.com', fullName: 'David Kim (Mid-Market Rep)', role: Role.SALES_REP, teamName: 'Commercial Sales' },
    { email: 'finance@dealflow.com', fullName: 'R. Iyer (Finance Controller)', role: Role.FINANCE, teamName: 'Revenue Operations' },
    { email: 'priya.finance@dealflow.com', fullName: 'Priya Patel (Billing Specialist)', role: Role.FINANCE, teamName: 'Financial Control' },
    { email: 'customer@dealflow.com', fullName: 'Valued Customer Partner', role: Role.CUSTOMER, teamName: 'Client Partner' },
    { email: 'aryansondharva25@gmail.com', fullName: 'Aryan Sondharva', role: Role.CUSTOMER, teamName: 'Client Partner' },
  ];

  const userMap = {};
  for (const u of usersData) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role, teamName: u.teamName, passwordHash, isEmailVerified: true },
      create: { email: u.email, fullName: u.fullName, role: u.role, teamName: u.teamName, passwordHash, isEmailVerified: true },
    });
    userMap[u.email] = record;
  }

  // ==========================================
  // 2. Customers Master (Gold, Silver, Bronze)
  // ==========================================
  console.log('🏢 Seeding Customers Master...');
  const customersData = [
    { name: 'Acme Global Corporation', email: 'procurement@acmecorp.com', phone: '+1-555-0199', companyName: 'Acme Global Enterprises Inc', tier: CustomerTier.GOLD, rep: userMap['rep@dealflow.com'].id, avgDisc: 11.5 },
    { name: 'Nexus Cloud Systems', email: 'procurement@nexuscloud.io', phone: '+1-555-0245', companyName: 'Nexus Cloud Infrastructure LLC', tier: CustomerTier.GOLD, rep: userMap['sarah.rep@dealflow.com'].id, avgDisc: 13.0 },
    { name: 'Starlight Financial Group', email: 'ops@starlightfin.com', phone: '+1-555-0812', companyName: 'Starlight Holdings AG', tier: CustomerTier.GOLD, rep: userMap['sarah.rep@dealflow.com'].id, avgDisc: 14.0 },
    { name: 'Velocity Tech Labs', email: 'it-admin@velocitytech.dev', phone: '+1-555-0371', companyName: 'Velocity Software Solutions', tier: CustomerTier.SILVER, rep: userMap['david.rep@dealflow.com'].id, avgDisc: 8.5 },
    { name: 'Horizon Media Partners', email: 'billing@horizonmedia.com', phone: '+1-555-0499', companyName: 'Horizon Creative Network', tier: CustomerTier.SILVER, rep: userMap['rep@dealflow.com'].id, avgDisc: 7.0 },
    { name: 'Apex Logistics Inc', email: 'supply@apexlogistics.com', phone: '+1-555-0622', companyName: 'Apex Supply Chain International', tier: CustomerTier.SILVER, rep: userMap['david.rep@dealflow.com'].id, avgDisc: 9.0 },
    { name: 'Pinnacle Retail Group', email: 'orders@pinnacleretail.com', phone: '+1-555-0734', companyName: 'Pinnacle Stores LLC', tier: CustomerTier.BRONZE, rep: userMap['rep@dealflow.com'].id, avgDisc: 4.5 },
    { name: 'BioHealth Genomics', email: 'lab-ops@biohealthgeno.org', phone: '+1-555-0855', companyName: 'BioHealth Research Institute', tier: CustomerTier.BRONZE, rep: userMap['david.rep@dealflow.com'].id, avgDisc: 5.0 },
    { name: 'Summit Digital Agency', email: 'finance@summitdigital.co', phone: '+1-555-0911', companyName: 'Summit Digital Media LLC', tier: CustomerTier.BRONZE, rep: userMap['sarah.rep@dealflow.com'].id, avgDisc: 3.5 },
  ];

  const customerList = [];
  for (const c of customersData) {
    const record = await prisma.customer.upsert({
      where: { email: c.email },
      update: { name: c.name, phone: c.phone, companyName: c.companyName, tier: c.tier, assignedRepId: c.rep, historicalAvgDisc: c.avgDisc },
      create: { name: c.name, email: c.email, phone: c.phone, companyName: c.companyName, tier: c.tier, assignedRepId: c.rep, historicalAvgDisc: c.avgDisc },
    });
    customerList.push(record);
  }

  // ==========================================
  // 3. Products Catalog & Variants
  // ==========================================
  console.log('📦 Seeding Products & Variants...');
  const productsData = [
    {
      sku: 'HW-LAP-PRO14',
      name: 'Laptop Pro 14 M3',
      description: 'High performance 14-inch developer workstation with unified memory architecture.',
      category: ProductCategory.HARDWARE,
      unit: 'Each',
      baseCost: 850,
      basePrice: 1299,
      taxPercent: 18,
      minMarginThreshold: 20,
      variants: [
        { attribute: 'RAM', value: '16GB Unified', extraPrice: 0, skuSuffix: '-16GB' },
        { attribute: 'RAM', value: '32GB Unified', extraPrice: 200, skuSuffix: '-32GB' },
        { attribute: 'Storage', value: '512GB NVMe SSD', extraPrice: 0, skuSuffix: '-512GB' },
        { attribute: 'Storage', value: '1TB NVMe SSD', extraPrice: 150, skuSuffix: '-1TB' },
        { attribute: 'Color', value: 'Space Gray', extraPrice: 0, skuSuffix: '-GRY' },
      ],
    },
    {
      sku: 'HW-SRV-R750',
      name: 'Dell PowerEdge R750 Server',
      description: '2U dual-socket enterprise rack server designed for database acceleration.',
      category: ProductCategory.HARDWARE,
      unit: 'Server',
      baseCost: 3200,
      basePrice: 4899,
      taxPercent: 18,
      minMarginThreshold: 25,
      variants: [
        { attribute: 'CPU', value: 'Dual Intel Xeon Gold 6330', extraPrice: 600, skuSuffix: '-GOLD' },
        { attribute: 'RAM', value: '128GB DDR4 ECC', extraPrice: 450, skuSuffix: '-128G' },
        { attribute: 'RAID', value: 'PERC H755 SAS 12Gbps', extraPrice: 250, skuSuffix: '-H755' },
      ],
    },
    {
      sku: 'HW-DOC-STN',
      name: 'Thunderbolt 4 Docking Station',
      description: 'Dual 4K display output with 96W Power Delivery and Gigabit Ethernet.',
      category: ProductCategory.HARDWARE,
      unit: 'Each',
      baseCost: 110,
      basePrice: 189,
      taxPercent: 18,
      minMarginThreshold: 20,
      variants: [
        { attribute: 'Power Adapter', value: 'US Plug 120W', extraPrice: 0, skuSuffix: '-US' },
        { attribute: 'Power Adapter', value: 'Universal EU/UK', extraPrice: 15, skuSuffix: '-UNIV' },
      ],
    },
    {
      sku: 'HW-MOU-WRL',
      name: 'Wireless Ergonomic Mouse',
      description: 'Silent click optical wireless mouse with rechargeable USB-C battery.',
      category: ProductCategory.HARDWARE,
      unit: 'Each',
      baseCost: 22,
      basePrice: 45,
      taxPercent: 18,
      minMarginThreshold: 30,
      variants: [
        { attribute: 'Color', value: 'Matte Black', extraPrice: 0, skuSuffix: '-BLK' },
        { attribute: 'Color', value: 'Arctic White', extraPrice: 0, skuSuffix: '-WHT' },
      ],
    },
    {
      sku: 'SRV-ARCH-ONB',
      name: 'Enterprise Architecture Onboarding',
      description: '5-Day dedicated implementation sprint including ERP sync and CPQ config.',
      category: ProductCategory.SERVICES,
      unit: 'Engagement',
      baseCost: 2500,
      basePrice: 5500,
      taxPercent: 18,
      minMarginThreshold: 35,
      variants: [
        { attribute: 'Delivery Mode', value: 'Remote Architecture Sprint', extraPrice: 0, skuSuffix: '-REM' },
        { attribute: 'Delivery Mode', value: 'On-Site Engineering Lead', extraPrice: 1500, skuSuffix: '-ONSITE' },
      ],
    },
    {
      sku: 'SRV-TRAIN-CORP',
      name: 'Corporate User Training Program',
      description: 'Role-specific sales operations and discount compliance masterclass.',
      category: ProductCategory.SERVICES,
      unit: 'Session',
      baseCost: 800,
      basePrice: 1800,
      taxPercent: 18,
      minMarginThreshold: 30,
      variants: [
        { attribute: 'Participants', value: 'Up to 25 Staff', extraPrice: 0, skuSuffix: '-25' },
        { attribute: 'Participants', value: 'Up to 100 Staff Enterprise', extraPrice: 800, skuSuffix: '-100' },
      ],
    },
    {
      sku: 'SUB-CPQ-ENT',
      name: 'DealFlow360 Enterprise Platform License',
      description: 'Unlimited CPQ quoting, real-time blended risk engine, and warehouse dispatch.',
      category: ProductCategory.SUBSCRIPTION,
      unit: 'Month',
      baseCost: 450,
      basePrice: 1250,
      taxPercent: 18,
      isSubscription: true,
      recurringInterval: RecurringInterval.MONTHLY,
      minMarginThreshold: 40,
      variants: [
        { attribute: 'Billing Cycle', value: 'Monthly Recurring', extraPrice: 0, skuSuffix: '-MO' },
        { attribute: 'Billing Cycle', value: 'Annual Committed (15% Net)', extraPrice: 0, skuSuffix: '-YR' },
      ],
    },
    {
      sku: 'SUB-SLA-247',
      name: '24/7 Mission-Critical SLA & Incident Support',
      description: 'Guaranteed 15-minute response time with dedicated technical account manager.',
      category: ProductCategory.SUBSCRIPTION,
      unit: 'Quarter',
      baseCost: 600,
      basePrice: 1500,
      taxPercent: 18,
      isSubscription: true,
      recurringInterval: RecurringInterval.QUARTERLY,
      minMarginThreshold: 35,
      variants: [
        { attribute: 'Severity Level', value: 'Tier 1 Critical Hot Standby', extraPrice: 0, skuSuffix: '-T1' },
      ],
    },
  ];

  const productList = [];
  for (const p of productsData) {
    const { variants, ...prodFields } = p;
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: prodFields,
      create: prodFields,
    });
    productList.push(prod);

    // Seed variants
    if (variants && variants.length > 0) {
      for (const v of variants) {
        const existingVariant = await prisma.productVariant.findFirst({
          where: { productId: prod.id, attribute: v.attribute, value: v.value },
        });
        if (!existingVariant) {
          await prisma.productVariant.create({
            data: {
              productId: prod.id,
              attribute: v.attribute,
              value: v.value,
              extraPrice: v.extraPrice,
              skuSuffix: v.skuSuffix,
            },
          });
        }
      }
    }
  }

  // ==========================================
  // 4. Warehouses & Physical Stock Breakdown
  // ==========================================
  console.log('🏭 Seeding Warehouses & Stock Lines...');
  const warehouseData = [
    { name: 'Main Central Hub - Bay 4', location: 'Columbus, OH - Central Logistics Facility', weight: 1.0 },
    { name: 'East Coast Distribution Center', location: 'Newark, NJ - Port Logistics Park', weight: 1.2 },
    { name: 'West Coast Gateway Depot', location: 'Reno, NV - Pacific Distribution Hub', weight: 1.15 },
    { name: 'Southern Fulfillment Terminal', location: 'Dallas, TX - DFW Industrial Corridor', weight: 1.1 },
  ];

  const warehouseList = [];
  for (const w of warehouseData) {
    const rec = await prisma.warehouse.upsert({
      where: { name: w.name },
      update: { location: w.location, shippingCostWeight: w.weight },
      create: { name: w.name, location: w.location, shippingCostWeight: w.weight },
    });
    warehouseList.push(rec);

    // Seed inventory stock for all hardware items
    for (const prod of productList) {
      if (prod.category === ProductCategory.HARDWARE) {
        const inStock = Math.floor(Math.random() * 80) + 30;
        const reserved = Math.floor(Math.random() * 15) + 2;
        const available = Math.max(0, inStock - reserved);

        await prisma.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: rec.id,
              productId: prod.id,
            },
          },
          update: { inStock, reserved, available },
          create: {
            warehouseId: rec.id,
            productId: prod.id,
            inStock,
            reserved,
            available,
            minStockLevel: 15,
            reorderQuantity: 40,
          },
        });
      }
    }
  }

  // ==========================================
  // 5. Quotations Across Every Pipeline Stage
  // ==========================================
  console.log('📑 Seeding Quotations across all stages & risk scores...');
  const quotationsToCreate = [
    {
      quoteNumber: 'Q-1042',
      customerIdx: 0, // Acme Corp (GOLD)
      repEmail: 'rep@dealflow.com',
      status: QuotationStatus.PENDING_APPROVAL,
      risk: RiskLevel.HIGH,
      notes: 'Acme requested aggressive hardware discounts. 18% concession on Laptop Pro exceeds allowable tier threshold.',
      lines: [
        { productIdx: 0, qty: 15, unitPrice: 1299, unitCost: 850, discount: 18, allowed: 15, isOver: true, overPoints: 3 },
        { productIdx: 2, qty: 15, unitPrice: 189, unitCost: 110, discount: 12, allowed: 15, isOver: false, overPoints: 0 },
        { productIdx: 4, qty: 1, unitPrice: 5500, unitCost: 2500, discount: 8, allowed: 10, isOver: false, overPoints: 0 },
      ],
      currentStage: ApprovalStage.SALES_MANAGER,
    },
    {
      quoteNumber: 'Q-1043',
      customerIdx: 1, // Nexus Cloud (GOLD)
      repEmail: 'sarah.rep@dealflow.com',
      status: QuotationStatus.CONFIRMED,
      risk: RiskLevel.LOW,
      notes: 'Standard renewal and expansion package signed digitally by VP of Infrastructure.',
      lines: [
        { productIdx: 1, qty: 4, unitPrice: 4899, unitCost: 3200, discount: 10, allowed: 15, isOver: false, overPoints: 0 },
        { productIdx: 6, qty: 12, unitPrice: 1250, unitCost: 450, discount: 10, allowed: 15, isOver: false, overPoints: 0 },
      ],
      currentStage: ApprovalStage.APPROVED,
    },
    {
      quoteNumber: 'Q-1044',
      customerIdx: 2, // Starlight Financial (GOLD)
      repEmail: 'sarah.rep@dealflow.com',
      status: QuotationStatus.PENDING_APPROVAL,
      risk: RiskLevel.HIGH,
      notes: 'Margin breach on professional services line. Requires Finance Controller L2 approval.',
      lines: [
        { productIdx: 4, qty: 2, unitPrice: 5500, unitCost: 2500, discount: 22, allowed: 10, isOver: true, overPoints: 12 },
        { productIdx: 1, qty: 2, unitPrice: 4899, unitCost: 3200, discount: 14, allowed: 15, isOver: false, overPoints: 0 },
      ],
      currentStage: ApprovalStage.FINANCE,
    },
    {
      quoteNumber: 'Q-1045',
      customerIdx: 3, // Velocity Tech Labs (SILVER)
      repEmail: 'david.rep@dealflow.com',
      status: QuotationStatus.SENT_TO_CUSTOMER,
      risk: RiskLevel.LOW,
      notes: 'Dispatched to customer portal for review. Within standard 8% ceiling.',
      lines: [
        { productIdx: 0, qty: 8, unitPrice: 1299, unitCost: 850, discount: 7, allowed: 10, isOver: false, overPoints: 0 },
        { productIdx: 3, qty: 8, unitPrice: 45, unitCost: 22, discount: 5, allowed: 10, isOver: false, overPoints: 0 },
      ],
      currentStage: ApprovalStage.APPROVED,
    },
    {
      quoteNumber: 'Q-1046',
      customerIdx: 4, // Horizon Media (SILVER)
      repEmail: 'rep@dealflow.com',
      status: QuotationStatus.UNDER_NEGOTIATION,
      risk: RiskLevel.MEDIUM,
      notes: 'Client submitted counter-proposal of 5% extra discount. Negotiating final delivery date.',
      lines: [
        { productIdx: 0, qty: 10, unitPrice: 1299, unitCost: 850, discount: 12, allowed: 10, isOver: true, overPoints: 2 },
        { productIdx: 2, qty: 10, unitPrice: 189, unitCost: 110, discount: 10, allowed: 10, isOver: false, overPoints: 0 },
      ],
      currentStage: ApprovalStage.SALES_MANAGER,
    },
    {
      quoteNumber: 'Q-1047',
      customerIdx: 5, // Apex Logistics (SILVER)
      repEmail: 'david.rep@dealflow.com',
      status: QuotationStatus.CONFIRMED,
      risk: RiskLevel.LOW,
      notes: 'Client confirmed order terms. Delivery split across East and Central depots.',
      lines: [
        { productIdx: 1, qty: 3, unitPrice: 4899, unitCost: 3200, discount: 8, allowed: 10, isOver: false, overPoints: 0 },
        { productIdx: 7, qty: 4, unitPrice: 1500, unitCost: 600, discount: 5, allowed: 10, isOver: false, overPoints: 0 },
      ],
      currentStage: ApprovalStage.APPROVED,
    },
    {
      quoteNumber: 'Q-1048',
      customerIdx: 6, // Pinnacle Retail (BRONZE)
      repEmail: 'rep@dealflow.com',
      status: QuotationStatus.DRAFT,
      risk: RiskLevel.LOW,
      notes: 'Draft quote being prepared for annual store hardware refresh.',
      lines: [
        { productIdx: 0, qty: 5, unitPrice: 1299, unitCost: 850, discount: 4, allowed: 5, isOver: false, overPoints: 0 },
        { productIdx: 3, qty: 5, unitPrice: 45, unitCost: 22, discount: 3, allowed: 5, isOver: false, overPoints: 0 },
      ],
      currentStage: ApprovalStage.SALES_MANAGER,
    },
  ];

  const createdQuotes = [];
  for (const q of quotationsToCreate) {
    const cust = customerList[q.customerIdx];
    const rep = userMap[q.repEmail];

    // Compute line totals
    let subtotal = 0;
    let discountAmt = 0;
    let totalCost = 0;

    const lineInserts = q.lines.map((l) => {
      const p = productList[l.productIdx];
      const gross = l.qty * l.unitPrice;
      const discVal = gross * (l.discount / 100);
      const net = gross - discVal;
      const cost = l.qty * l.unitCost;
      const margin = net > 0 ? ((net - cost) / net) * 100 : 0;

      subtotal += gross;
      discountAmt += discVal;
      totalCost += cost;

      return {
        product: { connect: { id: p.id } },
        category: p.category,
        quantity: l.qty,
        unitPrice: l.unitPrice,
        unitCost: l.unitCost,
        discountPercent: l.discount,
        allowedLimitPercent: l.allowed,
        isOverLimit: l.isOver,
        overLimitPoints: l.overPoints,
        lineTotal: Math.round(net),
        lineCostTotal: Math.round(cost),
        lineMarginPercent: Number(margin.toFixed(1)),
      };
    });

    const netAmount = subtotal - discountAmt;
    const overallMargin = netAmount > 0 ? ((netAmount - totalCost) / netAmount) * 100 : 0;

    const existingQuote = await prisma.quotation.findUnique({
      where: { quoteNumber: q.quoteNumber },
    });

    if (existingQuote) {
      await prisma.quotation.update({
        where: { quoteNumber: q.quoteNumber },
        data: {
          status: q.status,
          blendedRiskScore: q.risk,
          subtotalAmount: Math.round(subtotal),
          totalDiscountAmount: Math.round(discountAmt),
          totalAmount: Math.round(netAmount),
          totalCost: Math.round(totalCost),
          totalMarginPercent: Number(overallMargin.toFixed(1)),
          customerTermsConfirmed: q.status === QuotationStatus.CONFIRMED,
        },
      });
      createdQuotes.push(existingQuote);
    } else {
      const created = await prisma.quotation.create({
        data: {
          quoteNumber: q.quoteNumber,
          customer: { connect: { id: cust.id } },
          salesRep: { connect: { id: rep.id } },
          status: q.status,
          blendedRiskScore: q.risk,
          subtotalAmount: Math.round(subtotal),
          totalDiscountAmount: Math.round(discountAmt),
          totalAmount: Math.round(netAmount),
          totalCost: Math.round(totalCost),
          totalMarginPercent: Number(overallMargin.toFixed(1)),
          customerTermsConfirmed: q.status === QuotationStatus.CONFIRMED,
          lines: { create: lineInserts },
          comments: {
            create: [
              {
                authorRole: Role.SALES_REP,
                authorName: rep.fullName,
                message: q.notes,
              },
            ],
          },
          ...(q.status === QuotationStatus.PENDING_APPROVAL
            ? {
                approvalRequests: {
                  create: {
                    currentStage: q.currentStage,
                    blendedRiskLevel: q.risk,
                    worstLineDeviation: Math.max(...q.lines.map((l) => l.overPoints)),
                    flagReasonSummary: q.notes,
                    auditLogs: {
                      create: [
                        {
                          userId: rep.id,
                          action: ApprovalAction.SUBMITTED,
                          note: 'Submitted for managerial & governance review.',
                        },
                      ],
                    },
                  },
                },
              }
            : {}),
        },
      });
      createdQuotes.push(created);
    }
  }

  // ==========================================
  // 6. Invoices & Payments
  // ==========================================
  console.log('💳 Seeding Invoices & Payments...');
  const invoiceData = [
    { quoteIdx: 1, custIdx: 1, amount: 31200, status: InvoiceStatus.PAID, daysDue: -5, isPaid: true, method: 'Wire Transfer', ref: 'WIRE-US-99124' },
    { quoteIdx: 5, custIdx: 5, amount: 18450, status: InvoiceStatus.PAID, daysDue: -15, isPaid: true, method: 'ACH Direct', ref: 'ACH-889021-TX' },
    { quoteIdx: 3, custIdx: 3, amount: 9850, status: InvoiceStatus.UNPAID, daysDue: 20, isPaid: false },
    { quoteIdx: 0, custIdx: 0, amount: 22800, status: InvoiceStatus.OVERDUE, daysDue: -12, isPaid: false },
  ];

  for (let i = 0; i < invoiceData.length; i++) {
    const inv = invoiceData[i];
    const q = createdQuotes[inv.quoteIdx];
    const c = customerList[inv.custIdx];
    const invNum = `INV-2026-00${i + 1}`;

    const due = new Date();
    due.setDate(due.getDate() + inv.daysDue);

    const invoiceRec = await prisma.invoice.upsert({
      where: { invoiceNumber: invNum },
      update: { amount: inv.amount, status: inv.status, dueDate: due, paidAt: inv.isPaid ? new Date() : null },
      create: {
        invoiceNumber: invNum,
        quotationId: q.id,
        customerId: c.id,
        amount: inv.amount,
        status: inv.status,
        dueDate: due,
        paidAt: inv.isPaid ? new Date() : null,
      },
    });

    if (inv.isPaid) {
      const existingPay = await prisma.payment.findFirst({ where: { invoiceId: invoiceRec.id } });
      if (!existingPay) {
        await prisma.payment.create({
          data: {
            invoiceId: invoiceRec.id,
            amount: inv.amount,
            paymentMethod: inv.method,
            reference: inv.ref,
            paidAt: new Date(),
          },
        });
      }
    }
  }

  // ==========================================
  // 7. Recurring Subscriptions
  // ==========================================
  console.log('🔄 Seeding Subscriptions & MRR...');
  const subData = [
    { custIdx: 1, quoteIdx: 1, plan: 'Enterprise Cloud CPQ Platform', cycle: RecurringInterval.MONTHLY, amount: 2450, status: 'ACTIVE', nextDays: 18 },
    { custIdx: 0, quoteIdx: 0, plan: 'Mission-Critical 24/7 Incident Support', cycle: RecurringInterval.QUARTERLY, amount: 4500, status: 'ACTIVE', nextDays: 42 },
    { custIdx: 2, quoteIdx: 2, plan: 'Dedicated Financial Compliance Cluster', cycle: RecurringInterval.YEARLY, amount: 28000, status: 'ACTIVE', nextDays: 140 },
    { custIdx: 4, quoteIdx: 4, plan: 'Media Streaming Node Acceleration', cycle: RecurringInterval.MONTHLY, amount: 1200, status: 'PAUSED', nextDays: 10 },
  ];

  for (const s of subData) {
    const c = customerList[s.custIdx];
    const q = createdQuotes[s.quoteIdx];
    const nextB = new Date();
    nextB.setDate(nextB.getDate() + s.nextDays);

    const existingSub = await prisma.subscription.findFirst({
      where: { customerId: c.id, planName: s.plan },
    });

    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          customerId: c.id,
          quotationId: q.id,
          planName: s.plan,
          cycle: s.cycle,
          amount: s.amount,
          status: s.status,
          nextBillingDate: nextB,
        },
      });
    }
  }

  // ==========================================
  // 8. Governance Ceilings & Matrices
  // ==========================================
  console.log('⚖️ Seeding Discount Governance Matrix...');
  await prisma.tierDiscountCeiling.upsert({ where: { tier: CustomerTier.BRONZE }, update: { maxDiscount: 5 }, create: { tier: CustomerTier.BRONZE, maxDiscount: 5 } });
  await prisma.tierDiscountCeiling.upsert({ where: { tier: CustomerTier.SILVER }, update: { maxDiscount: 10 }, create: { tier: CustomerTier.SILVER, maxDiscount: 10 } });
  await prisma.tierDiscountCeiling.upsert({ where: { tier: CustomerTier.GOLD }, update: { maxDiscount: 15 }, create: { tier: CustomerTier.GOLD, maxDiscount: 15 } });

  await prisma.categoryDiscountCeiling.upsert({ where: { category: ProductCategory.HARDWARE }, update: { maxDiscount: 15 }, create: { category: ProductCategory.HARDWARE, maxDiscount: 15 } });
  await prisma.categoryDiscountCeiling.upsert({ where: { category: ProductCategory.SERVICES }, update: { maxDiscount: 10 }, create: { category: ProductCategory.SERVICES, maxDiscount: 10 } });
  await prisma.categoryDiscountCeiling.upsert({ where: { category: ProductCategory.SUBSCRIPTION }, update: { maxDiscount: 15 }, create: { category: ProductCategory.SUBSCRIPTION, maxDiscount: 15 } });

  await prisma.approvalChainMatrix.upsert({
    where: { riskLevel: RiskLevel.LOW },
    update: { requiresManagerApproval: false, requiresFinanceApproval: false, description: 'Within tier and category ceilings. Instant rep sign-off.' },
    create: { riskLevel: RiskLevel.LOW, requiresManagerApproval: false, requiresFinanceApproval: false, description: 'Within tier and category ceilings. Instant rep sign-off.' },
  });

  await prisma.approvalChainMatrix.upsert({
    where: { riskLevel: RiskLevel.MEDIUM },
    update: { requiresManagerApproval: true, requiresFinanceApproval: false, description: 'Exceeds rep limits up to 5 points. Routed to Sales Manager.' },
    create: { riskLevel: RiskLevel.MEDIUM, requiresManagerApproval: true, requiresFinanceApproval: false, description: 'Exceeds rep limits up to 5 points. Routed to Sales Manager.' },
  });

  await prisma.approvalChainMatrix.upsert({
    where: { riskLevel: RiskLevel.HIGH },
    update: { requiresManagerApproval: true, requiresFinanceApproval: true, description: 'Exceeds limits by >5 points or margin breach. Multi-tier sign-off.' },
    create: { riskLevel: RiskLevel.HIGH, requiresManagerApproval: true, requiresFinanceApproval: true, description: 'Exceeds limits by >5 points or margin breach. Multi-tier sign-off.' },
  });

  console.log('🎉 Comprehensive database seeding completed successfully!');
}

seed()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
