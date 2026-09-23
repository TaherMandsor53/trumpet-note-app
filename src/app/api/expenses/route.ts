import { NextRequest, NextResponse } from 'next/server';
import {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessLavajam } from '@/lib/rbac';
import { syncExpenseToExcel, postExpenseToGoogleSheet, syncExpensesFromGoogleSheet } from '@/lib/google-sheets';

function formatDateToDDMMYYYY(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${now.getFullYear()}`;
  }
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

    if (!canAccessLavajam(user.role)) {
      return NextResponse.json(
        { error: 'Access Restricted: Only Major and Treasurer can view expenses.' },
        { status: 403 }
      );
    }

    // Always fetch live expenses in sync with Google Sheets (Instrument Expenses sheet)
    const expenses = await syncExpensesFromGoogleSheet();
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return NextResponse.json({
      expenses,
      metrics: {
        totalExpenses,
        count: expenses.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canAccessLavajam(user.role)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Major and Treasurer can record expenses.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { date: rawDate, expenseDetails, name, amount, category, notes } = body;

    const detailsStr = (expenseDetails || name || '').trim();
    if (!detailsStr) {
      return NextResponse.json({ error: 'Expense Name / Details is required' }, { status: 400 });
    }

    const formattedDate = formatDateToDDMMYYYY(rawDate);
    const amountNum = Number(amount) || 0;

    const newExpense = addExpense({
      date: formattedDate,
      expenseDetails: detailsStr,
      amount: amountNum,
      category: category || 'Instruments',
      notes,
    });

    // 1. Sync to local Excel file (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx -> Instrument Expenses sheet)
    syncExpenseToExcel(newExpense, 'add');

    // 2. Sync to live Google Sheet (Instrument Expenses sheet)
    postExpenseToGoogleSheet(newExpense, 'add').catch(err => {
      console.warn('Background sync to Google Sheet failed:', err);
    });

    return NextResponse.json({ success: true, expense: newExpense }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record expense' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canAccessLavajam(user.role)) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const body = await req.json();
    const { id, originalDetails, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    if (updates.date) {
      updates.date = formatDateToDDMMYYYY(updates.date);
    }
    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount) || 0;
    }
    if (updates.name && !updates.expenseDetails) {
      updates.expenseDetails = updates.name;
    }

    const updated = updateExpense(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // 1. Sync to local Excel
    syncExpenseToExcel(updated, 'update', originalDetails);

    // 2. Sync to Google Sheets
    postExpenseToGoogleSheet(updated, 'update', originalDetails).catch(err => {
      console.warn('Background sync to Google Sheet failed:', err);
    });

    return NextResponse.json({ success: true, expense: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });

    const existing = getExpenses().find(e => e.id === id);
    const deleted = deleteExpense(id);

    if (deleted && existing) {
      // 1. Sync to local Excel
      syncExpenseToExcel(existing, 'delete');

      // 2. Sync to Google Sheets
      postExpenseToGoogleSheet(existing, 'delete').catch(err => {
        console.warn('Background sync delete to Google Sheet failed:', err);
      });
    }

    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
