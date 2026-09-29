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
import { LavajamRecord } from '@/types/band';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // RBAC: Strictly restricted to Major & Treasurer roles
    if (!canAccessLavajam(user.role, user)) {
      return NextResponse.json(
        {
          error:
            'Access Restricted: Only Major and Treasurer have permission to view Lavajam Management.',
        },
        { status: 403 }
      );
    }

    const targetYear = req.nextUrl.searchParams.get('year') || '2026';

    // Fetch live records in sync with Google Sheets (Lavajam Details sheet) for requested year
    const { records, years, selectedYear } = await syncLavajamFromGoogleSheet(targetYear);

    // Summary metrics
    const totalCollected = records
      .filter(r => r.status === 'Paid')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const totalPending = records
      .filter(r => r.status === 'Pending')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const paidCount = records.filter(r => r.status === 'Paid').length;
    const unpaidCount = records.filter(r => r.status === 'Unpaid').length;
    const pendingCount = records.filter(r => r.status === 'Pending').length;
    const collectionRate = records.length > 0 ? Math.round((paidCount / records.length) * 100) : 0;

    return NextResponse.json({
      records,
      years,
      selectedYear,
      metrics: {
        totalCollected,
        totalPending,
        paidCount,
        unpaidCount,
        pendingCount,
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
    if (!user || !canAccessLavajam(user.role, user)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Major and Treasurer can record financial contributions.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fundType, userId, userName: rawUserName, amount, year: rawYear, status, paymentMethod, transactionRef, notes } = body;

    let memberName = (rawUserName || '').trim();
    let memberSection = 'External / Hoob';
    let targetUserId = userId;
    const targetYear = String(rawYear || '2026');

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

    const amountNum = Number(amount) || 0;
    const recStatus = status || (amountNum > 0 ? 'Paid' : 'Unpaid');

    // Check if member already has a record in financials
    const existing = getFinancials().find(
      f => f.userName.trim().toLowerCase() === memberName.toLowerCase()
    );

    let savedRecord;
    if (existing) {
      savedRecord = updateFinancialRecord(existing.id, {
        fundType: fundType || 'Lavajam',
        amount: amountNum,
        year: targetYear,
        status: recStatus,
        paidAt: recStatus === 'Paid' ? new Date().toISOString() : undefined,
        paymentMethod: paymentMethod || 'UPI',
        transactionRef,
        notes,
      }) || existing;
    } else {
      savedRecord = addFinancialRecord({
        userId: targetUserId,
        userName: memberName,
        fundType: fundType || 'Lavajam',
        section: memberSection as any,
        year: targetYear,
        month: 'September',
        amount: amountNum,
        status: recStatus,
        paidAt: recStatus === 'Paid' ? new Date().toISOString() : undefined,
        paymentMethod: paymentMethod || 'Cash',
        transactionRef,
        notes,
        receiptNo: `REC-${targetYear}-${Math.floor(100 + Math.random() * 900)}`,
      });
    }

    // 1. Sync to local Excel file (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx -> Lavajam Details sheet)
    syncLavajamToExcel(savedRecord, 'add', targetYear);

    // 2. Sync to live Google Sheet (Lavajam Details sheet)
    await postLavajamToGoogleSheet(savedRecord, 'add', targetYear).catch(err => {
      console.warn('Background sync to Google Sheet failed:', err);
    });

    return NextResponse.json({ success: true, record: savedRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record contribution' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canAccessLavajam(user.role, user)) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const body = await req.json();
    const { id, originalName, year: rawYear, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
    }

    const targetYear = String(rawYear || updates.year || '2026');

    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount) || 0;
      updates.status = updates.amount > 0 ? 'Paid' : 'Unpaid';
    }

    if (updates.status === 'Paid' && !updates.paidAt) {
      updates.paidAt = new Date().toISOString();
      if (!updates.receiptNo) {
        updates.receiptNo = `REC-${targetYear}-${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    updates.year = targetYear;

    let updated = updateFinancialRecord(id, updates);
    if (!updated) {
      const matchName = originalName || updates.userName;
      if (matchName) {
        const found = getFinancials().find(f => f.userName.trim().toLowerCase() === matchName.trim().toLowerCase());
        if (found) {
          updated = updateFinancialRecord(found.id, updates);
        }
      }
    }

    const finalRecord: LavajamRecord = updated || {
      id,
      userName: updates.userName || originalName || 'Band Member',
      fundType: updates.fundType || 'Lavajam',
      amount: Number(updates.amount) || 0,
      year: targetYear,
      status: (Number(updates.amount) || 0) > 0 ? 'Paid' : 'Unpaid',
      paidAt: updates.paidAt,
      receiptNo: updates.receiptNo,
    };

    // 1. Sync to local Excel
    syncLavajamToExcel(finalRecord, 'update', targetYear, originalName);

    // 2. Sync to Google Sheets
    await postLavajamToGoogleSheet(finalRecord, 'update', targetYear, originalName).catch(err => {
      console.warn('Background sync to Google Sheet failed:', err);
    });

    return NextResponse.json({ success: true, record: finalRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canAccessLavajam(user.role, user)) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const targetYear = searchParams.get('year') || '2026';
    const nameParam = searchParams.get('name') || searchParams.get('userName') || '';

    if (!id && !nameParam) {
      return NextResponse.json({ error: 'Record ID or Contributor Name required' }, { status: 400 });
    }

    let existing = id ? getFinancials().find(f => f.id === id) : undefined;
    if (!existing && nameParam) {
      existing = getFinancials().find(f => f.userName.trim().toLowerCase() === nameParam.trim().toLowerCase());
    }

    if (existing) {
      const isHoob = (existing.fundType || '').toLowerCase().includes('hoob');

      if (isHoob) {
        // Delete Hoob contributor record
        deleteFinancialRecord(existing.id);
        syncLavajamToExcel(existing, 'delete', targetYear);
        await postLavajamToGoogleSheet(existing, 'delete', targetYear).catch(err => {
          console.warn('Background sync delete to Google Sheet failed:', err);
        });
      } else {
        // For Band Member: mark as Unpaid by clearing amount for target year
        const updated = updateFinancialRecord(existing.id, {
          amount: 0,
          status: 'Unpaid',
          year: targetYear,
        });
        syncLavajamToExcel(updated || { ...existing, amount: 0, status: 'Unpaid' }, 'delete', targetYear);
        await postLavajamToGoogleSheet(updated || { ...existing, amount: 0, status: 'Unpaid' }, 'delete', targetYear).catch(err => {
          console.warn('Background sync clear to Google Sheet failed:', err);
        });
      }
    } else if (nameParam) {
      const fallbackRecord: LavajamRecord = {
        id: id || `lav-${Date.now()}`,
        userName: nameParam,
        fundType: 'Lavajam',
        amount: 0,
        year: targetYear,
        status: 'Unpaid',
      };
      syncLavajamToExcel(fallbackRecord, 'delete', targetYear);
      await postLavajamToGoogleSheet(fallbackRecord, 'delete', targetYear).catch(err => {
        console.warn('Background sync clear to Google Sheet failed:', err);
      });
    }

    return NextResponse.json({ success: true, message: 'Contribution cleared or removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete record' }, { status: 500 });
  }
}
