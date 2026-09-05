import { NextResponse } from 'next/server';

let prisma;
try {
  const { PrismaClient } = require('../../../../../backend/node_modules/@prisma/client');
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
  prisma = global.prismaGlobal;
} catch (e) {
  console.error('Failed to initialize Prisma in Next.js invoices route:', e);
}

export async function GET(request) {
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
  }

  try {
    let invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        quotation: {
          select: { quoteNumber: true, status: true, totalAmount: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-seed invoices from quotations if none exist in PostgreSQL
    if (invoices.length === 0) {
      const quotations = await prisma.quotation.findMany({
        include: { customer: true },
        take: 5,
      });

      if (quotations.length > 0) {
        for (let i = 0; i < quotations.length; i++) {
          const q = quotations[i];
          const isPaid = i === 0 || i === 2;
          const isOverdue = i === 4;
          const status = isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'UNPAID';
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (isOverdue ? -10 : 30));

          await prisma.invoice.create({
            data: {
              invoiceNumber: `INV-2026-${1001 + i}`,
              quotationId: q.id,
              customerId: q.customerId,
              amount: q.totalAmount || 12500,
              status,
              dueDate,
              paidAt: isPaid ? new Date() : null,
              ...(isPaid
                ? {
                    payments: {
                      create: [
                        {
                          amount: q.totalAmount || 12500,
                          paymentMethod: 'Wire Transfer',
                          reference: `WIRE-${8890 + i}`,
                          paidAt: new Date(),
                        },
                      ],
                    },
                  }
                : {}),
            },
          });
        }

        invoices = await prisma.invoice.findMany({
          include: {
            customer: true,
            quotation: {
              select: { quoteNumber: true, status: true, totalAmount: true },
            },
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    return NextResponse.json({ success: true, count: invoices.length, invoices });
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-2026-${1001 + count}`;

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        quotationId: body.quotationId,
        customerId: body.customerId,
        amount: Number(body.amount) || 0,
        status: 'UNPAID',
        dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 30 * 86400000),
      },
      include: {
        customer: true,
        quotation: true,
      },
    });

    return NextResponse.json({ success: true, invoice: newInvoice });
  } catch (err) {
    console.error('Error creating invoice:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const { id, action, amount, paymentMethod, reference } = await request.json();

    if (action === 'RECORD_PAYMENT') {
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

      await prisma.payment.create({
        data: {
          invoiceId: id,
          amount: Number(amount) || invoice.amount,
          paymentMethod: paymentMethod || 'Wire Transfer',
          reference: reference || `REF-${Date.now().toString().slice(-6)}`,
          paidAt: new Date(),
        },
      });

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
        include: { customer: true, payments: true },
      });

      return NextResponse.json({ success: true, invoice: updated });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Error updating invoice:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
