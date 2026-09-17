export type Role =
  | 'Overall Major'
  | 'Treasurer'
  | 'Trumpet Major'
  | 'Saxophone Major'
  | 'Euphonium Major'
  | 'Dish Major'
  | 'SideDrum Major'
  | 'Band Member / Player';

export type InstrumentSection =
  | 'Trumpet'
  | 'Saxophone'
  | 'Euphonium'
  | 'Dish'
  | 'SideDrum';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  section: InstrumentSection;
  phone?: string;
  avatar?: string;
  rank?: string;
  joinedDate: string;
  active: boolean;
}

export type LavajamStatus = 'Paid' | 'Pending';

export interface LavajamRecord {
  id: string;
  userId: string;
  userName: string;
  section: InstrumentSection;
  year: number;
  month: string;
  amount: number;
  status: LavajamStatus;
  paidAt?: string;
  paymentMethod?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  transactionRef?: string;
  notes?: string;
  receiptNo?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface MemberAttendanceEntry {
  userId: string;
  userName: string;
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
