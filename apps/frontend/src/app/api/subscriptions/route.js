import { NextResponse } from 'next/server';

let prisma;
try {
  const { PrismaClient } = require('../../../../../backend/node_modules/@prisma/client');
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
  prisma = global.prismaGlobal;
} catch (e) {
  console.error('Failed to initialize Prisma in subscriptions route:', e);
}

export async function GET(request) {
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
  }

  try {
    let subs = await prisma.subscription.findMany({
      include: {
        customer: true,
        quotation: {
          select: { quoteNumber: true },
        },
        prorationLogs: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-seed initial recurring subscriptions from customers if empty
    if (subs.length === 0) {
      const customers = await prisma.customer.findMany({ take: 3 });
      const quotations = await prisma.quotation.findMany({ take: 3 });

      if (customers.length > 0 && quotations.length > 0) {
        const seedPlans = [
          { name: 'Enterprise Cloud CPQ Tier 1', cycle: 'MONTHLY', amount: 1850 },
          { name: 'Dedicated Support & 24/7 SLA', cycle: 'QUARTERLY', amount: 4500 },
          { name: 'Developer Cloud Instances Cluster', cycle: 'YEARLY', amount: 24000 },
        ];

        for (let i = 0; i < seedPlans.length; i++) {
          const cust = customers[i % customers.length];
          const quote = quotations[i % quotations.length];
          const p = seedPlans[i];
          const nextBilling = new Date();
          nextBilling.setDate(nextBilling.getDate() + (i === 0 ? 15 : i === 1 ? 45 : 120));

          await prisma.subscription.create({
            data: {
              customerId: cust.id,
              quotationId: quote.id,
              planName: p.name,
              cycle: p.cycle,
              amount: p.amount,
              status: 'ACTIVE',
              nextBillingDate: nextBilling,
            },
          });
        }

        subs = await prisma.subscription.findMany({
          include: {
            customer: true,
            quotation: { select: { quoteNumber: true } },
            prorationLogs: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    return NextResponse.json({ success: true, count: subs.length, subscriptions: subs });
  } catch (err) {
    console.error('Error in subscriptions GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + (body.cycle === 'YEARLY' ? 12 : body.cycle === 'QUARTERLY' ? 3 : 1));

    // Resolve valid customer
    let custId = body.customerId;
    if (!custId) {
      const firstCust = await prisma.customer.findFirst();
      custId = firstCust?.id;
    }

    // Resolve valid quotation
    let quoteId = body.quotationId;
    if (!quoteId) {
      const custQuote = await prisma.quotation.findFirst({ where: { customerId: custId } });
      if (custQuote) {
        quoteId = custQuote.id;
      } else {
        const anyQuote = await prisma.quotation.findFirst();
        quoteId = anyQuote?.id;
      }
    }

    if (!custId || !quoteId) {
      return NextResponse.json({ success: false, error: 'Customer and Quotation are required to provision a subscription.' }, { status: 400 });
    }

    const newSub = await prisma.subscription.create({
      data: {
        customer: { connect: { id: custId } },
        quotation: { connect: { id: quoteId } },
        planName: body.planName || 'Enterprise Subscription Plan',
        cycle: body.cycle || 'MONTHLY',
        amount: Number(body.amount) || 0,
        status: 'ACTIVE',
        nextBillingDate: nextDate,
      },
      include: {
        customer: true,
        quotation: true,
      },
    });

    return NextResponse.json({ success: true, subscription: newSub });
  } catch (err) {
    console.error('Error in subscriptions POST:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const { id, action, newStatus } = await request.json();

    if (action === 'UPDATE_STATUS') {
      const updated = await prisma.subscription.update({
        where: { id },
        data: { status: newStatus },
      });
      return NextResponse.json({ success: true, subscription: updated });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Error in subscriptions PATCH:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
