import { NextRequest, NextResponse } from 'next/server';
import {
  getFinancials,
  addFinancialRecord,
  updateFinancialRecord,
  deleteFinancialRecord,
  getUserById,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessLavajam } from '@/lib/rbac';
import { syncLavajamToExcel, postLavajamToGoogleSheet, syncLavajamFromGoogleSheet } from '@/lib/google-sheets';

function formatDateToDDMMYYYY(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${now.getFullYear()}`;
  }
  // If format is YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // RBAC: Strictly restricted to Major & Treasurer roles
    if (!canAccessLavajam(user.role)) {
      return NextResponse.json(
        {
          error:
            'Access Restricted: Only Major and Treasurer have permission to view Lavajam Management.',
        },
        { status: 403 }
      );
    }

    // Always fetch live records in sync with Google Sheets (Lavajam Details sheet)
    const records = await syncLavajamFromGoogleSheet();

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
    if (!user || !canAccessLavajam(user.role)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Major and Treasurer can record financial contributions.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fundType, userId, userName: rawUserName, date: rawDate, amount, status, paymentMethod, transactionRef, notes } = body;

    let memberName = (rawUserName || '').trim();
    let memberSection = 'External / Hoob';
    let targetUserId = userId;

    if (fundType === 'Lavajam') {
      if (userId) {
        const targetMember = getUserById(userId);
        if (targetMember) {
          memberName = targetMember.name;
          memberSection = targetMember.section;
          targetUserId = targetMember.id;
        }
      }
    } else {
      // Hoob
      memberSection = 'External / Hoob';
      targetUserId = undefined;
    }

    if (!memberName) {
      return NextResponse.json({ error: 'Contributor name is required' }, { status: 400 });
    }

    const formattedDate = formatDateToDDMMYYYY(rawDate);
    const amountNum = Number(amount) || 0;
    const recStatus = status || 'Paid';

    const newRecord = addFinancialRecord({
      userId: targetUserId,
      userName: memberName,
      fundType: fundType || 'Lavajam',
      section: memberSection as any,
      date: formattedDate,
      year: new Date().getFullYear(),
      month: 'September',
      amount: amountNum,
      status: recStatus,
      paidAt: recStatus === 'Paid' ? new Date().toISOString() : undefined,
      paymentMethod: paymentMethod || 'Cash',
      transactionRef,
      notes,
      receiptNo: `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    });

    // 1. Sync to local Excel file (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx -> Lavajam Details sheet)
    syncLavajamToExcel(newRecord, 'add');

    // 2. Sync to live Google Sheet (Lavajam Details sheet)
    postLavajamToGoogleSheet(newRecord, 'add').catch(err => {
      console.warn('Background sync to Google Sheet failed:', err);
    });

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record contribution' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canAccessLavajam(user.role)) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const body = await req.json();
    const { id, originalName, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
    }

    if (updates.date) {
      updates.date = formatDateToDDMMYYYY(updates.date);
    }
    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount) || 0;
    }

    if (updates.status === 'Paid' && !updates.paidAt) {
      updates.paidAt = new Date().toISOString();
      if (!updates.receiptNo) {
        updates.receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    const updated = updateFinancialRecord(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // 1. Sync to local Excel
    syncLavajamToExcel(updated, 'update', originalName);

    // 2. Sync to Google Sheets
    postLavajamToGoogleSheet(updated, 'update', originalName).catch(err => {
      console.warn('Background sync to Google Sheet failed:', err);
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canAccessLavajam(user.role)) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Record ID required' }, { status: 400 });

    const existing = getFinancials().find(f => f.id === id);
    const deleted = deleteFinancialRecord(id);

    if (deleted && existing) {
      // 1. Sync to local Excel
      syncLavajamToExcel(existing, 'delete');

      // 2. Sync to Google Sheets
      postLavajamToGoogleSheet(existing, 'delete').catch(err => {
        console.warn('Background sync delete to Google Sheet failed:', err);
      });
    }

    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
