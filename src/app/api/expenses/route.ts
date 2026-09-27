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
import { ExpenseRecord } from '@/types/band';

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

    if (!canAccessLavajam(user.role, user)) {
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
    if (!user || !canAccessLavajam(user.role, user)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Major and Treasurer can record expenses.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { date: rawDate, expenseDetails, name, amount, category, notes, additionalNotes } = body;

    const detailsStr = (expenseDetails || name || '').trim();
    if (!detailsStr) {
      return NextResponse.json({ error: 'Expense Name / Details is required' }, { status: 400 });
    }

    const formattedDate = formatDateToDDMMYYYY(rawDate);
    const amountNum = Number(amount) || 0;
    const notesStr = (additionalNotes || notes || '').trim();

    const newExpense = addExpense({
      date: formattedDate,
      expenseDetails: detailsStr,
      amount: amountNum,
      category: category || 'Instruments',
      notes: notesStr || undefined,
    });

    // 1. Sync to local Excel file (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx -> Instrument Expenses sheet)
    syncExpenseToExcel(newExpense, 'add');

    // 2. Sync to live Google Sheet (Instrument Expenses sheet)
    await postExpenseToGoogleSheet(newExpense, 'add').catch(err => {
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
    if (!user || !canAccessLavajam(user.role, user)) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const body = await req.json();
    const { id, originalDetails, originalAmount, additionalNotes, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    if (additionalNotes && !updates.notes) {
      updates.notes = additionalNotes;
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

    let updated = updateExpense(id, updates);
    if (!updated) {
      const matchDetails = originalDetails || updates.expenseDetails || updates.name;
      if (matchDetails) {
        const found = getExpenses().find(e => {
          const matchName = e.expenseDetails.trim().toLowerCase() === matchDetails.trim().toLowerCase();
          if (originalAmount !== undefined) {
            return matchName && Number(e.amount) === Number(originalAmount);
          }
          return matchName;
        });
        if (found) {
          updated = updateExpense(found.id, updates);
        }
      }
    }

    const finalExpense: ExpenseRecord = updated || {
      id,
      date: updates.date || formatDateToDDMMYYYY(),
      expenseDetails: updates.expenseDetails || updates.name || originalDetails || 'Instrument Expense',
      amount: Number(updates.amount) || 0,
      category: updates.category || 'Instruments',
      notes: updates.notes,
    };

    // 1. Sync to local Excel
    syncExpenseToExcel(finalExpense, 'update', originalDetails, originalAmount);

    // 2. Sync to Google Sheets
    await postExpenseToGoogleSheet(finalExpense, 'update', originalDetails, originalAmount).catch(err => {
      console.warn('Background sync to Google Sheet failed:', err);
    });

    return NextResponse.json({ success: true, expense: finalExpense });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update expense' }, { status: 500 });
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
    const detailsParam = searchParams.get('details') || searchParams.get('expenseDetails') || '';
    const amountParam = searchParams.get('amount');
    const targetAmt = amountParam ? Number(amountParam) : undefined;

    if (!id && !detailsParam) {
      return NextResponse.json({ error: 'Expense ID or Details required' }, { status: 400 });
    }

    let existing = id ? getExpenses().find(e => e.id === id) : undefined;
    if (!existing && detailsParam) {
      if (targetAmt !== undefined && !isNaN(targetAmt)) {
        existing = getExpenses().find(
          e =>
            e.expenseDetails.trim().toLowerCase() === detailsParam.trim().toLowerCase() &&
            Number(e.amount) === targetAmt
        );
      }
      if (!existing) {
        existing = getExpenses().find(e => e.expenseDetails.trim().toLowerCase() === detailsParam.trim().toLowerCase());
      }
    }

    const targetExpense: ExpenseRecord = existing || {
      id: id || `exp-${Date.now()}`,
      date: formatDateToDDMMYYYY(),
      expenseDetails: detailsParam || '',
      amount: targetAmt !== undefined ? targetAmt : 0,
      category: 'Instruments',
    };

    if (existing) {
      deleteExpense(existing.id);
    }

    // 1. Sync to local Excel
    syncExpenseToExcel(targetExpense, 'delete', targetExpense.expenseDetails, targetExpense.amount);

    // 2. Sync to Google Sheets
    await postExpenseToGoogleSheet(targetExpense, 'delete', targetExpense.expenseDetails, targetExpense.amount).catch(err => {
      console.warn('Background sync delete to Google Sheet failed:', err);
    });

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete expense' }, { status: 500 });
  }
}
