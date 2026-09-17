import { NextRequest, NextResponse } from 'next/server';
import {
  getFinancials,
  addFinancialRecord,
  updateFinancialRecord,
  deleteFinancialRecord,
  getUserById,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessFullFinancials } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // RBAC: Only Overall Major & Treasurer can see complete financials
    if (!canAccessFullFinancials(user.role)) {
      return NextResponse.json(
        {
          error:
            'Access Restricted: Only the Overall Major and Treasurer have permission to view the full Lavajam financial ledger.',
        },
        { status: 403 }
      );
    }

    const records = getFinancials();

    // Summary metrics
    const totalCollected = records
      .filter(r => r.status === 'Paid')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalPending = records
      .filter(r => r.status === 'Pending')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const paidCount = records.filter(r => r.status === 'Paid').length;
    const collectionRate = records.length > 0 ? Math.round((paidCount / records.length) * 100) : 0;

    return NextResponse.json({
      records,
      metrics: {
        totalCollected,
        totalPending,
        paidCount,
        pendingCount: records.length - paidCount,
        collectionRate,
        totalRecords: records.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve financials' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canAccessFullFinancials(user.role)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Overall Major and Treasurer can record financial contributions.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, year, month, amount, status, paymentMethod, transactionRef, notes } = body;

    const targetMember = getUserById(userId);
    if (!targetMember) {
      return NextResponse.json({ error: 'Invalid band member selected' }, { status: 400 });
    }

    const newRecord = addFinancialRecord({
      userId: targetMember.id,
      userName: targetMember.name,
      section: targetMember.section,
      year: Number(year) || new Date().getFullYear(),
      month: month || 'September',
      amount: Number(amount) || 1500,
      status: status || 'Paid',
      paidAt: status === 'Paid' ? new Date().toISOString() : undefined,
      paymentMethod,
      transactionRef,
      notes,
      receiptNo: `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    });

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record contribution' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canAccessFullFinancials(user.role)) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (updates.status === 'Paid' && !updates.paidAt) {
      updates.paidAt = new Date().toISOString();
      if (!updates.receiptNo) {
        updates.receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    const updated = updateFinancialRecord(id, updates);
    return NextResponse.json({ success: true, record: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canAccessFullFinancials(user.role)) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Record ID required' }, { status: 400 });

    const deleted = deleteFinancialRecord(id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
