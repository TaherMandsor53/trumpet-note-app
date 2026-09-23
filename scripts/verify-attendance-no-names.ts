import * as XLSX from 'xlsx';
import path from 'path';
import assert from 'assert';
import { syncAttendanceToExcelFile } from '../src/lib/google-sheets';

const excelPath = path.join(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');

console.log('=== TEST 1: UPDATING 23/09/2026 COLUMN (EXACT IMAGE FORMAT) ===');

// Check Initial State
const wb0 = XLSX.readFile(excelPath);
const rows0: any[][] = XLSX.utils.sheet_to_json(wb0.Sheets['Attendance Details'], { header: 1 });
console.log('Initial row count:', rows0.length);
console.log('Initial headers:', rows0[0]);
assert.strictEqual(rows0.length, 41, 'Must have exactly 41 rows (1 header + 40 members)');
assert.strictEqual(rows0[0][0], 'Full Name', 'Col 0 must be Full Name');
assert.strictEqual(rows0[0][1], '22/09/2026', 'Col 1 must be 22/09/2026');
assert.strictEqual(rows0[0][2], '23/09/2026', 'Col 2 must be 23/09/2026');

// 1. Mark attendance for 23/09/2026
const session23: any = {
  id: 'session-23-09',
  date: '2026-09-23',
  sessionTitle: 'Practice Attendance Session (23/09/2026)',
  sessionType: 'Regular Practice',
  markedBy: 'Overall Major',
  records: [
    { userName: 'BURHANUDDIN ABBASBHAI GULAMALI', status: 'Present' },
    { userName: 'TAHER SHABBIR SHIKARI', status: 'Present' },
    { userName: 'TAHA MAZHARBHAI KUNDAWALA', status: 'Late' },
    { userName: 'TAHER AKBARBHAI MANDSORWALA', status: 'Absent' },
    // Unknown name should be safely ignored
    { userName: 'Non Existing Member 999', status: 'Present' }
  ]
};

syncAttendanceToExcelFile(session23);

const wb1 = XLSX.readFile(excelPath);
const rows1: any[][] = XLSX.utils.sheet_to_json(wb1.Sheets['Attendance Details'], { header: 1 });
console.log('\nAfter marking 23/09/2026:');
console.log('Headers:', rows1[0]);
console.log('Row count:', rows1.length);
assert.strictEqual(rows1.length, 41, 'Row count must stay strictly 41 (no new rows/names added)');

const col23Idx = rows1[0].indexOf('23/09/2026');
assert.strictEqual(col23Idx, 2, '23/09/2026 must be column index 2 (Column C)');

console.log('Row 1 (BURHANUDDIN):', rows1[1][0], '| 22/09:', rows1[1][1], '| 23/09:', rows1[1][col23Idx]);
assert.strictEqual(rows1[1][col23Idx], 'Present', 'BURHANUDDIN 23/09 must be Present');

console.log('Row 2 (TAHER SHABBIR):', rows1[2][0], '| 22/09:', rows1[2][1], '| 23/09:', rows1[2][col23Idx]);
assert.strictEqual(rows1[2][col23Idx], 'Present', 'TAHER SHABBIR 23/09 must be Present');

console.log('Row 3 (TAHA MAZHARBHAI):', rows1[3][0], '| 22/09:', rows1[3][1], '| 23/09:', rows1[3][col23Idx]);
assert.strictEqual(rows1[3][col23Idx], 'Late', 'TAHA MAZHARBHAI 23/09 must be Late');

console.log('Row 4 (TAHER AKBARBHAI):', rows1[4][0], '| 22/09:', rows1[4][1], '| 23/09:', rows1[4][col23Idx]);
assert.strictEqual(rows1[4][col23Idx], 'Absent', 'TAHER AKBARBHAI 23/09 must be Absent');

console.log('\n=== TEST 2: FOR EVERY NEW DATE, ADD THAT DATE AS COLUMN HEADER ===');

const session24: any = {
  id: 'session-24-09',
  date: '2026-09-24',
  sessionTitle: 'Practice Attendance Session (24/09/2026)',
  sessionType: 'Regular Practice',
  markedBy: 'Overall Major',
  records: [
    { userName: 'BURHANUDDIN ABBASBHAI GULAMALI', status: 'Present' },
    { userName: 'HUSAIN JUJARBHAI MITHAIWALA', status: 'Late' }
  ]
};

syncAttendanceToExcelFile(session24);

const wb2 = XLSX.readFile(excelPath);
const rows2: any[][] = XLSX.utils.sheet_to_json(wb2.Sheets['Attendance Details'], { header: 1 });
console.log('After adding new date 24/09/2026:');
console.log('Headers:', rows2[0]);
console.log('Row count:', rows2.length);

assert.strictEqual(rows2.length, 41, 'Row count must stay strictly 41 (no names added)');
assert.strictEqual(rows2[0][3], '24/09/2026', 'New date 24/09/2026 must be added as Column D header (index 3)');

const col24Idx = rows2[0].indexOf('24/09/2026');
console.log('Row 1 (BURHANUDDIN) on 24/09:', rows2[1][col24Idx]);
assert.strictEqual(rows2[1][col24Idx], 'Present');

console.log('Row 40 (HUSAIN JUJARBHAI MITHAIWALA) on 24/09:', rows2[40][col24Idx]);
assert.strictEqual(rows2[40][col24Idx], 'Late');

console.log('\n>>> ALL TESTS PASSED SUCCESSFULLY! ONLY DATE COLUMNS UPDATED, NEW DATES ADDED AS HEADERS, ZERO NAMES/ITS ADDED! <<<');
