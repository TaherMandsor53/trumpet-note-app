import { User, Tune, LavajamRecord, LavajamStatus, AttendanceSession } from '@/types/band';
import members40 from '@/data/members-40.json';

const now = new Date();
const daysAgo = (days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

/**
 * All 40 official band members synchronized from the Member Details sheet
 * (TAHERI SCOUT BAND GROUP 1448H.xlsx)
 */
export const INITIAL_USERS: User[] = members40 as User[];

export const INITIAL_TUNES: Tune[] = [
  {
    id: 'tune-1',
    title: 'Hubbi Lakum - Lead Trumpet Notation',
    arabicName: 'حبي لكم',
    section: 'Trumpet',
    key: 'hubbi_lakum_notes',
    pdfUrl: '/tunes/hubbi_lakum_notes.pdf',
    audioUrl: 'https://www.youtube.com/watch?v=x_wVH4o266Y',
    driveFileId: '1dr_hubbi_001',
    createdAt: daysAgo(5),
    uploadedBy: 'sheet-40404863',
    assignedUserIds: [
      'sheet-40404863',
      'sheet-40912151',
      'sheet-40405600',
      'sheet-40906648',
      'sheet-30141323',
      'sheet-40907710',
    ],
    difficulty: 'Intermediate',
    tempo: '116 BPM',
  },
  {
    id: 'tune-2',
    title: 'Al-Madad Ya Aqa - Complete Band Cadence',
    arabicName: 'المدد يا آقا',
    section: 'Trumpet',
    key: 'al_madad_notes',
    pdfUrl: '/tunes/al_madad_notes.pdf',
    driveFileId: '1dr_madad_002',
    createdAt: daysAgo(12),
    uploadedBy: 'sheet-40403000',
    assignedUserIds: [],
    difficulty: 'Advanced',
    tempo: '120 BPM',
  },
  {
    id: 'tune-3',
    title: 'Burhandeen Chaman Tera - Sectional Harmony',
    arabicName: 'برهان الدين چمن تيرا',
    section: 'Trumpet',
    key: 'burhandeen_chaman_tera_notes',
    pdfUrl: '/tunes/burhandeen_chaman_tera_notes.pdf',
    driveFileId: '1dr_burhan_chaman_003',
    createdAt: daysAgo(20),
    uploadedBy: 'sheet-40404863',
    assignedUserIds: ['sheet-40912151', 'sheet-40404863'],
    difficulty: 'Beginner',
    tempo: '96 BPM',
  },
  {
    id: 'tune-4',
    title: 'Hai Tahani - Royal Procession March',
    arabicName: 'هي التهاني',
    section: 'Trumpet',
    key: 'hai_tahani_notes',
    pdfUrl: '/tunes/hai_tahani_notes.pdf',
    audioUrl: 'https://www.youtube.com/watch?v=x_wVH4o266Y',
    driveFileId: '1dr_hai_tahani_004',
    createdAt: daysAgo(3),
    uploadedBy: 'sheet-40403000',
    assignedUserIds: ['sheet-40912151', 'sheet-40404863', 'sheet-40906648', 'sheet-30141323'],
    difficulty: 'Intermediate',
    tempo: '108 BPM',
  },
  {
    id: 'tune-5',
    title: 'Trumpet Notations Master Sheet',
    section: 'Trumpet',
    key: 'trumpet_notation_notes',
    pdfUrl: '/tunes/trumpet_notation_notes.pdf',
    driveFileId: '1dr_notation_005',
    createdAt: daysAgo(6),
    uploadedBy: 'sheet-40404863',
    assignedUserIds: ['sheet-40912151', 'sheet-40907710'],
    difficulty: 'Beginner',
    tempo: 'Standard Scales',
  },
  {
    id: 'tune-6',
    title: 'Marsiyah Hymn No. 4',
    section: 'Saxophone',
    key: 'marsiyah_hymn_sax',
    pdfUrl: '/tunes/hai_tahani_notes.pdf',
    driveFileId: '1dr_sax_001',
    createdAt: daysAgo(5),
    uploadedBy: 'sheet-40409814',
    assignedUserIds: ['sheet-40409814', 'sheet-40408674', 'sheet-60475670'],
    difficulty: 'Intermediate',
    tempo: '100 BPM',
  },
  {
    id: 'tune-7',
    title: 'Salwaat Anthem Cadence',
    section: 'SideDrum',
    key: 'salwaat_cadence_drum',
    pdfUrl: '/tunes/trumpet_notation_notes.pdf',
    driveFileId: '1dr_drum_001',
    createdAt: daysAgo(2),
    uploadedBy: 'sheet-40405751',
    assignedUserIds: ['sheet-40405751', 'sheet-50447649', 'sheet-40405101'],
    difficulty: 'Advanced',
    tempo: '128 BPM',
  },
  {
    id: 'tune-8',
    title: 'Euphonium Bass Line - Chaman Tera',
    section: 'Euphonium',
    key: 'euph_chaman_tera',
    pdfUrl: '/tunes/burhandeen_chaman_tera_notes.pdf',
    driveFileId: '1dr_euph_001',
    createdAt: daysAgo(60),
    uploadedBy: 'sheet-40404034',
    assignedUserIds: ['sheet-40404034', 'sheet-40404390'],
    difficulty: 'Intermediate',
    tempo: '112 BPM',
  },
  {
    id: 'tune-9',
    title: 'Royal Procession Cymbals March',
    section: 'Dish',
    key: 'dish_procession_march',
    pdfUrl: '/tunes/hubbi_lakum_notes.pdf',
    driveFileId: '1dr_dish_001',
    createdAt: daysAgo(10),
    uploadedBy: 'sheet-40151901',
    assignedUserIds: ['sheet-40151901'],
    difficulty: 'Beginner',
    tempo: '116 BPM',
  },
];

export const INITIAL_LAVAJAM: LavajamRecord[] = [
  ...(members40 as User[])
    .filter(u => {
      const uname = (u.name || '').toUpperCase();
      if (uname.includes('ZOZWALA')) return false;
      if (uname.includes('HUSSAIN HANNANBHAI') || (uname.includes('HUSSAIN') && uname.includes('MULLAMITHAWALA'))) return false;
      return true;
    })
    .map((u, i) => {
      const isMufaddal = (u.name || '').toUpperCase().includes('VALINABU');
      return {
        id: `lav-${String(i + 1).padStart(3, '0')}`,
        date: '24/09/2026',
        userId: u.id,
        userName: u.name,
        fundType: 'Lavajam' as const,
        role: isMufaddal ? 'Major' : u.role,
        section: isMufaddal ? 'Major' : u.section,
        year: 2026,
        month: 'September',
        amount: 1000,
        status: 'Paid' as LavajamStatus,
        paidAt: daysAgo(2 + (i % 10)),
        paymentMethod: (i % 2 === 0 ? 'UPI' : 'Cash') as 'UPI' | 'Cash',
        transactionRef: i % 2 === 0 ? `UPI/202609/${100000 + i}` : undefined,
        receiptNo: `REC-2026-${String(i + 1).padStart(3, '0')}`,
        notes: 'Band uniform & maintenance contribution',
      };
    }),
  {
    id: 'lav-hoob-001',
    date: '24/09/2026',
    userName: 'Mohammad bhai jiruwala',
    fundType: 'Hoob' as const,
    section: 'External / Hoob',
    year: 2026,
    month: 'September',
    amount: 5253,
    status: 'Paid' as LavajamStatus,
    paidAt: daysAgo(1),
    paymentMethod: 'UPI',
    transactionRef: 'UPI/HOOB/525301',
    receiptNo: 'REC-2026-041',
    notes: 'Band sponsorship & Hoob contribution',
  },
  {
    id: 'lav-hoob-002',
    date: '24/09/2026',
    userName: 'Aliasgar happawala',
    fundType: 'Hoob' as const,
    section: 'External / Hoob',
    year: 2026,
    month: 'September',
    amount: 6000,
    status: 'Paid' as LavajamStatus,
    paidAt: daysAgo(1),
    paymentMethod: 'UPI',
    transactionRef: 'UPI/HOOB/600002',
    receiptNo: 'REC-2026-042',
    notes: 'Band sponsorship & Hoob contribution',
  },
  {
    id: 'lav-hoob-003',
    date: '24/09/2026',
    userName: 'Hozefa bhai kagdi',
    fundType: 'Hoob' as const,
    section: 'External / Hoob',
    year: 2026,
    month: 'September',
    amount: 8000,
    status: 'Paid' as LavajamStatus,
    paidAt: daysAgo(2),
    paymentMethod: 'Cash',
    receiptNo: 'REC-2026-043',
    notes: 'Band equipment donation & Hoob contribution',
  },
  {
    id: 'lav-hoob-004',
    date: '24/09/2026',
    userName: 'Hatim bhai gulgula',
    fundType: 'Hoob' as const,
    section: 'External / Hoob',
    year: 2026,
    month: 'September',
    amount: 10000,
    status: 'Paid' as LavajamStatus,
    paidAt: daysAgo(2),
    paymentMethod: 'Bank Transfer',
    transactionRef: 'NEFT/HOOB/100004',
    receiptNo: 'REC-2026-044',
    notes: 'Band Milad procession sponsorship & Hoob contribution',
  },
];

export interface ExpenseRecord {
  id: string;
  date: string;
  expenseDetails: string;
  amount: number;
  category?: string;
  notes?: string;
  createdAt?: string;
}

export const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-001',
    date: '24/09/2026',
    expenseDetails: 'Instument purchase',
    amount: 20500,
    category: 'Instruments',
    notes: 'New instrument acquisition for brass section',
    createdAt: daysAgo(3),
  },
  {
    id: 'exp-002',
    date: '24/09/2026',
    expenseDetails: 'Baner express',
    amount: 2500,
    category: 'Logistics',
    notes: 'Express banner printing for procession',
    createdAt: daysAgo(2),
  },
  {
    id: 'exp-003',
    date: '24/09/2026',
    expenseDetails: 'Instument purchase',
    amount: 1370,
    category: 'Maintenance',
    notes: 'Instrument accessories and valves maintenance',
    createdAt: daysAgo(1),
  },
];

export const INITIAL_ATTENDANCE_SESSIONS: AttendanceSession[] = [];
