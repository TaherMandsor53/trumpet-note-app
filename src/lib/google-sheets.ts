import { User, Role, InstrumentSection, AttendanceSession } from '@/types/band';
import { getUsers, updateUserPassword, syncUsersWithSheet, getUserByUsernameOrEmail } from './db';

export interface GoogleSheetConfig {
  sheetUrl: string;
  sheetId: string;
  sheetName: string;
  accountEmail: string;
  appsScriptUrl?: string;
}

export function getGoogleSheetConfig(): GoogleSheetConfig {
  return {
    sheetUrl:
      process.env.GOOGLE_SHEET_URL ||
      'https://docs.google.com/spreadsheets/d/1OwHHmLqRnzYa930ii3lxCvK0030Uy5atIP161C-QVLs/edit?gid=0#gid=0',
    sheetId: process.env.GOOGLE_SHEET_ID || '1OwHHmLqRnzYa930ii3lxCvK0030Uy5atIP161C-QVLs',
    sheetName: process.env.GOOGLE_SHEET_NAME || 'Member Details',
    accountEmail: process.env.GOOGLE_ACCOUNT_EMAIL || 'taheriscoutgroupdahod@gmail.com',
    appsScriptUrl: process.env.GOOGLE_SHEET_APPS_SCRIPT_URL || '',
  };
}

/**
 * Parses raw CSV string into array of objects with normalized header keys
 */
function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseRow = (row: string): string[] => {
    const values: string[] = [];
    let insideQuotes = false;
    let currentVal = '';

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"' && (i === 0 || row[i - 1] !== '\\')) {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentVal.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
    return values;
  };

  const rawHeaders = parseRow(lines[0]);
  const headers = rawHeaders.map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

  const results: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseRow(lines[i]);
    if (rowValues.length === 0 || !rowValues.some(v => v.length > 0)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rowValues[idx] || '';
    });
    results.push(rowObj);
  }

  return results;
}

function getSheetProp(obj: any, ...keys: string[]): string {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
      return String(obj[k]).trim();
    }
  }
  const objKeys = Object.keys(obj);
  for (const k of keys) {
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedKey = objKeys.find(ok => ok.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanK);
    if (matchedKey && obj[matchedKey] !== undefined && obj[matchedKey] !== null && String(obj[matchedKey]).trim() !== '') {
      return String(obj[matchedKey]).trim();
    }
  }
  return '';
}

/**
 * Attempts to fetch live member details from Google Sheet.
 * Checks Apps Script Web App first, then public CSV export, falling back to initialized memory DB.
 */
export function normalizeSheetRoleAndSection(rawRole: string): { role: Role; section: InstrumentSection } {
  const r = (rawRole || '').trim().toLowerCase();

  // 1. Section Majors
  if (r.includes('sidedrum major') || r.includes('side drum major') || r.includes('sidedrum/basedrum major')) {
    return { role: 'SideDrum Major', section: 'SideDrum' };
  }
  if (r.includes('trumpet major')) {
    return { role: 'Trumpet Major', section: 'Trumpet' };
  }
  if (r.includes('saxophone major')) {
    return { role: 'Saxophone Major', section: 'Saxophone' };
  }
  if (r.includes('euphonium major')) {
    return { role: 'Euphonium Major', section: 'Euphonium' };
  }
  if (r.includes('dish major')) {
    return { role: 'Dish Major', section: 'Dish' };
  }
  if (r.includes('trombone major')) {
    return { role: 'Trombone Major', section: 'Trombone' };
  }

  // 2. Executive Leadership & Support
  if (r === 'major' || r.includes('overall major') || r.includes('band commander') || r.includes('band major')) {
    return { role: 'Major', section: 'Trumpet' };
  }
  if (r.includes('instrument maintainer') || r.includes('instrument maintenance')) {
    return { role: 'Instrument Maintainer', section: 'Trumpet' };
  }
  if (r.includes('treasurer')) {
    return { role: 'Treasurer', section: 'SideDrum' };
  }

  // 3. Specific Section Members
  if (r.includes('trumpet member')) {
    return { role: 'Trumpet Member', section: 'Trumpet' };
  }
  if (r.includes('saxophone member')) {
    return { role: 'Saxophone Member', section: 'Saxophone' };
  }
  if (r.includes('euphonium member')) {
    return { role: 'Euphonium Member', section: 'Euphonium' };
  }
  if (r.includes('trombone member')) {
    return { role: 'Trombone Member', section: 'Trombone' };
  }
  if (r.includes('ghugara member') || r.includes('ghugara')) {
    return { role: 'Ghugara Member', section: 'Dish' };
  }
  if (r.includes('triangle member') || r.includes('triangle')) {
    return { role: 'Triangle Member', section: 'Dish' };
  }
  if (r.includes('khanjari member') || r.includes('khanjari')) {
    return { role: 'Khanjari Member', section: 'Dish' };
  }
  if (r.includes('dish member')) {
    return { role: 'Dish Member', section: 'Dish' };
  }
  if (r.includes('basedrum member') || r.includes('base drum member') || r.includes('basedrum') || r.includes('base drum')) {
    return { role: 'BaseDrum Member', section: 'SideDrum' };
  }
  if (r.includes('sidedrum member') || r.includes('side drum member')) {
    return { role: 'SideDrum Member', section: 'SideDrum' };
  }

  // 4. Broad instrument fallbacks
  if (r.includes('trumpet')) {
    return { role: 'Trumpet Member', section: 'Trumpet' };
  }
  if (r.includes('saxophone')) {
    return { role: 'Saxophone Member', section: 'Saxophone' };
  }
  if (r.includes('euphonium')) {
    return { role: 'Euphonium Member', section: 'Euphonium' };
  }
  if (r.includes('trombone')) {
    return { role: 'Trombone Member', section: 'Trombone' };
  }
  if (r.includes('dish') || r.includes('cymbal')) {
    return { role: 'Dish Member', section: 'Dish' };
  }
  if (r.includes('sidedrum') || r.includes('side drum') || r.includes('three drum') || r.includes('snare') || r.includes('drum')) {
    return { role: 'SideDrum Member', section: 'SideDrum' };
  }

  return { role: 'Trumpet Member', section: 'Trumpet' };
}

/**
 * Attempts to fetch live member details from Google Sheet.
 * Checks Apps Script Web App first, then public CSV export, falling back to initialized memory DB.
 */
export async function syncMemberDetailsFromSheet(): Promise<{
  success: boolean;
  count: number;
  source: 'apps_script' | 'csv_export' | 'database_cache';
  message: string;
}> {
  const config = getGoogleSheetConfig();

  // 1. Try Google Apps Script Web App if URL is configured
  if (config.appsScriptUrl) {
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        const records = Array.isArray(data) ? data : data.members || data.data || [];
        if (records.length > 0) {
          const mappedUsers: User[] = records.map((r: any, index: number) => {
            const rawRole = getSheetProp(r, 'Role', 'role', '6. Select Your Instruments ', 'Select Your Instruments');
            const { role, section } = normalizeSheetRoleAndSection(rawRole);
            const itsNumber = getSheetProp(r, 'Its number', '1. Its number ', 'itsNumber', 'itsnumber', 'ItsNumber');
            const name = getSheetProp(r, 'Full Name', '2. Full Name', 'name', 'Name', 'fullName', 'FullName') || 'Band Member';
            const username = getSheetProp(r, 'UserName', '7. UserName', 'username', 'Username');
            const email = getSheetProp(r, 'Email', 'email') || (username.includes('@') ? username : `${username || 'member'}@tsgband.com`);
            const password = getSheetProp(r, 'Password', '8. Password', 'password', 'Password') || '786110515253';
            const phone = getSheetProp(r, 'Mobile Number', '4. Mobile Number', 'phone', 'Phone', 'mobileNumber');
            const address = getSheetProp(r, 'Address', '3. Address', 'address', 'Address');
            const jamaat = getSheetProp(r, 'Jamaat', '5. Jamaat', 'jamaat', 'Jamaat');

            return {
              id: itsNumber ? `sheet-${itsNumber}` : (r.id || `sheet-user-${index + 1}`),
              itsNumber,
              name,
              username,
              email,
              password,
              role,
              section,
              phone,
              address,
              jamaat,
              rank: r.rank || r.Rank || `${role}`,
              joinedDate: r.joinedDate || new Date().toISOString().split('T')[0],
              active: r.active !== undefined ? Boolean(r.active) : true,
            };
          });

          syncUsersWithSheet(mappedUsers);
          return {
            success: true,
            count: mappedUsers.length,
            source: 'apps_script',
            message: `Successfully synced ${mappedUsers.length} members from Google Sheet via Apps Script Web App.`,
          };
        }
      }
    } catch (err) {
      console.warn('Google Apps Script fetch failed, attempting CSV fallback:', err);
    }
  }

  // 2. Try fetching public CSV export of the sheet
  const csvUrls = [
    `https://docs.google.com/spreadsheets/d/${config.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(config.sheetName)}`,
    `https://docs.google.com/spreadsheets/d/${config.sheetId}/export?format=csv&gid=0`,
  ];

  for (const url of csvUrls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (response.ok) {
        const text = await response.text();
        // Check if response is HTML login redirect
        if (!text.includes('<!DOCTYPE html>') && !text.includes('accounts.google.com')) {
          const parsedRows = parseCsv(text);
          if (parsedRows.length > 0) {
            const mappedUsers: User[] = parsedRows.map((r, index) => {
              const itsNumber = r.itsnumber || r.its || '';
              const username = (r.username || r.user || r.userid || r.email || '').trim();
              const email = (r.email || r.mail || username).trim();
              const name = r.fullname || r.name || r.membername || 'Band Member';
              const password = (r.password || r.pass || '786110515253').trim();
              const rawRole = r.role || '';
              const { role, section } = normalizeSheetRoleAndSection(rawRole);
              const phone = r.mobilenumber || r.mobile || r.phone || r.contact || '';
              const address = r.address || '';
              const jamaat = r.jamaat || '';

              return {
                id: itsNumber ? `sheet-${itsNumber}` : `sheet-user-${index + 1}`,
                itsNumber,
                name,
                username,
                email,
                password,
                role,
                section,
                phone,
                address,
                jamaat,
                rank: r.rank || `${section} Musician`,
                joinedDate: r.joineddate || new Date().toISOString().split('T')[0],
                active: r.active ? r.active.toLowerCase() === 'true' || r.active === '1' : true,
              };
            });

            syncUsersWithSheet(mappedUsers);
            return {
              success: true,
              count: mappedUsers.length,
              source: 'csv_export',
              message: `Successfully synced ${mappedUsers.length} members from Google Sheet CSV export.`,
            };
          }
        }
      }
    } catch (err) {
      // Continue to next fallback
    }
  }

  // 3. Fallback to cached active database roster
  const cachedUsers = getUsers();
  return {
    success: true,
    count: cachedUsers.length,
    source: 'database_cache',
    message: `Connected to Member Details directory (${cachedUsers.length} members active).`,
  };
}

/**
 * Updates a member's password.
 * 1. Updates password in local database memory.
 * 2. If Google Apps Script Web App URL is configured, dispatches update directly to the Google Sheet.
 */
export async function updateMemberPassword(
  usernameOrEmail: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
  sheetSynced: boolean;
}> {
  const localUpdated = updateUserPassword(usernameOrEmail, newPassword);
  if (!localUpdated) {
    return {
      success: false,
      message: `User '${usernameOrEmail}' not found in Member Details directory.`,
      sheetSynced: false,
    };
  }

  // Update password in local Excel sheet (Member Details and Responses)
  updatePasswordInExcelFile(usernameOrEmail, newPassword);

  const config = getGoogleSheetConfig();
  let sheetSynced = false;

  // If Apps Script Web App URL is present, send the update
  if (config.appsScriptUrl) {
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          action: 'updatePassword',
          sheetName: config.sheetName,
          username: usernameOrEmail,
          newPassword: newPassword,
        }),
      });

      if (response.ok) {
        sheetSynced = true;
      }
    } catch (err) {
      console.warn('Failed to post password update to Google Apps Script:', err);
    }
  }

  return {
    success: true,
    message: sheetSynced
      ? `Password successfully updated in Member Details Google Sheet, local Excel, and application database.`
      : `Password successfully updated for ${usernameOrEmail} in Member Details and local Excel.`,
    sheetSynced,
  };
}

/**
 * Updates a member's password in Member Details and Responses sheets in the local Excel file
 */
export function updatePasswordInExcelFile(identifier: string, newPassword: string): void {
  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const XLSX = require('xlsx');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const excelPath = path.join(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return;

      const wb = XLSX.readFile(excelPath);
      const cleanId = String(identifier || '').trim().toLowerCase();
      const cleanDigits = String(identifier || '').trim().replace(/\D/g, '');

      const user = getUserByUsernameOrEmail(cleanId);
      const userIts = user?.itsNumber ? String(user.itsNumber).trim() : cleanDigits;
      const userName = user?.name ? String(user.name).trim().toLowerCase() : '';
      const userUName = user?.username ? String(user.username).trim().toLowerCase() : cleanId;

      const targetSheets = ['Member Details', 'Responses'];
      let modified = false;

      targetSheets.forEach(sheetName => {
        if (!wb.Sheets[sheetName]) return;
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (rawRows.length < 2) return;

        const headerRow = rawRows[0];
        let passColIndex = headerRow.findIndex((h: any) =>
          String(h || '').toLowerCase().includes('pass')
        );
        let userColIndex = headerRow.findIndex((h: any) =>
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
            (userIts && (rowIts === userIts || (cleanDigits && rowIts === cleanDigits))) ||
            (userUName && (rowUser === userUName || rowUser.includes(userUName))) ||
            (userName && rowName === userName) ||
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
    } catch (e) {
      console.warn('Could not update password in local Excel file:', e);
    }
  }
}

/**
 * Synchronizes attendance records to the Attendance Details sheet in the local Excel file
 * Records Present, Absent, or Late for each member under the session date column.
 */
export function syncAttendanceToExcelFile(session: AttendanceSession): void {
  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const XLSX = require('xlsx');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const excelPath = path.join(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return;

      const wb = XLSX.readFile(excelPath);
      const sheetName = 'Attendance Details';

      // Format date as DD/MM/YYYY
      const rawDate = session.date.includes('T') ? session.date.split('T')[0] : session.date;
      const parts = rawDate.split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : rawDate;

      let ws = wb.Sheets[sheetName];
      let rows: any[][] = [];

      if (ws) {
        rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      }

      // Filter out empty rows
      const cleanRows: any[][] = [];
      for (const r of rows) {
        if (r && Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== '')) {
          cleanRows.push([...r]);
        }
      }

      // If sheet is empty or new, build initial base rows using current members
      if (cleanRows.length === 0) {
        cleanRows.push(['ITS Number', 'Member Name', 'Section', formattedDate]);
        const allUsers = getUsers();
        allUsers.forEach(u => {
          cleanRows.push([u.itsNumber || '', u.name, u.section || '']);
        });
      }

      // Header row
      const headerRow = cleanRows[0];

      // Find or append date column
      let dateColIndex = headerRow.findIndex((h: any) => {
        const s = String(h || '').trim();
        return s === formattedDate || s === rawDate;
      });

      if (dateColIndex === -1) {
        dateColIndex = headerRow.length;
        headerRow.push(formattedDate);
      }

      // Build member index map
      const memberRowMap: Record<string, number> = {};
      for (let i = 1; i < cleanRows.length; i++) {
        const its = String(cleanRows[i][0] || '').trim();
        const name = String(cleanRows[i][1] || '').trim().toLowerCase();
        if (its) memberRowMap['its:' + its] = i;
        if (name) memberRowMap['name:' + name] = i;
      }

      // Update attendance status for each record in session
      session.records.forEach(rec => {
        const recName = String(rec.userName || '').trim();
        const recNameKey = recName.toLowerCase();
        const recIts = String(rec.userId || '').replace(/^sheet-/, '').trim();
        const statusVal = rec.status; // 'Present' | 'Absent' | 'Late'

        let targetRowIndex = memberRowMap['its:' + recIts] || memberRowMap['name:' + recNameKey];

        if (!targetRowIndex) {
          // If member is not yet in Attendance Details, add new member row
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
          // Pad row if needed
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
    } catch (e) {
      console.warn('Could not sync attendance to local Excel file:', e);
    }
  }
}

/**
 * Synchronizes newly marked practice attendance to Google Sheets and local Excel ("Attendance Details" sheet).
 * At top marks the session date, and records Present, Absent, or Late for each member.
 */
export async function syncAttendanceToSheet(session: AttendanceSession): Promise<{
  success: boolean;
  message: string;
  sheetSynced: boolean;
}> {
  // 1. Sync to local Excel Attendance Details sheet
  syncAttendanceToExcelFile(session);

  const config = getGoogleSheetConfig();
  const rawDate = session.date.includes('T') ? session.date.split('T')[0] : session.date;
  const parts = rawDate.split('-');
  const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : rawDate;

  if (!config.appsScriptUrl) {
    return {
      success: true,
      message: `Attendance for ${formattedDate} saved to local database and Excel sheet.`,
      sheetSynced: false,
    };
  }

  // 2. Sync to Google Apps Script if URL is configured
  try {
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({
        action: 'updateAttendance',
        sheetName: 'Attendance Details',
        date: formattedDate,
        rawDate,
        sessionTitle: session.sessionTitle,
        sessionType: session.sessionType,
        markedBy: session.markedBy,
        records: session.records.map(r => ({
          userId: r.userId,
          name: r.userName,
          section: r.section,
          status: r.status, // 'Present' | 'Absent' | 'Late'
          notes: r.notes || '',
        })),
      }),
    });

    if (response.ok) {
      return {
        success: true,
        message: `Successfully synchronized attendance for ${formattedDate} to Attendance Details sheet in Google Drive and local Excel.`,
        sheetSynced: true,
      };
    }
  } catch (err) {
    console.warn('Failed to sync attendance to Google Apps Script:', err);
  }

  return {
    success: true,
    message: `Attendance for ${formattedDate} saved to local database and Excel sheet.`,
    sheetSynced: false,
  };
}

/**
 * Appends or updates a member row in the local Excel sheet (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx)
 * Ensures all blank rows are removed and the record is inserted at the exact last record.
 * Includes UserName and Password columns.
 */
export function appendMemberToExcelFile(user: User): void {
  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const XLSX = require('xlsx');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const excelPath = path.join(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (fs.existsSync(excelPath)) {
        const wb = XLSX.readFile(excelPath);
        const targetSheets = ['Responses', 'Member Details'];

        targetSheets.forEach(sheetName => {
          const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

          // Clean out trailing and interior blank rows
          const cleanRows: any[][] = [];
          for (let i = 0; i < rawRows.length; i++) {
            const r = rawRows[i];
            if (r && Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== '')) {
              cleanRows.push([...r]);
            }
          }

          if (cleanRows.length === 0) {
            cleanRows.push([
              'S.NO',
              '1. Its number ',
              '2. Full Name',
              '3. Address',
              '4. Mobile Number',
              '5. Jamaat',
              '6. Select Your Instruments ',
              '7. UserName',
              '8. Password',
            ]);
          } else {
            // Ensure headers have UserName and Password columns
            const header = cleanRows[0];
            let userCol = header.findIndex((h: any) => String(h || '').toLowerCase().includes('user'));
            let passCol = header.findIndex((h: any) => String(h || '').toLowerCase().includes('pass'));
            if (userCol === -1) header.push('7. UserName');
            if (passCol === -1) header.push('8. Password');
          }

          const header = cleanRows[0];
          const userCol = header.findIndex((h: any) => String(h || '').toLowerCase().includes('user'));
          const passCol = header.findIndex((h: any) => String(h || '').toLowerCase().includes('pass'));

          // Check if member already exists (by itsNumber or name)
          const userIts = String(user.itsNumber || '').trim();
          const userName = String(user.name || '').trim().toLowerCase();
          let existingIndex = -1;

          for (let i = 1; i < cleanRows.length; i++) {
            const rowIts = String(cleanRows[i][1] || '').trim();
            const rowName = String(cleanRows[i][2] || '').trim().toLowerCase();
            if ((userIts && rowIts === userIts) || (userName && rowName === userName)) {
              existingIndex = i;
              break;
            }
          }

          const userPassword = user.password || '786110515253';
          const usernameVal = user.username || user.email || '';

          if (existingIndex > 0) {
            // Update existing record in place
            cleanRows[existingIndex][1] = user.itsNumber || cleanRows[existingIndex][1];
            cleanRows[existingIndex][2] = user.name || cleanRows[existingIndex][2];
            cleanRows[existingIndex][3] = user.address || cleanRows[existingIndex][3];
            cleanRows[existingIndex][4] = user.phone || cleanRows[existingIndex][4];
            cleanRows[existingIndex][5] = user.jamaat || cleanRows[existingIndex][5];
            cleanRows[existingIndex][6] = user.role || user.section || cleanRows[existingIndex][6];
            if (userCol !== -1) cleanRows[existingIndex][userCol] = usernameVal || cleanRows[existingIndex][userCol] || '';
            if (passCol !== -1) cleanRows[existingIndex][passCol] = userPassword || cleanRows[existingIndex][passCol] || '';
          } else {
            // Append as the exact next record at the end of the sheet
            const nextSNo = cleanRows.length; // Row 0 is header, so length is next sequential S.NO
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
          }

          const newWs = XLSX.utils.aoa_to_sheet(cleanRows);
          wb.Sheets[sheetName] = newWs;
          if (!wb.SheetNames.includes(sheetName)) {
            wb.SheetNames.push(sheetName);
          }
        });

        XLSX.writeFile(wb, excelPath);
      }
    } catch (e) {
      console.warn('Could not append member to local Excel file:', e);
    }
  }
}

/**
 * Updates an existing member in the local Excel sheet (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx)
 */
export function updateMemberInExcelFile(user: User): void {
  appendMemberToExcelFile(user);
}

/**
 * Deletes a member from the local Excel sheet and re-indexes S.NO
 */
export function deleteMemberFromExcelFile(itsNumberOrName: string): void {
  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const XLSX = require('xlsx');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const excelPath = path.join(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (fs.existsSync(excelPath)) {
        const wb = XLSX.readFile(excelPath);
        const sheetName = wb.SheetNames[0] || 'Responses';
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const target = String(itsNumberOrName || '').trim().toLowerCase();
        const cleanRows: any[][] = [];
        let deleted = false;

        for (let i = 0; i < rawRows.length; i++) {
          const r = rawRows[i];
          if (!r || !Array.isArray(r) || !r.some(c => c !== undefined && c !== null && String(c).trim() !== '')) {
            continue;
          }
          if (i === 0) {
            cleanRows.push([...r]);
            continue;
          }
          const rowIts = String(r[1] || '').trim().toLowerCase();
          const rowName = String(r[2] || '').trim().toLowerCase();
          if (!deleted && (rowIts === target || rowName === target)) {
            deleted = true;
            continue; // Skip this row to delete it
          }
          cleanRows.push([...r]);
        }

        if (deleted) {
          // Re-sequence S.NO column (col 0)
          for (let i = 1; i < cleanRows.length; i++) {
            cleanRows[i][0] = i;
          }
          const newWs = XLSX.utils.aoa_to_sheet(cleanRows);
          wb.Sheets[sheetName] = newWs;
          if (wb.Sheets['Member Details']) {
            wb.Sheets['Member Details'] = newWs;
          }
          XLSX.writeFile(wb, excelPath);
        }
      }
    } catch (e) {
      console.warn('Could not delete member from local Excel file:', e);
    }
  }
}

/**
 * Registers new member to Member Details sheet in Excel and Google Drive
 */
export async function addMemberToGoogleSheet(user: User): Promise<{
  success: boolean;
  sheetSynced: boolean;
  message: string;
}> {
  appendMemberToExcelFile(user);
  const config = getGoogleSheetConfig();
  let sheetSynced = false;

  if (config.appsScriptUrl) {
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          action: 'addMember',
          sheetName: config.sheetName || 'Member Details',
          member: {
            itsNumber: user.itsNumber || '',
            name: user.name,
            username: user.username,
            email: user.email,
            password: user.password,
            role: user.role,
            section: user.section,
            phone: user.phone || '',
            address: user.address || '',
            jamaat: user.jamaat || '',
            rank: user.rank || user.role,
          },
        }),
      });

      if (response.ok) {
        sheetSynced = true;
      }
    } catch (err) {
      console.warn('Failed to post new member to Google Apps Script:', err);
    }
  }

  return {
    success: true,
    sheetSynced,
    message: sheetSynced
      ? 'Member successfully recorded in Member Details sheet in Google Drive and local Excel.'
      : 'Member registered into official roster and local Excel sheet.',
  };
}

/**
 * Updates member in Member Details sheet in Excel and Google Drive
 */
export async function updateMemberInGoogleSheet(user: User): Promise<{
  success: boolean;
  sheetSynced: boolean;
  message: string;
}> {
  updateMemberInExcelFile(user);
  const config = getGoogleSheetConfig();
  let sheetSynced = false;

  if (config.appsScriptUrl) {
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          action: 'editMember',
          sheetName: config.sheetName || 'Member Details',
          member: {
            itsNumber: user.itsNumber || '',
            name: user.name,
            username: user.username,
            email: user.email,
            password: user.password,
            role: user.role,
            section: user.section,
            phone: user.phone || '',
            address: user.address || '',
            jamaat: user.jamaat || '',
            rank: user.rank || user.role,
          },
        }),
      });

      if (response.ok) {
        sheetSynced = true;
      }
    } catch (err) {
      console.warn('Failed to post member update to Google Apps Script:', err);
    }
  }

  return {
    success: true,
    sheetSynced,
    message: sheetSynced
      ? 'Member updated in Member Details sheet in Google Drive and local Excel.'
      : 'Member updated in official roster and local Excel sheet.',
  };
}

/**
 * Deletes member in Member Details sheet in Excel and Google Drive
 */
export async function deleteMemberFromGoogleSheet(userOrId: {
  itsNumber?: string;
  name?: string;
  id?: string;
}): Promise<{
  success: boolean;
  sheetSynced: boolean;
  message: string;
}> {
  if (userOrId.itsNumber || userOrId.name) {
    deleteMemberFromExcelFile(userOrId.itsNumber || userOrId.name || '');
  }
  const config = getGoogleSheetConfig();
  let sheetSynced = false;

  if (config.appsScriptUrl) {
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          action: 'deleteMember',
          sheetName: config.sheetName || 'Member Details',
          itsNumber: userOrId.itsNumber || '',
          name: userOrId.name || '',
        }),
      });

      if (response.ok) {
        sheetSynced = true;
      }
    } catch (err) {
      console.warn('Failed to post delete member to Google Apps Script:', err);
    }
  }

  return {
    success: true,
    sheetSynced,
    message: sheetSynced
      ? 'Member deleted from Member Details sheet in Google Drive and local Excel.'
      : 'Member deleted from official roster and local Excel sheet.',
  };
}
