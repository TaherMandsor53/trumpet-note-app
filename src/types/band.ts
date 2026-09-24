export type Role =
  | 'SideDrum Major'
  | 'Trumpet Member'
  | 'Treasurer'
  | 'Major'
  | 'Euphonium Member'
  | 'Saxophone Member'
  | 'Ghugara Member'
  | 'Trombone Member'
  | 'Trombone Major'
  | 'Dish Major'
  | 'Instrument Maintainer'
  | 'BaseDrum Member'
  | 'Khanjari Member'
  | 'Euphonium Major'
  | 'Saxophone Major'
  | 'Dish Member'
  | 'Triangle Member'
  | 'Trumpet Major'
  | 'Overall Major'
  | 'SideDrum Member'
  | 'SideDrum/BaseDrum Major'
  | 'Band Member / Player';

export type InstrumentSection =
  | 'Trumpet'
  | 'Saxophone'
  | 'Euphonium'
  | 'Dish'
  | 'SideDrum'
  | 'Trombone';

export interface User {
  id: string;
  itsNumber?: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: Role;
  section: InstrumentSection;
  phone?: string;
  address?: string;
  jamaat?: string;
  avatar?: string;
  rank?: string;
  joinedDate: string;
  active: boolean;
}

export type LavajamStatus = 'Paid' | 'Unpaid' | 'Pending';

export interface LavajamRecord {
  id: string;
  date?: string;
  userId?: string;
  userName: string;
  fundType?: 'Lavajam' | 'Hoob';
  section?: InstrumentSection | string;
  year?: number | string;
  month?: string;
  amount: number;
  status: LavajamStatus;
  paidAt?: string;
  paymentMethod?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  transactionRef?: string;
  notes?: string;
  receiptNo?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  expenseDetails: string;
  amount: number;
  category?: string;
  notes?: string;
  createdAt?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface MemberAttendanceEntry {
  userId: string;
  userName: string;
  itsNumber?: string;
  section: InstrumentSection;
  status: AttendanceStatus;
  notes?: string;
}

export interface AttendanceSession {
  id: string;
  date: string;
  sessionTitle: string;
  sessionType: 'Regular Practice' | 'Parade Drill' | 'Ceremony Rehearsal' | 'Sectional';
  markedBy: string;
  records: MemberAttendanceEntry[];
}

export interface AttendanceReportMetrics {
  totalSessions: number;
  overallAttendanceRate: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  sectionBreakdown: {
    section: InstrumentSection;
    rate: number;
    present: number;
    total: number;
  }[];
  recentSessions: {
    id: string;
    date: string;
    title: string;
    attendanceRate: number;
    presentCount: number;
    totalMembers: number;
  }[];
}

export interface Tune {
  id: string;
  title: string;
  arabicName?: string;
  section: InstrumentSection;
  key: string;
  pdfUrl: string;
  audioUrl?: string;
  driveFileId?: string;
  createdAt: string; // ISO date string
  uploadedBy: string;
  assignedUserIds: string[]; // specific player IDs granted access
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  tempo?: string;
  isNew?: boolean; // dynamic: <= 15 days
}

export interface DriveFolderSyncResult {
  section: InstrumentSection;
  folderId: string;
  folderName: string;
  syncedFilesCount: number;
  newFilesAdded: number;
  lastSyncedAt: string;
  files: {
    id: string;
    name: string;
    size: string;
    modifiedTime: string;
    syncStatus: 'synced' | 'new';
  }[];
}

export interface AuthSession {
  user: User;
  token: string;
}
