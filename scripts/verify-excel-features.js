const assert = require('assert');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const excelPath = path.join(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
console.log('--- 1. Testing Excel Initial State ---');
assert.ok(fs.existsSync(excelPath), 'Excel file must exist');

const wb = XLSX.readFile(excelPath);
assert.ok(wb.SheetNames.includes('Member Details'), 'Member Details sheet must exist');
assert.ok(wb.SheetNames.includes('Attendance Details'), 'Attendance Details sheet must exist');
console.log('Sheets present:', wb.SheetNames);

// 2. Test Password Update in Excel
console.log('\n--- 2. Testing Password Update in Excel ---');

function updatePasswordInExcelFile(identifier, newPassword) {
  const wb = XLSX.readFile(excelPath);
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanDigits = String(identifier || '').trim().replace(/\D/g, '');

  const targetSheets = ['Member Details', 'Responses'];
  let modified = false;

  targetSheets.forEach(sheetName => {
    if (!wb.Sheets[sheetName]) return;
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rawRows.length < 2) return;

    const headerRow = rawRows[0];
    let passColIndex = headerRow.findIndex(h =>
      String(h || '').toLowerCase().includes('pass')
    );
    let userColIndex = headerRow.findIndex(h =>
      String(h || '').toLowerCase().includes('user')
    );

    if (userColIndex === -1) {
      userColIndex = headerRow.length;
      headerRow.push('7. UserName');
    }
    if (passColIndex === -1) {
      passColIndex = headerRow.length;
      headerRow.push('8. Password');
    }

    for (let i = 1; i < rawRows.length; i++) {
      const r = rawRows[i];
      if (!r || !Array.isArray(r) || r.length === 0) continue;
      const rowIts = String(r[1] || '').trim();
      const rowName = String(r[2] || '').trim().toLowerCase();
      const rowUser = userColIndex !== -1 ? String(r[userColIndex] || '').trim().toLowerCase() : '';

      const match =
        (cleanDigits && rowIts === cleanDigits) ||
        (cleanId && (rowUser === cleanId || rowName === cleanId));

      if (match) {
        while (r.length <= passColIndex) {
          r.push('');
        }
        r[passColIndex] = newPassword;
        modified = true;
        break;
      }
    }

    const newWs = XLSX.utils.aoa_to_sheet(rawRows);
    wb.Sheets[sheetName] = newWs;
  });

  if (modified) {
    XLSX.writeFile(wb, excelPath);
  }
}

// Test updating password for BURHANUDDIN ABBASBHAI GULAMALI (40405751)
const newTestPass = 'newPassword786!';
updatePasswordInExcelFile('40405751', newTestPass);

const wbAfterPass = XLSX.readFile(excelPath);
const memRows = XLSX.utils.sheet_to_json(wbAfterPass.Sheets['Member Details'], { header: 1 });
const burhanRow = memRows.find(r => r && String(r[1]).trim() === '40405751');
assert.ok(burhanRow, 'Burhan row must exist');
console.log('Burhan row after password update:', burhanRow);
assert.strictEqual(burhanRow[8], newTestPass, 'Password in Excel column 8 must match new password');
console.log('✓ Password update in Excel passed!');

// Restore original password
updatePasswordInExcelFile('40405751', '786110515253');

// 3. Test Attendance Sync in Excel
console.log('\n--- 3. Testing Attendance Sync in Excel ---');

function syncAttendanceToExcelFile(session) {
  const wb = XLSX.readFile(excelPath);
  const sheetName = 'Attendance Details';

  const rawDate = session.date.includes('T') ? session.date.split('T')[0] : session.date;
  const parts = rawDate.split('-');
  const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : rawDate;

  let ws = wb.Sheets[sheetName];
  let rows = [];

  if (ws) {
    rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  }

  const cleanRows = [];
  for (const r of rows) {
    if (r && Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== '')) {
      cleanRows.push([...r]);
    }
  }

  if (cleanRows.length === 0) {
    cleanRows.push(['ITS Number', 'Member Name', 'Section', formattedDate]);
  }

  const headerRow = cleanRows[0];
  let dateColIndex = headerRow.findIndex(h => {
    const s = String(h || '').trim();
    return s === formattedDate || s === rawDate;
  });

  if (dateColIndex === -1) {
    dateColIndex = headerRow.length;
    headerRow.push(formattedDate);
  }

  const memberRowMap = {};
  for (let i = 1; i < cleanRows.length; i++) {
    const its = String(cleanRows[i][0] || '').trim();
    const name = String(cleanRows[i][1] || '').trim().toLowerCase();
    if (its) memberRowMap['its:' + its] = i;
    if (name) memberRowMap['name:' + name] = i;
  }

  session.records.forEach(rec => {
    const recName = String(rec.userName || '').trim();
    const recNameKey = recName.toLowerCase();
    const recIts = String(rec.userId || '').replace(/^sheet-/, '').trim();
    const statusVal = rec.status;

    let targetRowIndex = memberRowMap['its:' + recIts] || memberRowMap['name:' + recNameKey];

    if (!targetRowIndex) {
      const newRow = [recIts || '', recName, rec.section || ''];
      while (newRow.length < dateColIndex) {
        newRow.push('');
      }
      newRow[dateColIndex] = statusVal;
      cleanRows.push(newRow);
      targetRowIndex = cleanRows.length - 1;
      if (recIts) memberRowMap['its:' + recIts] = targetRowIndex;
      if (recNameKey) memberRowMap['name:' + recNameKey] = targetRowIndex;
    } else {
      while (cleanRows[targetRowIndex].length <= dateColIndex) {
        cleanRows[targetRowIndex].push('');
      }
      cleanRows[targetRowIndex][dateColIndex] = statusVal;
    }
  });

  const newWs = XLSX.utils.aoa_to_sheet(cleanRows);
  wb.Sheets[sheetName] = newWs;
  if (!wb.SheetNames.includes(sheetName)) {
    wb.SheetNames.push(sheetName);
  }

  XLSX.writeFile(wb, excelPath);
}

const testDate = '2026-09-23';
const testSession = {
  id: 'test-session-1',
  date: testDate,
  sessionTitle: 'Special Practice Session',
  sessionType: 'Regular Practice',
  markedBy: 'Overall Major',
  records: [
    { userId: '40405751', userName: 'BURHANUDDIN ABBASBHAI GULAMALI', section: 'SideDrum', status: 'Present' },
    { userId: '40912151', userName: 'Taher Shabbir Shikari', section: 'Trumpet', status: 'Absent' },
    { userId: '50447649', userName: 'TAHA MAZHARBHAI KUNDAWALA', section: 'SideDrum', status: 'Late' },
  ],
};

syncAttendanceToExcelFile(testSession);

const wbAfterAtt = XLSX.readFile(excelPath);
const attRows = XLSX.utils.sheet_to_json(wbAfterAtt.Sheets['Attendance Details'], { header: 1 });
console.log('Attendance headers:', attRows[0]);
assert.ok(attRows[0].includes('23/09/2026'), 'Date column 23/09/2026 must exist in Attendance Details');
const dateCol = attRows[0].indexOf('23/09/2026');

const rowBurhan = attRows.find(r => r && String(r[0]).trim() === '40405751');
const rowTaher = attRows.find(r => r && String(r[0]).trim() === '40912151');
const rowTaha = attRows.find(r => r && String(r[0]).trim() === '50447649');

console.log('Burhan attendance (23/09/2026):', rowBurhan[dateCol]);
console.log('Taher attendance (23/09/2026):', rowTaher[dateCol]);
console.log('Taha attendance (23/09/2026):', rowTaha[dateCol]);

assert.strictEqual(rowBurhan[dateCol], 'Present', 'Burhan status must be Present');
assert.strictEqual(rowTaher[dateCol], 'Absent', 'Taher status must be Absent');
assert.strictEqual(rowTaha[dateCol], 'Late', 'Taha status must be Late');

console.log('✓ Attendance sync in Excel passed!');

// 4. Test Append New Member with Generated Password
console.log('\n--- 4. Testing Append Member with Password ---');

function appendMemberToExcelFile(user) {
  const wb = XLSX.readFile(excelPath);
  const targetSheets = ['Responses', 'Member Details'];

  targetSheets.forEach(sheetName => {
    const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const cleanRows = [];
    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      if (r && Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== '')) {
        cleanRows.push([...r]);
      }
    }

    const header = cleanRows[0];
    const userCol = header.findIndex(h => String(h || '').toLowerCase().includes('user'));
    const passCol = header.findIndex(h => String(h || '').toLowerCase().includes('pass'));

    const userPassword = user.password || '786110515253';
    const usernameVal = user.username || user.email || '';

    const nextSNo = cleanRows.length;
    const newRow = [
      nextSNo,
      user.itsNumber || '',
      user.name || '',
      user.address || '',
      user.phone || '',
      user.jamaat || '',
      user.role || user.section || '',
      usernameVal,
      userPassword,
    ];
    cleanRows.push(newRow);

    const newWs = XLSX.utils.aoa_to_sheet(cleanRows);
    wb.Sheets[sheetName] = newWs;
  });

  XLSX.writeFile(wb, excelPath);
}

const testNewMember = {
  itsNumber: '99990001',
  name: 'Huzefa Test Musician',
  address: 'Test Mohalla',
  phone: '9898000000',
  jamaat: 'BADRI SECTOR',
  role: 'Trumpet Member',
  section: 'Trumpet',
  username: 'huzefaMusician@tsgband.com',
  password: 'huzefamusician123',
};

appendMemberToExcelFile(testNewMember);

const wbAfterNew = XLSX.readFile(excelPath);
const rowsAfterNew = XLSX.utils.sheet_to_json(wbAfterNew.Sheets['Member Details'], { header: 1 });
const lastRow = rowsAfterNew[rowsAfterNew.length - 1];
console.log('Newly appended last row in Excel:', lastRow);

assert.strictEqual(String(lastRow[1]).trim(), '99990001');
assert.strictEqual(lastRow[2], 'Huzefa Test Musician');
assert.strictEqual(lastRow[7], 'huzefaMusician@tsgband.com');
assert.strictEqual(lastRow[8], 'huzefamusician123');

// Clean up test member from Excel
function deleteMemberFromExcelFile(itsNumber) {
  const wb = XLSX.readFile(excelPath);
  const targetSheets = ['Responses', 'Member Details'];
  targetSheets.forEach(sheetName => {
    if (!wb.Sheets[sheetName]) return;
    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    const cleanRows = [rawRows[0]];
    for (let i = 1; i < rawRows.length; i++) {
      if (String(rawRows[i][1]).trim() !== itsNumber) {
        cleanRows.push(rawRows[i]);
      }
    }
    for (let i = 1; i < cleanRows.length; i++) cleanRows[i][0] = i;
    wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(cleanRows);
  });
  XLSX.writeFile(wb, excelPath);
}

deleteMemberFromExcelFile('99990001');
const wbCleaned = XLSX.readFile(excelPath);
const cleanedRows = XLSX.utils.sheet_to_json(wbCleaned.Sheets['Member Details'], { header: 1 });
console.log('Rows count after cleanup:', cleanedRows.length);
assert.ok(!cleanedRows.some(r => r && String(r[1]).trim() === '99990001'), 'Test member should be removed');

console.log('\n✓ All Excel verification tests PASSED successfully!');
