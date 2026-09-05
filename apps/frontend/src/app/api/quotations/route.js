import { NextResponse } from 'next/server';

// Reuse PrismaClient instance across Next.js API requests
let prisma;
try {
  const { PrismaClient } = require('../../../../../backend/node_modules/@prisma/client');
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
  prisma = global.prismaGlobal;
} catch (e) {
  console.error('Failed to initialize Prisma in Next.js route:', e);
}

// GET /api/quotations -> Fetch all live quotations directly from PostgreSQL
export async function GET(request) {
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 500 });
  }

  try {
    const rawQuotes = await prisma.quotation.findMany({
      include: {
        customer: true,
        salesRep: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        lines: {
          include: {
            product: true,
          },
        },
        approvalRequests: {
          include: {
            auditLogs: {
              include: {
                user: { select: { fullName: true, role: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = rawQuotes.map((q) => {
      const activeApproval = q.approvalRequests[0];
      const auditTrail = [];

      // Combine approval audit logs and quotation comments into unified timeline
      if (activeApproval && activeApproval.auditLogs) {
        activeApproval.auditLogs.forEach((log) => {
          auditTrail.push({
            id: log.id,
            timestamp: log.createdAt,
            actorName: log.user?.fullName || 'Governance Reviewer',
            actorRole: log.user?.role || 'SYSTEM',
            action: log.action,
            comment: log.note || 'Audit status change recorded in DB.',
          });
        });
      }

      if (q.comments) {
        q.comments.forEach((c) => {
          auditTrail.push({
            id: c.id,
            timestamp: c.createdAt,
            actorName: c.authorName,
            actorRole: c.authorRole,
            action: 'COMMENT',
            comment: c.message,
          });
        });
      }

      // Sort timeline newest first
      auditTrail.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        id: q.id,
        quoteNumber: q.quoteNumber,
        customerId: q.customerId,
        customerName: q.customer?.name || 'Customer',
        customerEmail: q.customer?.email || '',
        customerTier: q.customer?.tier || 'BRONZE',
        salesRepId: q.salesRepId,
        salesRepName: q.salesRep?.fullName || 'Sales Rep',
        status: q.status,
        currentStage: activeApproval ? activeApproval.currentStage : (q.status === 'DRAFT' ? 'SALES_REP' : 'APPROVED'),
        blendedRiskScore: q.blendedRiskScore,
        requiresManagerApproval: activeApproval?.currentStage === 'SALES_MANAGER' || q.blendedRiskScore !== 'LOW',
        requiresFinanceApproval: activeApproval?.currentStage === 'FINANCE' || q.blendedRiskScore === 'HIGH',
        subtotalAmount: q.subtotalAmount,
        totalDiscountAmount: q.totalDiscountAmount,
        orderDiscountPercent: q.orderDiscountPercent,
        totalAmount: q.totalAmount,
        totalCost: q.totalCost,
        totalMarginPercent: q.totalMarginPercent,
        notes: q.comments?.[0]?.message || '',
        flagReasonSummary: activeApproval?.flagReasonSummary || '',
        lines: q.lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          productName: l.product?.name || 'Item',
          category: l.category,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          baseCost: l.unitCost,
          discountPercent: l.discountPercent,
          allowedLimit: l.allowedLimitPercent,
          isOverLimit: l.isOverLimit,
          overLimitPoints: l.overLimitPoints,
          lineRevenue: l.lineTotal,
          lineCost: l.lineCostTotal,
          lineMarginPercent: l.lineMarginPercent,
        })),
        auditLogs: auditTrail,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      count: formatted.length,
      quotations: formatted,
    });
  } catch (error) {
    console.error('Error fetching quotations from PostgreSQL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/quotations -> Create a new quotation directly in PostgreSQL
export async function POST(request) {
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const count = await prisma.quotation.count();
    const quoteNumber = body.quoteNumber || `Q-${1040 + count + 1}`;

    // Ensure valid Customer ID
    let custId = body.customerId;
    const custExists = custId ? await prisma.customer.findUnique({ where: { id: custId } }) : null;
    if (!custExists) {
      const firstCust = await prisma.customer.findFirst();
      custId = firstCust ? firstCust.id : null;
    }

    // Ensure valid Sales Rep ID
    let repId = body.salesRepId;
    const repExists = repId ? await prisma.user.findUnique({ where: { id: repId } }) : null;
    if (!repExists) {
      const defaultRep = (await prisma.user.findFirst({ where: { role: 'SALES_REP' } })) || (await prisma.user.findFirst());
      repId = defaultRep ? defaultRep.id : null;
    }

    // Ensure valid Product connections for each line
    const firstAvailableProduct = await prisma.product.findFirst();
    const createdLines = await Promise.all(
      (body.lines || []).map(async (l) => {
        let prodId = l.productId;
        const exists = prodId ? await prisma.product.findUnique({ where: { id: prodId } }) : null;
        if (!exists) {
          prodId = firstAvailableProduct?.id;
        }

        return {
          product: { connect: { id: prodId } },
          category: l.category || exists?.category || 'HARDWARE',
          quantity: Number(l.quantity) || 1,
          unitPrice: Number(l.unitPrice) || 0,
          unitCost: Number(l.baseCost) || 0,
          discountPercent: Number(l.discountPercent) || 0,
          allowedLimitPercent: Number(l.allowedLimit) || 5,
          isOverLimit: Boolean(l.isOverLimit),
          overLimitPoints: Number(l.overLimitPoints) || 0,
          lineTotal: Number(l.lineRevenue) || 0,
          lineCostTotal: Number(l.lineCost) || 0,
          lineMarginPercent: Number(l.lineMarginPercent) || 0,
        };
      })
    );

    const created = await prisma.quotation.create({
      data: {
        quoteNumber,
        customer: { connect: { id: custId } },
        salesRep: { connect: { id: repId } },
        status: body.status || 'DRAFT',
        blendedRiskScore: body.blendedRiskScore || 'LOW',
        subtotalAmount: Number(body.subtotalAmount) || 0,
        totalDiscountAmount: Number(body.totalDiscountAmount) || 0,
        orderDiscountPercent: Number(body.orderDiscountPercent) || 0,
        totalTaxAmount: 0,
        totalAmount: Number(body.totalAmount) || 0,
        totalCost: Number(body.totalCost) || 0,
        totalMarginPercent: Number(body.totalMarginPercent) || 0,
        lines: {
          create: createdLines,
        },
        ...(body.status === 'PENDING_APPROVAL'
          ? {
              approvalRequests: {
                create: {
                  currentStage: body.blendedRiskScore === 'HIGH' ? 'SALES_MANAGER' : 'SALES_MANAGER',
                  blendedRiskLevel: body.blendedRiskScore || 'LOW',
                  worstLineDeviation: Number(body.lines?.reduce((max, l) => Math.max(max, l.overLimitPoints || 0), 0)) || 0,
                  flagReasonSummary: body.flagReasonSummary || 'Submitted for governance review.',
                  auditLogs: {
                    create: [
                      {
                        userId: repId,
                        action: 'SUBMITTED',
                        note: 'Quotation submitted for governance approval.',
                      },
                    ],
                  },
                },
              },
            }
          : {}),
        ...(body.notes
          ? {
              comments: {
                create: [
                  {
                    authorRole: 'SALES_REP',
                    authorName: body.salesRepName || 'Sales Rep',
                    message: body.notes,
                  },
                ],
              },
            }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      quotation: created,
    });
  } catch (error) {
    console.error('Error inserting quotation into PostgreSQL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/quotations -> Handle Approvals, Rejections, Returns, and Orders in PostgreSQL
export async function PATCH(request) {
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 500 });
  }

  try {
    const { id, action, note, currentUser } = await request.json();
    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: {
        approvalRequests: { orderBy: { createdAt: 'desc' } },
        customer: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Quotation not found' }, { status: 404 });
    }

    let nextStatus = existing.status;
    let nextStage = existing.approvalRequests[0]?.currentStage || 'SALES_MANAGER';
    let approvalAction = 'SUBMITTED';

    // Role-based state machine
    if (action === 'SUBMIT') {
      nextStatus = 'PENDING_APPROVAL';
      nextStage = existing.blendedRiskScore === 'LOW' ? 'APPROVED' : 'SALES_MANAGER';
      approvalAction = 'SUBMITTED';
    } else if (action === 'APPROVE') {
      const currentRole = (currentUser?.role || '').toLowerCase();
      if ((currentRole === 'manager' || currentRole === 'sales_manager') && existing.blendedRiskScore === 'HIGH') {
        // Escalate Manager L1 to Finance L2
        nextStatus = 'PENDING_APPROVAL';
        nextStage = 'FINANCE';
        approvalAction = 'APPROVED';
      } else {
        // Full approval
        nextStatus = 'APPROVED';
        nextStage = 'APPROVED';
        approvalAction = 'APPROVED';
      }
    } else if (action === 'REJECT') {
      nextStatus = 'REJECTED';
      nextStage = 'REJECTED';
      approvalAction = 'REJECTED';
    } else if (action === 'RETURN') {
      nextStatus = 'DRAFT';
      nextStage = 'RETURNED';
      approvalAction = 'RETURNED_FOR_REVISION';
    } else if (action === 'CONFIRM') {
      nextStatus = 'CONFIRMED';
      nextStage = 'APPROVED';
      approvalAction = 'APPROVED';
    } else if (action === 'UPDATE_STATUS') {
      const { newStatus } = await request.clone().json().catch(() => ({}));
      if (newStatus) {
        nextStatus = newStatus;
      }
    }

    // Update Quotation in DB
    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: nextStatus,
        customerTermsConfirmed: action === 'CONFIRM' ? true : existing.customerTermsConfirmed,
      },
    });

    // Update or create ApprovalRequest and AuditLog in DB
    let userRecord = await prisma.user.findFirst({
      where: { email: currentUser?.email || 'admin@dealflow.com' },
    });
    if (!userRecord) {
      userRecord = await prisma.user.findFirst();
    }

    let approvalReq = existing.approvalRequests[0];
    if (approvalReq) {
      await prisma.approvalRequest.update({
        where: { id: approvalReq.id },
        data: {
          currentStage: nextStage,
          isCompleted: nextStatus === 'APPROVED' || nextStatus === 'CONFIRMED' || nextStatus === 'REJECTED',
        },
      });

      await prisma.approvalAuditLog.create({
        data: {
          approvalRequestId: approvalReq.id,
          userId: userRecord.id,
          action: approvalAction,
          note: note || `Governance action ${action} executed by ${currentUser?.name || userRecord.fullName}`,
        },
      });
    } else if (nextStatus === 'PENDING_APPROVAL') {
      const newApproval = await prisma.approvalRequest.create({
        data: {
          quotationId: id,
          currentStage: nextStage,
          blendedRiskLevel: existing.blendedRiskScore,
          auditLogs: {
            create: [
              {
                userId: userRecord.id,
                action: approvalAction,
                note: note || 'Submitted for approval.',
              },
            ],
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      quotation: updated,
    });
  } catch (error) {
    console.error('Error updating quotation in PostgreSQL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
