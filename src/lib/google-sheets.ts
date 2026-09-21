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

/**
 * Attempts to fetch live member details from Google Sheet.
 * Checks Apps Script Web App first, then public CSV export, falling back to initialized memory DB.
 */
export function normalizeSheetRoleAndSection(rawRole: string): { role: Role; section: InstrumentSection } {
  const r = (rawRole || '').trim().toLowerCase();
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
  if (r === 'major' || r.includes('overall major') || r.includes('band commander') || r.includes('band major')) {
    return { role: 'Overall Major', section: 'Trumpet' };
  }
  if (r.includes('instrument maintainer') || r.includes('instrument maintenance')) {
    return { role: 'Instrument Maintainer', section: 'Trumpet' };
  }
  if (r.includes('treasurer')) {
    return { role: 'Treasurer', section: 'SideDrum' };
  }
  // Members
  if (r.includes('trumpet')) {
    return { role: 'Band Member / Player', section: 'Trumpet' };
  }
  if (r.includes('saxophone')) {
    return { role: 'Band Member / Player', section: 'Saxophone' };
  }
  if (r.includes('euphonium')) {
    return { role: 'Band Member / Player', section: 'Euphonium' };
  }
  if (r.includes('trombone')) {
    return { role: 'Band Member / Player', section: 'Trombone' };
  }
  if (r.includes('ghugara') || r.includes('dish') || r.includes('cymbal') || r.includes('khanjari') || r.includes('triangle')) {
    return { role: 'Band Member / Player', section: 'Dish' };
  }
  if (r.includes('sidedrum') || r.includes('side drum') || r.includes('three drum') || r.includes('base drum') || r.includes('drum') || r.includes('snare')) {
    return { role: 'Band Member / Player', section: 'SideDrum' };
  }
  return { role: 'Band Member / Player', section: 'Trumpet' };
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
            const rawRole = r.role || r.Role || '';
            const { role, section } = normalizeSheetRoleAndSection(rawRole);
            const itsNumber = r.itsNumber || r.itsnumber || r.ItsNumber || '';
            const username = (r.username || r.Username || r.email || r.Email || '').trim();
            const email = (r.email || r.Email || username).trim();

            return {
              id: itsNumber ? `sheet-${itsNumber}` : (r.id || `sheet-user-${index + 1}`),
              itsNumber,
              name: r.name || r.Name || r.fullName || r.FullName || 'Band Member',
              username,
              email,
              password: (r.password || r.Password || '786110515253').trim(),
              role,
              section,
              phone: r.phone || r.Phone || r.mobileNumber || r.MobileNumber || '',
              address: r.address || r.Address || '',
              jamaat: r.jamaat || r.Jamaat || '',
              rank: r.rank || r.Rank || `${section} Musician`,
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

  const config = getGoogleSheetConfig();
  let sheetSynced = false;

  // If Apps Script Web App URL is present, send the update
  if (config.appsScriptUrl) {
    try {
      const response = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      ? `Password successfully updated in Member Details Google Sheet and application database.`
      : `Password successfully updated for ${usernameOrEmail} in Member Details.`,
    sheetSynced,
  };
}

/**
 * Synchronizes newly marked practice attendance to Google Sheets ("Attendance Details" sheet).
 * At top marks the session date, and records Present, Absent, or Late for each member.
 */
export async function syncAttendanceToSheet(session: AttendanceSession): Promise<{
  success: boolean;
  message: string;
  sheetSynced: boolean;
}> {
  const config = getGoogleSheetConfig();
  const rawDate = session.date.includes('T') ? session.date.split('T')[0] : session.date;
  const parts = rawDate.split('-');
  const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : rawDate;

  if (!config.appsScriptUrl) {
    return {
      success: true,
      message: `Attendance for ${formattedDate} saved to local database. (Google Apps Script URL optional for cloud sync)`,
      sheetSynced: false,
    };
  }

  try {
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        message: `Successfully synchronized attendance for ${formattedDate} to Attendance Details sheet in Google Drive.`,
        sheetSynced: true,
      };
    }
  } catch (err) {
    console.warn('Failed to sync attendance to Google Apps Script:', err);
  }

  return {
    success: true,
    message: `Attendance for ${formattedDate} saved to local database.`,
    sheetSynced: false,
  };
}

