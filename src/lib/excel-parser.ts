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
 * Generates an Excel buffer for Attendance Sessions with the "Attendance Details" sheet
 * Top row: Date headers
 * Rows: Member rows with ITS Number, Name, Section, and status (Present/Absent/Late)
 */
export function exportAttendanceToExcel(sessions: AttendanceSession[], users?: User[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // 1. Build "Attendance Details" Matrix Sheet (User x Dates)
  // Sort sessions chronologically
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Extract date keys
  const dateColumns = sortedSessions.map(s => {
    const raw = s.date.includes('T') ? s.date.split('T')[0] : s.date;
    return raw;
  });

  // Get unique members either from passed users or from all sessions
  const memberList: { id: string; itsNumber: string; name: string; section: string; role: string }[] = [];
  const seenMemberIds = new Set<string>();

  if (users && users.length > 0) {
    users.forEach(u => {
      seenMemberIds.add(u.id);
      memberList.push({
        id: u.id,
        itsNumber: u.itsNumber || '',
        name: u.name,
        section: u.section,
        role: u.role,
      });
    });
  } else {
    sortedSessions.forEach(sess => {
      sess.records.forEach(rec => {
        if (!seenMemberIds.has(rec.userId)) {
          seenMemberIds.add(rec.userId);
          memberList.push({
            id: rec.userId,
            itsNumber: rec.userId.replace('sheet-', ''),
            name: rec.userName,
            section: rec.section,
            role: 'Band Member',
          });
        }
      });
    });
  }

  // Create matrix rows matching Image 3: Col A is 'Full Name', followed by date columns (DD/MM/YYYY)
  const matrixData = memberList.map(member => {
    const rowObj: Record<string, string> = {
      'Full Name': member.name.toUpperCase(),
    };

    sortedSessions.forEach(sess => {
      const rawDate = sess.date.includes('T') ? sess.date.split('T')[0] : sess.date;
      const parts = rawDate.split('-');
      const colHeader = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : rawDate;
      const rec = sess.records.find(r => r.userId === member.id || r.userName.toLowerCase() === member.name.toLowerCase());
      // Status strictly Present, Absent, Late
      rowObj[colHeader] = rec ? rec.status : '—';
    });

    return rowObj;
  });

  const matrixSheet = XLSX.utils.json_to_sheet(matrixData);
  XLSX.utils.book_append_sheet(workbook, matrixSheet, 'Attendance Details');

  // 2. Also append chronological session log sheet
  const flatData: Record<string, unknown>[] = [];
  sortedSessions.forEach(sess => {
    sess.records.forEach(rec => {
      flatData.push({
        'Date': sess.date.includes('T') ? sess.date.split('T')[0] : sess.date,
        'Session Title': sess.sessionTitle,
        'Session Type': sess.sessionType,
        'Member Name': rec.userName,
        'Section': rec.section,
        'Attendance Status': rec.status,
        'Remarks': rec.notes || '',
        'Marked By': sess.markedBy,
      });
    });
  });

  const logSheet = XLSX.utils.json_to_sheet(flatData);
  XLSX.utils.book_append_sheet(workbook, logSheet, 'Session_History_Log');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

