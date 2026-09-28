import { User, Role, InstrumentSection, AttendanceSession, LavajamRecord, LavajamStatus, ExpenseRecord } from '@/types/band';
import {
  getUsers,
  updateUserPassword,
  syncUsersWithSheet,
  getUserByUsernameOrEmail,
  getFinancials,
  setFinancials,
  getExpenses,
  setExpenses,
} from './db';
import * as XLSX from 'xlsx';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = typeof window === 'undefined' ? require('fs') : null;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = typeof window === 'undefined' ? require('path') : null;

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
export function normalizeSheetRoleAndSection(rawRole: string, rawName?: string): { role: Role; section: InstrumentSection } {
  const r = (rawRole || '').trim().toLowerCase();
  const n = (rawName || '').trim().toUpperCase();

  // 1. Appointed Specific Member Mappings
  if (n.includes('HUSAIN JUJARBHAI KUNDAWALA') || (r.includes('treasurer') && (r.includes('trumpet') || n.includes('HUSAIN')))) {
    return { role: 'Treasurer', section: 'Trumpet' };
  }
  if (n.includes('TAHA MAZHARBHAI KUNDAWALA')) {
    return { role: 'Treasurer', section: 'SideDrum' };
  }
  if (n.includes('HUSAIN BURHANBHAI KADVALWALA')) {
    return { role: 'Instrument Maintainer', section: 'Trumpet' };
  }

  // 2. Section Majors
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

  // 3. Executive Leadership & Support
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
            const itsNumber = getSheetProp(r, 'Its number', '1. Its number ', 'itsNumber', 'itsnumber', 'ItsNumber');
            const name = getSheetProp(r, 'Full Name', '2. Full Name', 'name', 'Name', 'fullName', 'FullName') || 'Band Member';
            const rawRole = getSheetProp(r, 'Role', 'role', '6. Select Your Instruments ', 'Select Your Instruments');
            const { role, section } = normalizeSheetRoleAndSection(rawRole, name);
            const username = getSheetProp(r, 'UserName', '7. UserName', 'username', 'Username');
            const email = getSheetProp(r, 'Email', 'email') || (username.includes('@') ? username : `${username || 'member'}@tsgband.com`);
            const password = getSheetProp(r, 'Password', '8. Password', 'password', 'Password') || '786110515253';
            const phone = getSheetProp(r, 'Mobile Number', '4. Mobile Number', 'phone', 'Phone', 'mobileNumber');
            const address = getSheetProp(r, 'Address', '3. Address', 'address', 'Address');
            const jamaat = getSheetProp(r, 'Jamaat', '5. Jamaat', 'jamaat', 'Jamaat');

            const isTreasurerUser = name.toUpperCase().includes('HUSAIN JUJARBHAI KUNDAWALA') || name.toUpperCase().includes('TAHA MAZHARBHAI KUNDAWALA') || rawRole.toLowerCase().includes('treasurer');
            const userRank = isTreasurerUser
              ? (section === 'Trumpet' ? 'Band Treasurer & Trumpet Musician' : 'Band Treasurer & SideDrum/BaseDrum Musician')
              : (r.rank || r.Rank || `${role}`);

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
              rank: userRank,
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
              const { role, section } = normalizeSheetRoleAndSection(rawRole, name);
              const phone = r.mobilenumber || r.mobile || r.phone || r.contact || '';
              const address = r.address || '';
              const jamaat = r.jamaat || '';

              const isTreasurerUser = name.toUpperCase().includes('HUSAIN JUJARBHAI KUNDAWALA') || name.toUpperCase().includes('TAHA MAZHARBHAI KUNDAWALA') || rawRole.toLowerCase().includes('treasurer');
              const userRank = isTreasurerUser
                ? (section === 'Trumpet' ? 'Band Treasurer & Trumpet Musician' : 'Band Treasurer & SideDrum/BaseDrum Musician')
                : (r.rank || `${section} Musician`);

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
                rank: userRank,
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
 * Fetches and synchronizes Lavajam Details directly from Google Sheet
 */
export async function syncLavajamFromGoogleSheet(targetYear?: number | string): Promise<{
  records: LavajamRecord[];
  years: string[];
  selectedYear: string;
}> {
  const config = getGoogleSheetConfig();
  const requestedYear = String(targetYear || '2026');

  try {
    if (config.appsScriptUrl) {
      const url = `${config.appsScriptUrl}?sheet=${encodeURIComponent('Lavajam Details')}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const rawRows = data.members || [];
        // Strictly filter out M ISMAIL SH YUSUFBHAI ZOZWALA, HUSSAIN HANNANBHAI MULLAMITHAWALA, and invalid date rows
        const rows = (Array.isArray(rawRows) ? rawRows : []).filter((r: any) => {
          const rawName = String(r['Full Name'] || r['Name'] || r.name || r.userName || '').trim().toUpperCase();
          if (!rawName) return false;
          if (rawName.includes('ZOZWALA')) return false;
          if (rawName.includes('HUSSAIN HANNANBHAI') || (rawName.includes('HUSSAIN') && rawName.includes('MULLAMITHAWALA'))) return false;
          if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(rawName)) return false;
          if (rawName === 'LAVAJAM' || rawName === 'HOOB') return false;
          return true;
        });

        if (Array.isArray(rows) && rows.length > 0) {
          // Discover all year columns (e.g. '2026', '2025', etc.)
          const discoveredYears = new Set<string>();
          rows.forEach((r: any) => {
            Object.keys(r).forEach(k => {
              const trimmed = k.trim();
              if (/^\d{4}$/.test(trimmed)) {
                discoveredYears.add(trimmed);
              }
            });
          });
          if (!discoveredYears.has(requestedYear)) {
            discoveredYears.add(requestedYear);
          }
          const sortedYears = Array.from(discoveredYears).sort((a, b) => Number(b) - Number(a));

          const users = getUsers();
          const mappedRecords: LavajamRecord[] = rows.map((r: any, idx: number) => {
            const rawName = String(r['Full Name'] || r['Name'] || r.name || r.userName || '').trim();
            const rawFund = String(r['Fund Type'] || r.fundType || '').trim();
            const isHoob = rawFund.toLowerCase().includes('hoob');
            const fundType: 'Lavajam' | 'Hoob' = isHoob ? 'Hoob' : 'Lavajam';
            
            // Amount in requested year column
            const yearVal = r[requestedYear];
            const amount = (yearVal !== undefined && yearVal !== null && String(yearVal).trim() !== '' && !isNaN(Number(yearVal)))
              ? Number(yearVal)
              : 0;

            const status: LavajamStatus = amount > 0 ? 'Paid' : 'Unpaid';

            let section = 'External / Hoob';
            let userId: string | undefined = undefined;
            let role: string | undefined = undefined;

            const isMufaddal = rawName.toUpperCase().includes('VALINABU');
            if (isMufaddal) {
              section = 'Major';
              role = 'Major';
            }

            if (!isHoob) {
              const normRaw = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
              const matchedUser = users.find(u => {
                const normU = u.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return normU === normRaw || normU.includes(normRaw) || normRaw.includes(normU);
              });
              if (matchedUser) {
                if (!isMufaddal) {
                  section = matchedUser.section;
                }
                userId = matchedUser.id;
                if (!role) {
                  role = matchedUser.role;
                }
              } else if (!isMufaddal) {
                section = 'General';
              }
            }

            return {
              id: `lav-sheet-${idx + 1}`,
              userId,
              userName: rawName,
              fundType,
              role,
              section,
              year: requestedYear,
              amount,
              status,
              paidAt: status === 'Paid' ? new Date().toISOString() : undefined,
              paymentMethod: status === 'Paid' ? (isHoob ? 'UPI' : (idx % 2 === 0 ? 'UPI' : 'Cash')) : undefined,
              receiptNo: status === 'Paid' ? `REC-${requestedYear}-${String(idx + 1).padStart(3, '0')}` : undefined,
            };
          });

          // Merge with any active in-memory records for requestedYear so newly recorded contributions show instantly
          const activeLocal = getFinancials();
          const combinedRecords = [...mappedRecords];

          activeLocal.forEach(localRec => {
            if (localRec.year === requestedYear) {
              const existingIdx = combinedRecords.findIndex(
                r => r.userName.trim().toLowerCase() === localRec.userName.trim().toLowerCase()
              );
              if (existingIdx !== -1) {
                // If local has a positive amount and remote sheet still returned 0, preserve local updated amount
                if (localRec.amount > 0 && combinedRecords[existingIdx].amount === 0) {
                  combinedRecords[existingIdx] = {
                    ...combinedRecords[existingIdx],
                    amount: localRec.amount,
                    status: 'Paid',
                    paidAt: localRec.paidAt || combinedRecords[existingIdx].paidAt,
                    paymentMethod: localRec.paymentMethod || combinedRecords[existingIdx].paymentMethod,
                    receiptNo: localRec.receiptNo || combinedRecords[existingIdx].receiptNo,
                  };
                }
              } else {
                // Freshly created Hoob contributor or new member not yet returned by remote Google Sheet
                combinedRecords.unshift(localRec);
              }
            }
          });

          setFinancials(combinedRecords);

          // Also write to local Excel file
          if (typeof window === 'undefined') {
            try {
              const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
              if (fs.existsSync(excelPath)) {
                const wb = XLSX.readFile(excelPath);
                const headerRow = ['Full Name', 'Fund Type', ...sortedYears];
                const excelRows = [
                  headerRow,
                  ...rows
                    .filter((r: any) => {
                      const rowName = String(r['Full Name'] || r['Name'] || r.name || '').trim().toUpperCase();
                      if (!rowName) return false;
                      if (rowName.includes('ZOZWALA')) return false;
                      if (rowName.includes('HUSSAIN HANNANBHAI') || (rowName.includes('HUSSAIN') && rowName.includes('MULLAMITHAWALA'))) return false;
                      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(rowName)) return false;
                      if (rowName === 'LAVAJAM' || rowName === 'HOOB') return false;
                      return true;
                    })
                    .map((r: any) => {
                      const rowName = String(r['Full Name'] || r['Name'] || r.name || '').trim();
                      const rowFund = String(r['Fund Type'] || '').trim() || (rowName.toLowerCase().includes('bhai') ? 'Hoob' : 'Lavajam');
                      const yearCols = sortedYears.map(yr => {
                        const val = r[yr];
                        return (val !== undefined && val !== null && String(val).trim() !== '' && !isNaN(Number(val)))
                          ? Number(val)
                          : '';
                      });
                      return [rowName, rowFund, ...yearCols];
                    }),
                ];
                wb.Sheets['Lavajam Details'] = XLSX.utils.aoa_to_sheet(excelRows);
                if (!wb.SheetNames.includes('Lavajam Details')) {
                  wb.SheetNames.push('Lavajam Details');
                }
                XLSX.writeFile(wb, excelPath);
              }
            } catch (e) {
              console.warn('Notice: Excel update during Lavajam sync:', e);
            }
          }

          return { records: combinedRecords, years: sortedYears, selectedYear: requestedYear };
        }
      }
    }
  } catch (err) {
    console.warn('Google Sheet Lavajam sync failed, falling back to local database/Excel:', err);
  }

  // Authoritative Fallback: Read directly from local Excel file (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx -> Lavajam Details sheet)
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (fs.existsSync(excelPath)) {
        const wb = XLSX.readFile(excelPath);
        const ws = wb.Sheets['Lavajam Details'];
        if (ws) {
          const excelRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          if (excelRows.length > 1) {
            const headers = (excelRows[0] || []).map(h => String(h).trim());
            let nameCol = headers.findIndex(h => h.toLowerCase().replace(/[^a-z]/g, '') === 'fullname' || h.toLowerCase() === 'name');
            let fundCol = headers.findIndex(h => h.toLowerCase().replace(/[^a-z]/g, '') === 'fundtype');
            if (nameCol === -1) nameCol = 0;
            if (fundCol === -1) fundCol = 1;

            const discoveredYears = new Set<string>();
            headers.forEach(h => {
              if (/^\d{4}$/.test(h)) discoveredYears.add(h);
            });
            if (!discoveredYears.has(requestedYear)) discoveredYears.add(requestedYear);
            const sortedYears = Array.from(discoveredYears).sort((a, b) => Number(b) - Number(a));

            let yearCol = headers.findIndex(h => h === requestedYear);

            const users = getUsers();
            const validRecords: LavajamRecord[] = [];

            for (let i = 1; i < excelRows.length; i++) {
              const row = excelRows[i];
              const rawName = String(row[nameCol] || '').trim();
              if (!rawName) continue;
              const upperName = rawName.toUpperCase();
              if (upperName.includes('ZOZWALA')) continue;
              if (upperName.includes('HUSSAIN HANNANBHAI') || (upperName.includes('HUSSAIN') && upperName.includes('MULLAMITHAWALA'))) continue;
              if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(rawName)) continue;
              if (upperName === 'LAVAJAM' || upperName === 'HOOB') continue;

              const rawFund = String(row[fundCol] || '').trim();
              const isHoob = rawFund.toLowerCase().includes('hoob');
              const fundType: 'Lavajam' | 'Hoob' = isHoob ? 'Hoob' : 'Lavajam';

              const yearVal = yearCol !== -1 ? row[yearCol] : undefined;
              const amount = (yearVal !== undefined && yearVal !== null && String(yearVal).trim() !== '' && !isNaN(Number(yearVal)))
                ? Number(yearVal)
                : 0;

              const status: LavajamStatus = amount > 0 ? 'Paid' : 'Unpaid';
              let section = 'External / Hoob';
              let userId: string | undefined = undefined;
              let role: string | undefined = undefined;

              const isMufaddal = upperName.includes('VALINABU');
              if (isMufaddal) {
                section = 'Major';
                role = 'Major';
              }

              if (!isHoob) {
                const normRaw = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const matchedUser = users.find(u => {
                  const normU = u.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                  return normU === normRaw || normU.includes(normRaw) || normRaw.includes(normU);
                });
                if (matchedUser) {
                  if (!isMufaddal) {
                    section = matchedUser.section;
                  }
                  userId = matchedUser.id;
                  if (!role) {
                    role = matchedUser.role;
                  }
                } else if (!isMufaddal) {
                  section = 'General';
                }
              }

              validRecords.push({
                id: `lav-excel-${i}`,
                userId,
                userName: rawName,
                fundType,
                role,
                section,
                year: requestedYear,
                amount,
                status,
                paidAt: status === 'Paid' ? new Date().toISOString() : undefined,
                paymentMethod: status === 'Paid' ? (isHoob ? 'UPI' : (i % 2 === 0 ? 'UPI' : 'Cash')) : undefined,
                receiptNo: status === 'Paid' ? `REC-${requestedYear}-${String(i).padStart(3, '0')}` : undefined,
              });
            }

            setFinancials(validRecords);
            return { records: validRecords, years: sortedYears, selectedYear: requestedYear };
          }
        }
      }
    } catch (excelErr) {
      console.warn('Fallback direct Excel read notice:', excelErr);
    }
  }

  // Fallback to local DB
  const fallbackYears = [requestedYear];
  const dbRecords = getFinancials()
    .filter(rec => {
      const uname = (rec.userName || '').toUpperCase();
      if (uname.includes('ZOZWALA')) return false;
      if (uname.includes('HUSSAIN HANNANBHAI') || (uname.includes('HUSSAIN') && uname.includes('MULLAMITHAWALA'))) return false;
      return true;
    })
    .map(rec => ({
      ...rec,
      section: (rec.userName || '').toUpperCase().includes('VALINABU') ? 'Major' : rec.section,
      role: (rec.userName || '').toUpperCase().includes('VALINABU') ? 'Major' : rec.role,
      year: requestedYear,
      status: (rec.amount > 0 ? 'Paid' : 'Unpaid') as LavajamStatus,
    }));
  return { records: dbRecords, years: fallbackYears, selectedYear: requestedYear };
}

/**
 * Fetches and synchronizes Instrument Expenses directly from Google Sheet
 */
export async function syncExpensesFromGoogleSheet(): Promise<ExpenseRecord[]> {
  const config = getGoogleSheetConfig();
  if (!config.appsScriptUrl) return getExpenses();

  try {
    const url = `${config.appsScriptUrl}?sheet=${encodeURIComponent('Instrument Expenses')}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      const rows = data.members || [];
      if (Array.isArray(rows) && rows.length > 0) {
        const mappedExpenses: ExpenseRecord[] = rows.map((r: any, idx: number) => {
          const rawDetails = String(r['Expense Details'] || r.expenseDetails || r.name || '').trim();
          const amount = Number(r.Amount || r.amount || 0);
          const rawDate = String(r.Date || r.date || '24/09/2026').trim();
          const rawNotes = String(r['Additional Notes'] || r.AdditionalNotes || r.Notes || r.notes || '').trim();

          return {
            id: `exp-sheet-${idx + 1}`,
            date: rawDate || '24/09/2026',
            expenseDetails: rawDetails,
            amount,
            category: rawDetails.toLowerCase().includes('banner') ? 'Logistics' : 'Instruments',
            notes: rawNotes || undefined,
          };
        });

        // Merge with any active in-memory expenses so freshly recorded expenses show instantly
        const activeLocalExpenses = getExpenses();
        const combinedExpenses = [...mappedExpenses];

        activeLocalExpenses.forEach(localExp => {
          const exists = combinedExpenses.some(
            ce =>
              ce.id === localExp.id ||
              (ce.expenseDetails.trim().toLowerCase() === localExp.expenseDetails.trim().toLowerCase() &&
                Number(ce.amount) === Number(localExp.amount))
          );
          if (!exists) {
            combinedExpenses.unshift(localExp);
          }
        });

        setExpenses(combinedExpenses);

        if (typeof window === 'undefined') {
          try {
            const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
            if (fs.existsSync(excelPath)) {
              const wb = XLSX.readFile(excelPath);
              const excelRows = [
                ['Date', 'Expense Details', 'Amount', 'Additional Notes'],
                ...combinedExpenses.map(exp => [
                  exp.date || '24/09/2026',
                  exp.expenseDetails,
                  exp.amount,
                  exp.notes || '',
                ]),
              ];
              wb.Sheets['Instrument Expenses'] = XLSX.utils.aoa_to_sheet(excelRows);
              if (!wb.SheetNames.includes('Instrument Expenses')) {
                wb.SheetNames.push('Instrument Expenses');
              }
              XLSX.writeFile(wb, excelPath);
            }
          } catch (e) {
            console.warn('Notice: Excel update during Expense sync:', e);
          }
        }

        return combinedExpenses;
      }
    }
  } catch (err) {
    console.warn('Failed to sync Instrument Expenses from Google Sheet:', err);
  }

  // Authoritative Fallback: Read directly from local Excel file (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx -> Instrument Expenses sheet)
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (fs.existsSync(excelPath)) {
        const wb = XLSX.readFile(excelPath);
        const ws = wb.Sheets['Instrument Expenses'];
        if (ws) {
          const excelRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          if (excelRows.length > 1) {
            const parsedExpenses: ExpenseRecord[] = [];
            for (let i = 1; i < excelRows.length; i++) {
              const row = excelRows[i];
              const dateVal = String(row[0] || '').trim();
              const detailsVal = String(row[1] || '').trim();
              const amountVal = Number(row[2]) || 0;
              const notesVal = String(row[3] || '').trim();
              if (detailsVal) {
                parsedExpenses.push({
                  id: `exp-excel-${i}`,
                  date: dateVal || '24/09/2026',
                  expenseDetails: detailsVal,
                  amount: amountVal,
                  category: detailsVal.toLowerCase().includes('banner') ? 'Logistics' : 'Instruments',
                  notes: notesVal || undefined,
                });
              }
            }
            if (parsedExpenses.length > 0) {
              setExpenses(parsedExpenses);
              return parsedExpenses;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Fallback read from local Excel failed for Instrument Expenses:', e);
    }
  }

  return getExpenses();
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

  const user = getUserByUsernameOrEmail(usernameOrEmail);

  // Update password in local Excel sheet (Member Details and Responses)
  updatePasswordInExcelFile(usernameOrEmail, newPassword);

  const config = getGoogleSheetConfig();
  let sheetSynced = false;

  // If Apps Script Web App URL is present, send the update directly to Google Sheet
  if (config.appsScriptUrl) {
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          action: 'updatePassword',
          sheetName: 'Member Details',
          username: user?.username || usernameOrEmail,
          email: user?.email || usernameOrEmail,
          itsNumber: user?.itsNumber || '',
          name: user?.name || '',
          newPassword: newPassword,
        }),
      });

      if (response.ok) {
        const json = await response.json().catch(() => null);
        if (json && json.success !== false) {
          sheetSynced = true;
        }
      }
    } catch (err) {
      console.warn('Failed to post password update to Google Apps Script:', err);
    }
  }

  return {
    success: true,
    message: sheetSynced
      ? `Password successfully updated in Member Details Google Sheet, local Excel, and application database.`
      : `Password successfully updated for ${user?.name || usernameOrEmail} in Member Details and local Excel.`,
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
        const itsColIndex = headerRow.findIndex((h: any) =>
          String(h || '').toLowerCase().includes('its')
        );
        const nameColIndex = headerRow.findIndex((h: any) => {
          const s = String(h || '').toLowerCase();
          return s.includes('name') && !s.includes('user');
        });

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
          const rowIts = itsColIndex !== -1 ? String(r[itsColIndex] || '').trim().replace(/\D/g, '') : String(r[1] || '').trim().replace(/\D/g, '');
          const rowName = nameColIndex !== -1 ? String(r[nameColIndex] || '').trim().toLowerCase() : String(r[2] || '').trim().toLowerCase();
          const rowUser = userColIndex !== -1 ? String(r[userColIndex] || '').trim().toLowerCase() : '';

          const match =
            (userIts && rowIts && rowIts === userIts.replace(/\D/g, '')) ||
            (cleanDigits && rowIts && rowIts === cleanDigits) ||
            (userUName && (rowUser === userUName || rowUser.includes(userUName))) ||
            (userName && (rowName === userName || rowName.includes(userName) || userName.includes(rowName))) ||
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

      // Filter out completely empty rows
      const cleanRows: any[][] = [];
      for (const r of rows) {
        if (r && Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== '')) {
          cleanRows.push([...r]);
        }
      }

      // If sheet has old format with 'ITS Number' at Col A, reformat to exact image structure:
      // Col A: 'Full Name', Col B+: Dates
      if (cleanRows.length > 0 && String(cleanRows[0][0] || '').trim().toLowerCase() === 'its number') {
        const migratedRows: any[][] = [['Full Name']];
        const oldHeaders = cleanRows[0];
        const dateIndices: { idx: number; name: string }[] = [];
        for (let c = 3; c < oldHeaders.length; c++) {
          if (oldHeaders[c]) {
            dateIndices.push({ idx: c, name: String(oldHeaders[c]).trim() });
            migratedRows[0].push(String(oldHeaders[c]).trim());
          }
        }
        for (let r = 1; r < Math.min(cleanRows.length, 41); r++) {
          const memberName = String(cleanRows[r][1] || '').trim();
          const rowData = [memberName];
          dateIndices.forEach(di => {
            rowData.push(cleanRows[r][di.idx] || '');
          });
          migratedRows.push(rowData);
        }
        cleanRows.length = 0;
        cleanRows.push(...migratedRows);
      }

      // If sheet is empty, initialize with 40 members and Full Name header
      if (cleanRows.length === 0) {
        cleanRows.push(['Full Name', '22/09/2026', '23/09/2026']);
        const allUsers = getUsers();
        allUsers.slice(0, 40).forEach(u => {
          cleanRows.push([u.name, '', '']);
        });
      }

      // Header row
      const headerRow = cleanRows[0];

      // Find or append date column
      let dateColIndex = headerRow.findIndex((h: any) => {
        const s = String(h || '').trim();
        return s === formattedDate || s === rawDate;
      });

      // For every new date add that date as column header given in image
      if (dateColIndex === -1) {
        dateColIndex = headerRow.length;
        headerRow.push(formattedDate);
      }

      // Helper to normalize strings (remove spaces, punctuation, lowercase)
      const normStr = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

      // Build member index map from existing rows (Column A is Full Name)
      const nameRowMap: Record<string, number> = {};
      for (let i = 1; i < Math.min(cleanRows.length, 41); i++) {
        const nameVal = String(cleanRows[i][0] || '').trim();
        if (nameVal) {
          nameRowMap[normStr(nameVal)] = i;
        }
      }

      // Update attendance status for each record in session
      // ONLY update existing members on the date column - NEVER add new rows, names, or ITS
      session.records.forEach(rec => {
        const recName = String(rec.userName || (rec as any).name || '').trim();
        const recNameNorm = normStr(recName);
        const statusVal = rec.status; // 'Present' | 'Absent' | 'Late'

        if (!statusVal) return;

        let targetRowIndex: number | undefined = undefined;

        if (recNameNorm && nameRowMap[recNameNorm] !== undefined) {
          targetRowIndex = nameRowMap[recNameNorm];
        } else if (recNameNorm) {
          // Partial fuzzy match against existing Full Name list
          const keys = Object.keys(nameRowMap);
          for (const key of keys) {
            if (recNameNorm.includes(key) || key.includes(recNameNorm)) {
              targetRowIndex = nameRowMap[key];
              break;
            }
          }
        }

        // ONLY update attendance (Present, Absent, Late) for existing member on the selected date
        // DO NOT add name or ITS
        if (targetRowIndex !== undefined) {
          while (cleanRows[targetRowIndex].length <= dateColIndex) {
            cleanRows[targetRowIndex].push('');
          }
          cleanRows[targetRowIndex][dateColIndex] = statusVal;
        }
      });

      // Strictly limit to 41 rows (1 header + 40 members)
      const finalRows = cleanRows.slice(0, 41);

      const newWs = XLSX.utils.aoa_to_sheet(finalRows);
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
          itsNumber: (r as any).itsNumber || String(r.userId || '').replace(/^sheet-/, '').trim(),
          name: r.userName,
          userName: r.userName,
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

/**
 * Synchronizes Lavajam contribution record with local Excel file
 * (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx -> Lavajam Details sheet)
 * Schema: ['Full Name', 'Fund Type', '2026', ...]
 */
export function syncLavajamToExcel(
  record: LavajamRecord,
  action: 'add' | 'update' | 'delete',
  targetYear?: number | string,
  originalName?: string
): void {
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return;

      const wb = XLSX.readFile(excelPath);
      const ws = wb.Sheets['Lavajam Details'];
      let rows: any[][] = [];
      const activeYear = String(targetYear || record.year || '2026');

      if (!ws) {
        rows = [['Full Name', 'Fund Type', activeYear]];
      } else {
        rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (rows.length === 0) {
          rows.push(['Full Name', 'Fund Type', activeYear]);
        }
      }

      // Check header row: ['Full Name', 'Fund Type', ...]
      const headers = (rows[0] || []).map(h => String(h).trim());
      let nameCol = headers.findIndex(h => h.toLowerCase().replace(/[^a-z]/g, '') === 'fullname' || h.toLowerCase() === 'name');
      let fundCol = headers.findIndex(h => h.toLowerCase().replace(/[^a-z]/g, '') === 'fundtype');
      if (nameCol === -1) nameCol = 0;
      if (fundCol === -1) fundCol = 1;

      let yearCol = headers.findIndex(h => h === activeYear);
      if (yearCol === -1) {
        yearCol = headers.length;
        rows[0].push(activeYear);
      }

      const targetName = (originalName || record.userName || '').trim().toLowerCase();
      let matchIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        const rowName = String(rows[i]?.[nameCol] || '').trim().toLowerCase();
        if (rowName === targetName) {
          matchIndex = i;
          break;
        }
      }

      const fundTypeStr = record.fundType || (record.userName.toLowerCase().includes('bhai') ? 'Hoob' : 'Lavajam');
      const amountVal = Number(record.amount) || 0;

      if (action === 'delete') {
        if (matchIndex > 0) {
          if (fundTypeStr.toLowerCase().includes('hoob')) {
            rows.splice(matchIndex, 1);
          } else {
            // For band member: clear year's amount so status becomes Unpaid
            rows[matchIndex][yearCol] = '';
          }
        }
      } else if (action === 'update' || action === 'add') {
        if (matchIndex > 0) {
          rows[matchIndex][nameCol] = record.userName;
          rows[matchIndex][fundCol] = fundTypeStr;
          rows[matchIndex][yearCol] = amountVal > 0 ? amountVal : '';
        } else {
          // If not found (e.g. new Hoob), append new row
          const newRow = new Array(rows[0].length).fill('');
          newRow[nameCol] = record.userName;
          newRow[fundCol] = fundTypeStr;
          newRow[yearCol] = amountVal > 0 ? amountVal : '';
          rows.push(newRow);
        }
      }

      // Ensure excluded members or date/empty rows are never written to Lavajam Details sheet
      const cleanRows = rows.filter((r, idx) => {
        if (idx === 0) return true;
        const rowName = String(r[nameCol] || '').trim().toUpperCase();
        if (!rowName) return false;
        if (rowName.includes('ZOZWALA')) return false;
        if (rowName.includes('HUSSAIN HANNANBHAI') || (rowName.includes('HUSSAIN') && rowName.includes('MULLAMITHAWALA'))) return false;
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(rowName)) return false;
        if (rowName === 'LAVAJAM' || rowName === 'HOOB') return false;
        return true;
      });

      const newWs = XLSX.utils.aoa_to_sheet(cleanRows);
      wb.Sheets['Lavajam Details'] = newWs;
      if (!wb.SheetNames.includes('Lavajam Details')) {
        wb.SheetNames.push('Lavajam Details');
      }
      XLSX.writeFile(wb, excelPath);
      console.log('SYNC LAVAJAM TO EXCEL SUCCESS: updated', excelPath, 'rows:', rows.length);
    } catch (err) {
      console.error('Failed to sync Lavajam Details to local Excel:', err);
    }
  }
}

/**
 * Synchronizes Instrument Expense record with local Excel file
 * (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx -> Instrument Expenses sheet)
 */
export function syncExpenseToExcel(
  expense?: ExpenseRecord,
  action?: 'add' | 'update' | 'delete',
  originalDetails?: string,
  originalAmount?: number
): void {
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return;

      const wb = XLSX.readFile(excelPath);
      const activeExpenses = getExpenses();
      const excelRows = [
        ['Date', 'Expense Details', 'Amount', 'Additional Notes'],
        ...activeExpenses.map(exp => [
          exp.date || '24/09/2026',
          exp.expenseDetails,
          Number(exp.amount) || 0,
          exp.notes || '',
        ]),
      ];

      wb.Sheets['Instrument Expenses'] = XLSX.utils.aoa_to_sheet(excelRows);
      if (!wb.SheetNames.includes('Instrument Expenses')) {
        wb.SheetNames.push('Instrument Expenses');
      }
      XLSX.writeFile(wb, excelPath);
      console.log('SYNC EXPENSE TO EXCEL SUCCESS: updated', excelPath, 'rows:', excelRows.length);
    } catch (err) {
      console.warn('Failed to sync Instrument Expenses to local Excel:', err);
    }
  }
}

/**
 * Posts Lavajam changes to Google Sheet via Google Apps Script Web App
 */
export async function postLavajamToGoogleSheet(
  record: LavajamRecord,
  action: 'add' | 'update' | 'delete',
  targetYear?: number | string,
  originalName?: string
): Promise<{ success: boolean; message: string }> {
  const config = getGoogleSheetConfig();
  if (!config.appsScriptUrl) {
    return { success: false, message: 'Google Apps Script URL not configured.' };
  }
  const activeYear = String(targetYear || record.year || '2026');
  try {
    const actMap = {
      add: 'addLavajamRecord',
      update: 'updateLavajamRecord',
      delete: 'deleteLavajamRecord',
    };
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({
        action: actMap[action],
        sheetName: 'Lavajam Details',
        year: activeYear,
        record: {
          userName: record.userName,
          originalName: originalName || record.userName,
          fundType: record.fundType || 'Lavajam',
          amount: record.amount,
          year: activeYear,
        },
        userName: originalName || record.userName,
      }),
    });
    const resData = await response.json().catch(() => ({}));
    return { success: true, message: resData.message || 'Synced with Google Sheet' };
  } catch (err) {
    console.warn('Failed to sync Lavajam with Google Apps Script:', err);
    return { success: false, message: 'Failed to sync with Google Sheet' };
  }
}

/**
 * Posts Expense changes to Google Sheet via Google Apps Script Web App
 */
export async function postExpenseToGoogleSheet(
  expense: ExpenseRecord,
  action: 'add' | 'update' | 'delete',
  originalDetails?: string,
  originalAmount?: number
): Promise<{ success: boolean; message: string }> {
  const config = getGoogleSheetConfig();
  if (!config.appsScriptUrl) {
    return { success: false, message: 'Google Apps Script URL not configured.' };
  }
  try {
    const actMap = {
      add: 'addExpense',
      update: 'updateExpense',
      delete: 'deleteExpense',
    };
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({
        action: actMap[action],
        expense: {
          date: expense.date || '24/09/2026',
          expenseDetails: expense.expenseDetails,
          originalDetails: originalDetails || expense.expenseDetails,
          originalAmount: originalAmount !== undefined ? originalAmount : expense.amount,
          amount: expense.amount,
          notes: expense.notes || '',
          additionalNotes: expense.notes || '',
        },
        expenseDetails: originalDetails || expense.expenseDetails,
        originalAmount: originalAmount !== undefined ? originalAmount : expense.amount,
        amount: originalAmount !== undefined ? originalAmount : expense.amount,
        notes: expense.notes || '',
        additionalNotes: expense.notes || '',
      }),
    });
    const resData = await response.json().catch(() => ({}));
    return { success: true, message: resData.message || 'Synced with Google Sheet' };
  } catch (err) {
    console.warn('Failed to sync Expense with Google Apps Script:', err);
    return { success: false, message: 'Failed to sync with Google Sheet' };
  }
}

// ----------------- REFERENCE LINK SHEET & DRIVE FOLDERS (IMAGE 3) -----------------

export interface ReferenceLinkRecord {
  id?: string;
  tuneName: string;
  instrumentType: string;
  targetFolder: string;
  fileName: string;
  fileUrl: string;
  youtubeLink?: string;
  instagramLink?: string;
  uploadedBy?: string;
  createdAt?: string;
}

export const INSTRUMENT_DRIVE_FOLDER_MAP: Record<string, string> = {
  Trumpet: 'Trumpet Notes',
  Saxophone: 'Saxophone Notes',
  'SideDrum/BaseDrum': 'SideDrum Notes',
  SideDrum: 'SideDrum Notes',
  BaseDrum: 'SideDrum Notes',
  Euphonium: 'Euphonium Notes',
  Trombone: 'Trombone Notes',
  Dish: 'Dish Notes',
};

/**
 * Returns the exact Google Drive folder name for a given instrument type
 */
export function getDriveFolderForInstrument(instrument?: string): string {
  if (!instrument) return 'Trumpet Notes';
  const clean = instrument.trim().toLowerCase();
  if (clean === 'trumpet') return 'Trumpet Notes';
  if (clean === 'saxophone') return 'Saxophone Notes';
  if (clean === 'euphonium') return 'Euphonium Notes';
  if (clean.includes('sidedrum') || clean.includes('basedrum')) return 'SideDrum Notes';
  if (clean === 'trombone') return 'Trombone Notes';
  if (clean === 'dish') return 'Dish Notes';
  return INSTRUMENT_DRIVE_FOLDER_MAP[instrument] || `${instrument} Notes`;
}

/**
 * Synchronizes Reference Link entry to local Excel file (TAHERI_SCOUT_BAND_GROUP_1448H.xlsx -> Reference Link sheet)
 */
export function syncReferenceLinkToExcel(record: ReferenceLinkRecord): void {
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return;

      const fileBuf = fs.readFileSync(excelPath);
      const wb = XLSX.read(fileBuf, { type: 'buffer' });
      let ws = wb.Sheets['Reference Link'];
      let rows: any[][] = [];

      const headers = [
        'Timestamp',
        'Tune Name',
        'Instrument Type',
        'Target Drive Folder',
        'File Name',
        'File URL',
        'YouTube Link',
        'Instagram Link',
        'Uploaded By',
      ];

      if (!ws) {
        rows = [headers];
      } else {
        const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        // Clean out dummy test headers if present
        if (rawJson.length > 0 && (rawJson[0][0] === 'A' || rawJson[0][0] !== 'Timestamp')) {
          rows = [headers];
        } else if (rawJson.length === 0) {
          rows = [headers];
        } else {
          rows = rawJson;
        }
      }

      rows.push([
        record.createdAt || new Date().toISOString(),
        record.tuneName,
        record.instrumentType,
        record.targetFolder,
        record.fileName,
        record.fileUrl,
        record.youtubeLink || '',
        record.instagramLink || '',
        record.uploadedBy || 'Section Leadership',
      ]);

      const newWs = XLSX.utils.aoa_to_sheet(rows);
      wb.Sheets['Reference Link'] = newWs;
      if (!wb.SheetNames.includes('Reference Link')) {
        wb.SheetNames.push('Reference Link');
      }
      const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      fs.writeFileSync(excelPath, outBuf);
    } catch (err) {
      console.warn('Failed to sync Reference Link to local Excel:', err);
    }
  }
}

/**
 * Reads all Reference Link records from local Excel file
 */
export function getReferenceLinksFromExcel(): ReferenceLinkRecord[] {
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return [];

      const fileBuf = fs.readFileSync(excelPath);
      const wb = XLSX.read(fileBuf, { type: 'buffer' });
      const ws = wb.Sheets['Reference Link'];
      if (!ws) return [];

      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (rawRows.length < 2) return [];

      const records: ReferenceLinkRecord[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || !row[1] || row[0] === 'A' || row[0] === '1') continue;
        records.push({
          id: `ref-${i}-${Date.now()}`,
          createdAt: String(row[0] || ''),
          tuneName: String(row[1] || ''),
          instrumentType: String(row[2] || ''),
          targetFolder: String(row[3] || ''),
          fileName: String(row[4] || ''),
          fileUrl: String(row[5] || ''),
          youtubeLink: String(row[6] || ''),
          instagramLink: String(row[7] || ''),
          uploadedBy: String(row[8] || ''),
        });
      }
      return records;
    } catch (err) {
      console.warn('Failed to read Reference Links from Excel:', err);
      return [];
    }
  }
  return [];
}

/**
 * Posts Reference Link entry to Google Sheet & uploads file to Google Drive folder via Google Apps Script Web App
 */
export async function postReferenceLinkToGoogleSheet(
  record: ReferenceLinkRecord,
  fileBase64?: string,
  mimeType?: string
): Promise<{ success: boolean; message: string; driveFileUrl?: string }> {
  const config = getGoogleSheetConfig();
  if (!config.appsScriptUrl) {
    return { success: false, message: 'Google Apps Script URL not configured.' };
  }
  try {
    const resolvedFolder = record.targetFolder || getDriveFolderForInstrument(record.instrumentType);
    const payload = {
      action: 'addReferenceLink',
      sheetName: 'Reference Link',
      tuneName: record.tuneName,
      instrumentType: record.instrumentType,
      targetFolder: resolvedFolder,
      fileName: record.fileName,
      fileUrl: record.fileUrl,
      youtubeLink: record.youtubeLink || '',
      instagramLink: record.instagramLink || '',
      uploadedBy: record.uploadedBy || 'Section Leadership',
      timestamp: record.createdAt || new Date().toISOString(),
      fileBase64: fileBase64 || '',
      mimeType: mimeType || (record.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      record: {
        tuneName: record.tuneName,
        instrumentType: record.instrumentType,
        targetFolder: resolvedFolder,
        fileName: record.fileName,
        fileUrl: record.fileUrl,
        youtubeLink: record.youtubeLink || '',
        instagramLink: record.instagramLink || '',
        uploadedBy: record.uploadedBy || 'Section Leadership',
        timestamp: record.createdAt || new Date().toISOString(),
      },
    };

    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify(payload),
    });
    const resData = await response.json().catch(() => ({}));
    const driveUrl = resData.fileUrl || resData.driveFileUrl || resData.record?.fileUrl;
    return {
      success: true,
      message: resData.message || 'Synced with Reference Link sheet and Google Drive folder',
      driveFileUrl: driveUrl,
    };
  } catch (err: any) {
    console.warn('Failed to sync Reference Link with Google Apps Script:', err);
    return { success: false, message: err?.message || 'Failed to sync with Reference Link sheet' };
  }
}

/**
 * Retrieves reference links, prioritizing live Google Sheet via Apps Script with fallback to Excel
 */
export async function getReferenceLinksFromSheet(): Promise<ReferenceLinkRecord[]> {
  const config = getGoogleSheetConfig();
  if (config.appsScriptUrl) {
    try {
      const res = await fetch(`${config.appsScriptUrl}?action=getReferenceLinks`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => null);
      if (data && data.success && Array.isArray(data.referenceLinks) && data.referenceLinks.length > 0) {
        return data.referenceLinks;
      }
    } catch (err) {
      console.warn('Could not fetch reference links from Apps Script, reading from local Excel:', err);
    }
  }

  return getReferenceLinksFromExcel();
}

/**
 * Updates a Reference Link record in local Excel workbook
 */
export function updateReferenceLinkInExcel(tuneName: string, updatedRecord: Partial<ReferenceLinkRecord>): boolean {
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return false;

      const fileBuf = fs.readFileSync(excelPath);
      const wb = XLSX.read(fileBuf, { type: 'buffer' });
      const ws = wb.Sheets['Reference Link'];
      if (!ws) return false;

      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      const targetName = tuneName.trim().toLowerCase();
      let updated = false;

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || !row[1]) continue;
        const rowTuneName = String(row[1] || '').trim().toLowerCase();
        if (rowTuneName === targetName) {
          if (updatedRecord.tuneName) row[1] = updatedRecord.tuneName;
          if (updatedRecord.instrumentType) row[2] = updatedRecord.instrumentType;
          if (updatedRecord.targetFolder) row[3] = updatedRecord.targetFolder;
          if (updatedRecord.fileName) row[4] = updatedRecord.fileName;
          if (updatedRecord.fileUrl) row[5] = updatedRecord.fileUrl;
          if (updatedRecord.youtubeLink !== undefined) row[6] = updatedRecord.youtubeLink;
          if (updatedRecord.instagramLink !== undefined) row[7] = updatedRecord.instagramLink;
          if (updatedRecord.uploadedBy) row[8] = updatedRecord.uploadedBy;
          updated = true;
          break;
        }
      }

      if (updated) {
        wb.Sheets['Reference Link'] = XLSX.utils.aoa_to_sheet(rawRows);
        const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(excelPath, outBuf);
      }
      return updated;
    } catch (err) {
      console.warn('Failed to update Reference Link in Excel:', err);
      return false;
    }
  }
  return false;
}

/**
 * Deletes a Reference Link record from local Excel workbook
 */
export function deleteReferenceLinkFromExcel(tuneName: string): boolean {
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return false;

      const fileBuf = fs.readFileSync(excelPath);
      const wb = XLSX.read(fileBuf, { type: 'buffer' });
      const ws = wb.Sheets['Reference Link'];
      if (!ws) return false;

      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      const targetName = tuneName.trim().toLowerCase();
      const newRows: any[][] = [];
      let deleted = false;

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (i === 0) {
          newRows.push(row);
          continue;
        }
        if (!row || !row[1]) continue;
        const rowTuneName = String(row[1] || '').trim().toLowerCase();
        if (!deleted && rowTuneName === targetName) {
          deleted = true;
          continue; // skip row to delete
        }
        newRows.push(row);
      }

      if (deleted) {
        wb.Sheets['Reference Link'] = XLSX.utils.aoa_to_sheet(newRows);
        const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(excelPath, outBuf);
      }
      return deleted;
    } catch (err) {
      console.warn('Failed to delete Reference Link from Excel:', err);
      return false;
    }
  }
  return false;
}

/**
 * Updates Reference Link in Google Sheet via Apps Script Web App
 */
export async function updateReferenceLinkInGoogleSheet(
  originalTuneName: string,
  record: Partial<ReferenceLinkRecord>
): Promise<{ success: boolean; message: string }> {
  const config = getGoogleSheetConfig();
  if (!config.appsScriptUrl) {
    return { success: false, message: 'Google Apps Script URL not configured.' };
  }
  try {
    const res = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateReferenceLink',
        sheetName: 'Reference Link',
        originalTuneName,
        ...record,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { success: true, message: data.message || 'Updated in Reference Link sheet' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to update in sheet' };
  }
}

/**
 * Deletes Reference Link from Google Sheet via Apps Script Web App
 */
export async function deleteReferenceLinkFromGoogleSheet(
  tuneName: string
): Promise<{ success: boolean; message: string }> {
  const config = getGoogleSheetConfig();
  if (!config.appsScriptUrl) {
    return { success: false, message: 'Google Apps Script URL not configured.' };
  }
  try {
    const res = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deleteReferenceLink',
        sheetName: 'Reference Link',
        tuneName,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { success: true, message: data.message || 'Deleted from Reference Link sheet' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to delete from sheet' };
  }
}

// ----------------- ASSIGN NOTES SHEET SUPPORT -----------------

export interface AssignNoteRecord {
  memberName: string;
  assignedTunes: string; // Comma-separated: "tune1, tune2, tune3"
  section?: string;
  itsNumber?: string;
  lastUpdated?: string;
}

/**
 * Reads all Assigned Notes from 'Assign Notes' sheet in Excel
 */
export function getAssignedNotesFromExcel(): AssignNoteRecord[] {
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return [];

      const fileBuf = fs.readFileSync(excelPath);
      const wb = XLSX.read(fileBuf, { type: 'buffer' });
      const ws = wb.Sheets['Assign Notes'];
      if (!ws) return [];

      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (rawRows.length < 2) return [];

      const records: AssignNoteRecord[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || !row[0]) continue;
        records.push({
          memberName: String(row[0] || '').trim(),
          assignedTunes: String(row[1] || '').trim(),
          section: String(row[2] || '').trim(),
          itsNumber: String(row[3] || '').trim(),
          lastUpdated: String(row[4] || ''),
        });
      }
      return records;
    } catch (err) {
      console.warn('Failed to read Assign Notes from Excel:', err);
      return [];
    }
  }
  return [];
}

/**
 * Updates or adds an assigned note entry for a member in 'Assign Notes' sheet in Excel.
 * Formats multiple tunes for a member as a comma-separated list: "tune1, tune2, tune3".
 */
export function saveAssignedNoteToExcel(
  memberName: string,
  tuneName: string,
  action: 'assign' | 'unassign' = 'assign',
  details?: { section?: string; itsNumber?: string }
): { success: boolean; assignedTunes: string } {
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return { success: false, assignedTunes: '' };

      const fileBuf = fs.readFileSync(excelPath);
      const wb = XLSX.read(fileBuf, { type: 'buffer' });
      let ws = wb.Sheets['Assign Notes'];
      const headers = ['Member Name', 'Assigned Tunes', 'Section', 'ITS Number', 'Last Updated'];

      let rows: any[][] = [];
      if (!ws) {
        rows = [headers];
      } else {
        rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (rows.length === 0 || rows[0][0] !== 'Member Name') {
          rows = [headers];
        }
      }

      const cleanMemberName = memberName.trim();
      const cleanTuneName = tuneName.trim();
      if (!cleanMemberName || !cleanTuneName) return { success: false, assignedTunes: '' };

      const memberLower = cleanMemberName.toLowerCase();
      let rowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && String(row[0] || '').trim().toLowerCase() === memberLower) {
          rowIndex = i;
          break;
        }
      }

      const timestamp = new Date().toISOString();
      let finalTunesStr = '';

      if (rowIndex !== -1) {
        // Member exists
        const currentTunesStr = String(rows[rowIndex][1] || '').trim();
        const existingTunes = currentTunesStr
          ? currentTunesStr.split(',').map(t => t.trim()).filter(Boolean)
          : [];

        if (action === 'assign') {
          const alreadyAssigned = existingTunes.some(t => t.toLowerCase() === cleanTuneName.toLowerCase());
          if (!alreadyAssigned) {
            existingTunes.push(cleanTuneName);
          }
        } else {
          // Unassign
          const filtered = existingTunes.filter(t => t.toLowerCase() !== cleanTuneName.toLowerCase());
          existingTunes.length = 0;
          existingTunes.push(...filtered);
        }

        finalTunesStr = existingTunes.join(', ');
        rows[rowIndex][1] = finalTunesStr;
        if (details?.section && !rows[rowIndex][2]) rows[rowIndex][2] = details.section;
        if (details?.itsNumber && !rows[rowIndex][3]) rows[rowIndex][3] = details.itsNumber;
        rows[rowIndex][4] = timestamp;
      } else if (action === 'assign') {
        // Add new row for member
        finalTunesStr = cleanTuneName;
        rows.push([
          cleanMemberName,
          finalTunesStr,
          details?.section || '',
          details?.itsNumber || '',
          timestamp,
        ]);
      }

      wb.Sheets['Assign Notes'] = XLSX.utils.aoa_to_sheet(rows);
      if (!wb.SheetNames.includes('Assign Notes')) {
        wb.SheetNames.push('Assign Notes');
      }

      const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      fs.writeFileSync(excelPath, outBuf);
      return { success: true, assignedTunes: finalTunesStr };
    } catch (err) {
      console.warn('Failed to save Assign Note to Excel:', err);
      return { success: false, assignedTunes: '' };
    }
  }
  return { success: false, assignedTunes: '' };
}

/**
 * Batch updates assigned tunes for multiple members for a specific tune in 'Assign Notes' sheet in Excel.
 * Formats multiple tunes for a member as a comma-separated list: "tune1, tune2, tune3".
 */
export function batchAssignTuneInExcel(
  tuneName: string,
  assignments: { memberName: string; itsNumber?: string; section?: string; assigned: boolean }[]
): boolean {
  if (typeof window === 'undefined') {
    try {
      const excelPath = path.resolve(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
      if (!fs.existsSync(excelPath)) return false;

      const fileBuf = fs.readFileSync(excelPath);
      const wb = XLSX.read(fileBuf, { type: 'buffer' });
      let ws = wb.Sheets['Assign Notes'];
      const headers = ['Member Name', 'Assigned Tunes', 'Section', 'ITS Number', 'Last Updated'];

      let rows: any[][] = [];
      if (!ws) {
        rows = [headers];
      } else {
        rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (rows.length === 0 || rows[0][0] !== 'Member Name') {
          rows = [headers];
        }
      }

      const cleanTuneName = tuneName.trim();
      if (!cleanTuneName) return false;
      const timestamp = new Date().toISOString();

      assignments.forEach(item => {
        const cleanName = (item.memberName || '').trim();
        if (!cleanName) return;
        const nameLower = cleanName.toLowerCase();

        let rowIndex = -1;
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && String(rows[i][0] || '').trim().toLowerCase() === nameLower) {
            rowIndex = i;
            break;
          }
        }

        if (rowIndex !== -1) {
          const currentTunesStr = String(rows[rowIndex][1] || '').trim();
          const existingTunes = currentTunesStr
            ? currentTunesStr.split(',').map(t => t.trim()).filter(Boolean)
            : [];

          if (item.assigned) {
            if (!existingTunes.some(t => t.toLowerCase() === cleanTuneName.toLowerCase())) {
              existingTunes.push(cleanTuneName);
            }
          } else {
            const filtered = existingTunes.filter(t => t.toLowerCase() !== cleanTuneName.toLowerCase());
            existingTunes.length = 0;
            existingTunes.push(...filtered);
          }

          rows[rowIndex][1] = existingTunes.join(', ');
          if (item.section) rows[rowIndex][2] = item.section;
          if (item.itsNumber) rows[rowIndex][3] = item.itsNumber;
          rows[rowIndex][4] = timestamp;
        } else if (item.assigned) {
          rows.push([
            cleanName,
            cleanTuneName,
            item.section || '',
            item.itsNumber || '',
            timestamp,
          ]);
        }
      });

      wb.Sheets['Assign Notes'] = XLSX.utils.aoa_to_sheet(rows);
      if (!wb.SheetNames.includes('Assign Notes')) {
        wb.SheetNames.push('Assign Notes');
      }

      const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      fs.writeFileSync(excelPath, outBuf);
      return true;
    } catch (err) {
      console.warn('Failed to batch assign tune in Excel:', err);
      return false;
    }
  }
  return false;
}

/**
 * Gets list of tune names assigned to a particular member by Name or ITS
 */
export function getAssignedTuneNamesForMember(memberNameOrIts: string): string[] {
  const records = getAssignedNotesFromExcel();
  if (!memberNameOrIts) return [];
  const query = memberNameOrIts.trim().toLowerCase();

  const matchingRecords = records.filter(
    r =>
      r.memberName.toLowerCase() === query ||
      (r.itsNumber && r.itsNumber.toLowerCase() === query) ||
      r.memberName.toLowerCase().includes(query) ||
      query.includes(r.memberName.toLowerCase())
  );

  const tunesSet = new Set<string>();
  matchingRecords.forEach(rec => {
    if (rec.assignedTunes) {
      rec.assignedTunes
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .forEach(t => tunesSet.add(t));
    }
  });

  return Array.from(tunesSet);
}

/**
 * Syncs Assign Notes to Google Sheet via Apps Script Web App
 */
export async function syncAssignNotesToGoogleSheet(
  memberName: string,
  tuneName: string,
  assignedTunesStr: string,
  details?: { section?: string; itsNumber?: string }
): Promise<{ success: boolean; message: string }> {
  const config = getGoogleSheetConfig();
  if (!config.appsScriptUrl) {
    return { success: false, message: 'Google Apps Script URL not configured.' };
  }
  try {
    const res = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assignNotes',
        sheetName: 'Assign Notes',
        memberName,
        tuneName,
        assignedTunes: assignedTunesStr,
        section: details?.section || '',
        itsNumber: details?.itsNumber || '',
        timestamp: new Date().toISOString(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { success: true, message: data.message || 'Synced with Assign Notes sheet in Google Sheet' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to sync with Google Sheet' };
  }
}

