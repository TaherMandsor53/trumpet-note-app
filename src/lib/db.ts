import {
  User,
  Tune,
  LavajamRecord,
  ExpenseRecord,
  AttendanceSession,
  AttendanceReportMetrics,
  InstrumentSection,
  Role,
} from '@/types/band';
import {
  INITIAL_USERS,
  INITIAL_TUNES,
  INITIAL_LAVAJAM,
  INITIAL_EXPENSES,
  INITIAL_ATTENDANCE_SESSIONS,
} from './initial-data';
import { isTuneNew } from './utils';

// Global in-memory storage holding dynamic application state across requests
declare global {
  // eslint-disable-next-line no-var
  var __bandDatabase: {
    users: User[];
    tunes: Tune[];
    financials: LavajamRecord[];
    expenses: ExpenseRecord[];
    attendance: AttendanceSession[];
  } | undefined;
}

function getDatabase() {
  if (!globalThis.__bandDatabase) {
    globalThis.__bandDatabase = {
      users: [...INITIAL_USERS],
      tunes: [...INITIAL_TUNES],
      financials: [...INITIAL_LAVAJAM],
      expenses: [...INITIAL_EXPENSES],
      attendance: [...INITIAL_ATTENDANCE_SESSIONS],
    };
  } else {
    if (!globalThis.__bandDatabase.expenses) {
      globalThis.__bandDatabase.expenses = [...INITIAL_EXPENSES];
    }
    // Clean up and ensure accurate financials in memory
    if (globalThis.__bandDatabase.financials) {
      globalThis.__bandDatabase.financials = globalThis.__bandDatabase.financials
        .filter(f => {
          const name = (f.userName || '').toUpperCase();
          if (name.includes('ZOZWALA')) return false;
          if (name.includes('HUSSAIN HANNANBHAI') || (name.includes('HUSSAIN') && name.includes('MULLAMITHAWALA'))) return false;
          return true;
        })
        .map(f => {
          if ((f.userName || '').toUpperCase().includes('VALINABU')) {
            return { ...f, section: 'Major', role: 'Major' };
          }
          return f;
        });
    }
    // Ensure all INITIAL_USERS from Member Details sheet are present and up-to-date in memory
    let existing = globalThis.__bandDatabase.users.filter(u => {
      const its = String(u.itsNumber || '').trim();
      const name = String(u.name || '').trim().toLowerCase();
      // Filter out test and placeholder users
      if (name === 'test' || name === 'test1' || name === 'band member') return false;
      if (its === '89890909' || its === '7878676789' || its === '44044989') return false;
      return true;
    });

    for (const initUser of INITIAL_USERS) {
      const idx = existing.findIndex(
        u =>
          u.id === initUser.id ||
          (initUser.itsNumber && u.itsNumber === initUser.itsNumber) ||
          (initUser.username && u.username?.toLowerCase() === initUser.username.toLowerCase()) ||
          (initUser.email && u.email?.toLowerCase() === initUser.email.toLowerCase())
      );
      if (idx === -1) {
        existing.push({ ...initUser });
      } else {
        // Sync attributes while preserving any runtime password changes
        existing[idx] = {
          ...existing[idx],
          ...initUser,
          password: existing[idx].password || initUser.password,
          role: initUser.role,
          section: initUser.section,
          rank: initUser.rank,
        };
      }
    }

    // Keep clean list of users in memory
    globalThis.__bandDatabase.users = existing;

    // Prune test/dummy records from attendance sessions
    if (globalThis.__bandDatabase.attendance) {
      globalThis.__bandDatabase.attendance = globalThis.__bandDatabase.attendance.filter(sess => {
        if (sess.id === 'att-session-001' || sess.id === 'att-session-002' || sess.id === 'att-session-003') return false;
        if (sess.sessionTitle.includes('Weekly Parade & National Anthem Drill')) return false;
        if (sess.sessionTitle.includes('Sectional Harmony Practice')) return false;
        if (sess.sessionTitle.includes('Full Scout Band General Rehearsal')) return false;
        return true;
      });

      const validUserIds = new Set(existing.map(u => u.id));
      const validIts = new Set(existing.map(u => String(u.itsNumber || '').trim()).filter(Boolean));
      globalThis.__bandDatabase.attendance = globalThis.__bandDatabase.attendance.map(sess => ({
        ...sess,
        records: sess.records.filter(r => {
          const recName = String(r.userName || '').trim().toLowerCase();
          const recIts = String(r.userId || '').replace(/^sheet-/, '').trim();
          if (recName === 'test' || recName === 'test1' || recName === 'band member') return false;
          if (recIts === '89890909' || recIts === '7878676789' || recIts === '44044989') return false;
          return validUserIds.has(r.userId) || validIts.has(recIts);
        }),
      }));
    }

    // If attendance is empty after removing mock records, load real sessions from Attendance Details Excel sheet
    if (globalThis.__bandDatabase.attendance.length === 0) {
      globalThis.__bandDatabase.attendance = loadSessionsFromExcel();
    }
  }
  return globalThis.__bandDatabase;
}

function loadSessionsFromExcel(): AttendanceSession[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    const excelPath = path.join(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
    if (!fs.existsSync(excelPath)) return [];

    const wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets['Attendance Details'];
    if (!ws) return [];

    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) return [];

    const headers = rows[0];
    const sessions: AttendanceSession[] = [];
    const allUsers = getUsers();

    for (let c = 1; c < headers.length; c++) {
      const headerVal = String(headers[c] || '').trim();
      if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(headerVal)) continue;

      const dateParts = headerVal.split('/');
      const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

      const records: any[] = [];
      for (let r = 1; r < Math.min(rows.length, 41); r++) {
        const memberName = String(rows[r][0] || '').trim();
        const statusVal = String(rows[r][c] || '').trim();
        if (statusVal && ['Present', 'Absent', 'Late', 'Excused'].includes(statusVal)) {
          const userObj = allUsers.find(u => u.name.toLowerCase() === memberName.toLowerCase());
          records.push({
            userId: userObj?.id || `user-${r}`,
            userName: memberName,
            itsNumber: userObj?.itsNumber || '',
            section: userObj?.section || 'Trumpet',
            status: statusVal,
            notes: '',
          });
        }
      }

      if (records.length > 0) {
        sessions.push({
          id: `session-${headerVal.replace(/\//g, '-')}`,
          date: isoDate,
          sessionTitle: `Practice Attendance Session (${headerVal})`,
          sessionType: 'Regular Practice',
          markedBy: 'Overall Major',
          records,
        });
      }
    }

    return sessions;
  } catch (err) {
    return [];
  }
}

// ----------------- USERS -----------------

export function getUsers(): User[] {
  return getDatabase().users;
}

export function getUserById(id: string): User | undefined {
  return getDatabase().users.find(u => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return getDatabase().users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserByUsernameOrEmail(identifier: string): User | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toLowerCase();
  const cleanDigits = identifier.trim().replace(/\D/g, '');

  return getDatabase().users.find(u => {
    // 1. Exact match with username or email (case-insensitive)
    if (u.username && u.username.toLowerCase() === clean) return true;
    if (u.email && u.email.toLowerCase() === clean) return true;

    // 2. Match username prefix before @ (e.g. "burhanuddinGulamali" matching "burhanuddinGulamali@tsgband.com")
    if (u.username) {
      const uPrefix = u.username.toLowerCase().split('@')[0];
      if (uPrefix === clean) return true;
    }
    if (u.email) {
      const ePrefix = u.email.toLowerCase().split('@')[0];
      if (ePrefix === clean) return true;
    }

    // 3. Match ITS Number (e.g. "40405751")
    if (u.itsNumber && (u.itsNumber.trim() === clean || (cleanDigits && u.itsNumber.trim() === cleanDigits))) {
      return true;
    }

    // 4. Match Phone / Mobile Number (e.g. "7405275368")
    if (cleanDigits && cleanDigits.length >= 7 && u.phone) {
      const uDigits = u.phone.replace(/\D/g, '');
      if (uDigits === cleanDigits || uDigits.endsWith(cleanDigits) || cleanDigits.endsWith(uDigits)) {
        return true;
      }
    }

    // 5. Match Full Name (e.g. "BURHANUDDIN ABBASBHAI GULAMALI")
    if (u.name && u.name.toLowerCase().trim() === clean) {
      return true;
    }

    return false;
  });
}

export function updateUserPassword(identifier: string, newPassword: string): boolean {
  const db = getDatabase();
  const clean = identifier.trim().toLowerCase();
  const cleanDigits = identifier.trim().replace(/\D/g, '');

  const index = db.users.findIndex(u => {
    if (u.username && u.username.toLowerCase() === clean) return true;
    if (u.email && u.email.toLowerCase() === clean) return true;
    if (u.username && u.username.toLowerCase().split('@')[0] === clean) return true;
    if (u.email && u.email.toLowerCase().split('@')[0] === clean) return true;
    if (u.itsNumber && (u.itsNumber.trim() === clean || (cleanDigits && u.itsNumber.trim() === cleanDigits))) return true;
    return false;
  });

  if (index === -1) return false;
  db.users[index] = {
    ...db.users[index],
    password: newPassword,
  };
  persistUsersToDisk(db.users);
  return true;
}

export function syncUsersWithSheet(sheetUsers: User[]): void {
  const db = getDatabase();
  for (const sUser of sheetUsers) {
    if (!sUser.itsNumber && (!sUser.name || sUser.name === 'Band Member')) continue;
    const existingIndex = db.users.findIndex(
      u =>
        (sUser.itsNumber && u.itsNumber && u.itsNumber === sUser.itsNumber) ||
        (sUser.username && u.username?.toLowerCase() === sUser.username.toLowerCase()) ||
        (sUser.email && u.email.toLowerCase() === sUser.email.toLowerCase())
    );
    if (existingIndex >= 0) {
      db.users[existingIndex] = { ...db.users[existingIndex], ...sUser };
    } else {
      db.users.push(sUser);
    }
  }
  persistUsersToDisk(db.users);
}

function persistUsersToDisk(users: User[]) {
  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const jsonPath = path.join(process.cwd(), 'src', 'data', 'members-40.json');
      if (fs.existsSync(jsonPath)) {
        fs.writeFileSync(jsonPath, JSON.stringify(users, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('Could not persist users to members-40.json:', e);
    }
  }
}

export function addUser(user: Omit<User, 'id'> & { id?: string }): User {
  const db = getDatabase();
  const id = user.id || (user.itsNumber ? `sheet-${user.itsNumber}` : `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  const newUser: User = {
    ...user,
    id,
    joinedDate: user.joinedDate || new Date().toISOString().split('T')[0],
    active: true,
  };
  db.users.push(newUser);
  persistUsersToDisk(db.users);
  return newUser;
}

export function updateUser(
  id: string,
  updates: Partial<User>
): { updatedUser: User | null; previousMajorUser: User | null } {
  const db = getDatabase();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return { updatedUser: null, previousMajorUser: null };

  const targetRole = updates.role;
  let previousMajorUser: User | null = null;

  // If promoting someone to a Section Major, reassign previous Section Major in that section to Section Member
  if (targetRole && targetRole.endsWith('Major') && targetRole !== 'Major' && targetRole !== 'Overall Major') {
    const targetSection = updates.section || db.users[index].section;
    const prevMajorIndex = db.users.findIndex(
      u =>
        u.id !== id &&
        (u.role === targetRole ||
          (targetSection &&
            u.section === targetSection &&
            u.role.endsWith('Major') &&
            u.role !== 'Major' &&
            u.role !== 'Overall Major'))
    );

    if (prevMajorIndex !== -1) {
      const prevSection = db.users[prevMajorIndex].section;
      const defaultMemberRole = (
        prevSection === 'Trumpet' ? 'Trumpet Member' :
        prevSection === 'Saxophone' ? 'Saxophone Member' :
        prevSection === 'Euphonium' ? 'Euphonium Member' :
        prevSection === 'Trombone' ? 'Trombone Member' :
        prevSection === 'Dish' ? 'Dish Member' :
        prevSection === 'SideDrum' ? 'SideDrum Member' :
        'Trumpet Member'
      ) as Role;

      db.users[prevMajorIndex] = {
        ...db.users[prevMajorIndex],
        role: defaultMemberRole,
        rank: `${defaultMemberRole}`,
      };
      previousMajorUser = db.users[prevMajorIndex];
    }
  }

  db.users[index] = { ...db.users[index], ...updates };
  persistUsersToDisk(db.users);
  return { updatedUser: db.users[index], previousMajorUser };
}

export function deleteUser(id: string): boolean {
  const db = getDatabase();
  const initialLength = db.users.length;
  db.users = db.users.filter(u => u.id !== id);
  const deleted = db.users.length < initialLength;
  if (deleted) {
    persistUsersToDisk(db.users);
  }
  return deleted;
}

// ----------------- FINANCIALS (LAVAJAM) -----------------

export function getFinancials(): LavajamRecord[] {
  return getDatabase().financials;
}

export function getPersonalFinancials(userId: string): LavajamRecord[] {
  return getDatabase().financials.filter(f => f.userId === userId);
}

export function addFinancialRecord(record: Omit<LavajamRecord, 'id'>): LavajamRecord {
  const db = getDatabase();
  const newRecord: LavajamRecord = {
    ...record,
    id: `lav-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  };
  db.financials.unshift(newRecord);
  return newRecord;
}

export function updateFinancialRecord(id: string, updates: Partial<LavajamRecord>): LavajamRecord | null {
  const db = getDatabase();
  const index = db.financials.findIndex(f => f.id === id);
  if (index === -1) return null;
  db.financials[index] = { ...db.financials[index], ...updates };
  return db.financials[index];
}

export function deleteFinancialRecord(id: string): boolean {
  const db = getDatabase();
  const initialLength = db.financials.length;
  db.financials = db.financials.filter(f => f.id !== id);
  return db.financials.length < initialLength;
}

export function setFinancials(records: LavajamRecord[]): void {
  const db = getDatabase();
  db.financials = records;
}

// ----------------- INSTRUMENT EXPENSES -----------------

export function getExpenses(): ExpenseRecord[] {
  const db = getDatabase();
  if (!db.expenses) {
    db.expenses = [...INITIAL_EXPENSES];
  }
  return db.expenses;
}

export function setExpenses(expenses: ExpenseRecord[]): void {
  const db = getDatabase();
  db.expenses = expenses;
}

export function addExpense(expense: Omit<ExpenseRecord, 'id'>): ExpenseRecord {
  const db = getDatabase();
  if (!db.expenses) db.expenses = [...INITIAL_EXPENSES];
  const newExpense: ExpenseRecord = {
    ...expense,
    id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    createdAt: new Date().toISOString(),
  };
  db.expenses.unshift(newExpense);
  return newExpense;
}

export function updateExpense(id: string, updates: Partial<ExpenseRecord>): ExpenseRecord | null {
  const db = getDatabase();
  if (!db.expenses) db.expenses = [...INITIAL_EXPENSES];
  const index = db.expenses.findIndex(e => e.id === id);
  if (index === -1) return null;
  db.expenses[index] = { ...db.expenses[index], ...updates };
  return db.expenses[index];
}

export function deleteExpense(id: string): boolean {
  const db = getDatabase();
  if (!db.expenses) db.expenses = [...INITIAL_EXPENSES];
  const initialLength = db.expenses.length;
  db.expenses = db.expenses.filter(e => e.id !== id);
  return db.expenses.length < initialLength;
}

// ----------------- ATTENDANCE -----------------

export function getAttendanceSessions(): AttendanceSession[] {
  return getDatabase().attendance;
}

export function addAttendanceSession(session: Omit<AttendanceSession, 'id'>): AttendanceSession {
  const db = getDatabase();
  const existingIdx = db.attendance.findIndex(s => s.date === session.date);
  const newSession: AttendanceSession = {
    ...session,
    id: existingIdx >= 0 ? db.attendance[existingIdx].id : `att-${Date.now()}`,
  };
  if (existingIdx >= 0) {
    db.attendance[existingIdx] = newSession;
  } else {
    db.attendance.unshift(newSession);
  }
  return newSession;
}

export function deleteAttendanceSession(id: string): boolean {
  const db = getDatabase();
  const initialLength = db.attendance.length;
  db.attendance = db.attendance.filter(s => s.id !== id);
  return db.attendance.length < initialLength;
}

export function getAttendanceMetrics(): AttendanceReportMetrics {
  const sessions = getAttendanceSessions();
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalExcused = 0;
  let totalEntries = 0;

  const sectionStats: Record<InstrumentSection, { present: number; total: number }> = {
    Trumpet: { present: 0, total: 0 },
    Saxophone: { present: 0, total: 0 },
    Euphonium: { present: 0, total: 0 },
    Trombone: { present: 0, total: 0 },
    Dish: { present: 0, total: 0 },
    SideDrum: { present: 0, total: 0 },
  };

  sessions.forEach(sess => {
    sess.records.forEach(r => {
      totalEntries++;
      if (r.status === 'Present') totalPresent++;
      else if (r.status === 'Absent') totalAbsent++;
      else if (r.status === 'Late') totalLate++;
      else if (r.status === 'Excused') totalExcused++;

      const secKey = ((r.section as string) === 'SideDrum/BaseDrum' ? 'SideDrum' : r.section) as InstrumentSection;
      if (sectionStats[secKey]) {
        sectionStats[secKey].total++;
        if (r.status === 'Present' || r.status === 'Late') {
          sectionStats[secKey].present++;
        }
      }
    });
  });

  const overallRate = totalEntries > 0 ? Math.round(((totalPresent + totalLate) / totalEntries) * 100) : 0;

  const sectionBreakdown = (Object.keys(sectionStats) as InstrumentSection[]).map(section => {
    const s = sectionStats[section];
    return {
      section,
      rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      present: s.present,
      total: s.total,
    };
  });

  const recentSessions = sessions.slice(0, 10).map(s => {
    const pres = s.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const rate = s.records.length > 0 ? Math.round((pres / s.records.length) * 100) : 0;
    return {
      id: s.id,
      date: s.date,
      title: s.sessionTitle,
      attendanceRate: rate,
      presentCount: pres,
      totalMembers: s.records.length,
    };
  });

  return {
    totalSessions: sessions.length,
    overallAttendanceRate: overallRate,
    presentCount: totalPresent,
    absentCount: totalAbsent,
    lateCount: totalLate,
    excusedCount: totalExcused,
    sectionBreakdown,
    recentSessions,
  };
}

// ----------------- TUNES & NOTES -----------------

export function getTunes(): Tune[] {
  const db = getDatabase();
  return db.tunes.map(t => ({
    ...t,
    isNew: isTuneNew(t.createdAt),
  }));
}

export function getTuneById(id: string): Tune | undefined {
  const tune = getDatabase().tunes.find(t => t.id === id);
  if (!tune) return undefined;
  return {
    ...tune,
    isNew: isTuneNew(tune.createdAt),
  };
}

export function addTune(tune: Omit<Tune, 'id' | 'createdAt'> & { createdAt?: string }): Tune {
  const db = getDatabase();
  const newTune: Tune = {
    ...tune,
    id: `tune-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    createdAt: tune.createdAt || new Date().toISOString(),
    assignedUserIds: tune.assignedUserIds || [],
  };
  db.tunes.unshift(newTune);
  return {
    ...newTune,
    isNew: isTuneNew(newTune.createdAt),
  };
}

export function updateTuneAssignments(tuneId: string, assignedUserIds: string[]): Tune | null {
  const db = getDatabase();
  const index = db.tunes.findIndex(t => t.id === tuneId);
  if (index === -1) return null;
  db.tunes[index] = {
    ...db.tunes[index],
    assignedUserIds,
  };
  return {
    ...db.tunes[index],
    isNew: isTuneNew(db.tunes[index].createdAt),
  };
}
