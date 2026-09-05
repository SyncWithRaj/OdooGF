const { PrismaClient } = require('../apps/backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const [users, customers, products, variants, warehouses, warehouseStock, quotations, lines, approvals, invoices, payments, subs] = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.warehouse.count(),
    prisma.warehouseStock.count(),
    prisma.quotation.count(),
    prisma.quotationLine.count(),
    prisma.approvalRequest.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.subscription.count(),
  ]);

  console.log(JSON.stringify({
    users,
    customers,
    products,
    variants,
    warehouses,
    warehouseStock,
    quotations,
    lines,
    approvals,
    invoices,
    payments,
    subscriptions: subs,
  }, null, 2));

  await prisma.$disconnect();
}

check().catch((e) => {
  console.error(e);
  prisma.$disconnect();
});
