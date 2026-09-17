import * as XLSX from 'xlsx';
import { User, Tune, LavajamRecord, AttendanceSession, InstrumentSection, Role } from '@/types/band';

export interface ParsedMemberRow {
  Name: string;
  Email: string;
  Section: string;
  Role?: string;
  Phone?: string;
  Rank?: string;
}

export interface ParsedTuneRow {
  Title: string;
  Section: string;
  Key?: string;
  Difficulty?: string;
  Tempo?: string;
}

/**
 * Parses an Excel or CSV file buffer and returns structured rows
 */
export function parseExcelBuffer<T = unknown>(buffer: ArrayBuffer | Buffer): T[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<T>(worksheet);
}

/**
 * Generates an Excel buffer for Financials (Lavajam) records
 */
export function exportFinancialsToExcel(records: LavajamRecord[]): Buffer {
  const data = records.map(r => ({
    'Receipt No': r.receiptNo || '—',
    'Member Name': r.userName,
    'Section': r.section,
    'Year': r.year,
    'Month': r.month,
    'Amount (INR)': r.amount,
    'Status': r.status,
    'Paid Date': r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—',
    'Payment Method': r.paymentMethod || '—',
    'Transaction Ref': r.transactionRef || '—',
    'Notes': r.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Band_Contributions');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generates an Excel buffer for Attendance Sessions
 */
export function exportAttendanceToExcel(sessions: AttendanceSession[]): Buffer {
  const flatData: Record<string, unknown>[] = [];

  sessions.forEach(sess => {
    sess.records.forEach(rec => {
      flatData.push({
        'Session Date': new Date(sess.date).toLocaleDateString(),
        'Session Title': sess.sessionTitle,
        'Session Type': sess.sessionType,
        'Member Name': rec.userName,
        'Section': rec.section,
        'Status': rec.status,
        'Notes': rec.notes || '',
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(flatData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance_Log');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
