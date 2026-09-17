import {
  User,
  Tune,
  LavajamRecord,
  AttendanceSession,
  AttendanceReportMetrics,
  InstrumentSection,
  Role,
} from '@/types/band';
import {
  INITIAL_USERS,
  INITIAL_TUNES,
  INITIAL_LAVAJAM,
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
    attendance: AttendanceSession[];
  } | undefined;
}

function getDatabase() {
  if (!globalThis.__bandDatabase) {
    globalThis.__bandDatabase = {
      users: [...INITIAL_USERS],
      tunes: [...INITIAL_TUNES],
      financials: [...INITIAL_LAVAJAM],
      attendance: [...INITIAL_ATTENDANCE_SESSIONS],
    };
  }
  return globalThis.__bandDatabase;
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

export function addUser(user: Omit<User, 'id'>): User {
  const db = getDatabase();
  const newUser: User = {
    ...user,
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    joinedDate: user.joinedDate || new Date().toISOString().split('T')[0],
    active: true,
  };
  db.users.push(newUser);
  return newUser;
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const db = getDatabase();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return null;
  db.users[index] = { ...db.users[index], ...updates };
  return db.users[index];
}

export function deleteUser(id: string): boolean {
  const db = getDatabase();
  const initialLength = db.users.length;
  db.users = db.users.filter(u => u.id !== id);
  return db.users.length < initialLength;
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

// ----------------- ATTENDANCE -----------------

export function getAttendanceSessions(): AttendanceSession[] {
  return getDatabase().attendance;
}

export function addAttendanceSession(session: Omit<AttendanceSession, 'id'>): AttendanceSession {
  const db = getDatabase();
  const newSession: AttendanceSession = {
    ...session,
    id: `att-${Date.now()}`,
  };
  db.attendance.unshift(newSession);
  return newSession;
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

      if (sectionStats[r.section]) {
        sectionStats[r.section].total++;
        if (r.status === 'Present' || r.status === 'Late') {
          sectionStats[r.section].present++;
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
