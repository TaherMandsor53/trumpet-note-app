const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2ojTVI69euWc18V3ITFjrNNS7ZxFG7UcaEySNeXbjIZqoSIvy5An6QDqUyWF5bg1v/exec';

function normalizeSheetRoleAndSection(rawRole) {
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

function getSheetProp(obj, ...keys) {
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

async function runSync() {
  console.log('Fetching members from Google Sheet via Apps Script Web App...');
  const res = await fetch(`${APPS_SCRIPT_URL}?action=getMembers&sheet=Member Details`);
  const data = await res.json();
  const members = data.members || [];
  console.log(`Fetched ${members.length} members from Google Sheet.`);

  if (members.length === 0) {
    console.error('No members returned from Google Sheet!');
    return;
  }

  const existing40Path = path.join(__dirname, '../src/data/members-40.json');
  let existingMap = new Map();
  if (fs.existsSync(existing40Path)) {
    try {
      const existingUsers = JSON.parse(fs.readFileSync(existing40Path, 'utf8'));
      existingUsers.forEach(u => {
        if (u.itsNumber) existingMap.set(String(u.itsNumber).trim(), u);
      });
    } catch (e) {}
  }

  const syncedUsers = members.map((r, index) => {
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

    const prev = existingMap.get(String(itsNumber).trim()) || {};

    return {
      id: itsNumber ? `sheet-${itsNumber}` : `sheet-user-${index + 1}`,
      itsNumber,
      name,
      username: username || prev.username || `${name.toLowerCase().split(/\s+/)[0]}@tsgband.com`,
      email,
      password: password || prev.password || '786110515253',
      role,
      section,
      phone: phone || prev.phone || '',
      address: address || prev.address || '',
      jamaat: jamaat || prev.jamaat || '',
      rank: `${role}`,
      joinedDate: prev.joinedDate || '2024-01-15',
      active: true,
    };
  });

  // 1. Write members-40.json
  fs.writeFileSync(existing40Path, JSON.stringify(syncedUsers, null, 2), 'utf8');
  console.log(`Updated ${existing40Path} with ${syncedUsers.length} members.`);

  // 2. Update local Excel TAHERI_SCOUT_BAND_GROUP_1448H.xlsx
  const excelPath = path.join(__dirname, '../src/data/TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
  if (fs.existsSync(excelPath)) {
    const wb = xlsx.readFile(excelPath);
    const targetSheets = ['Responses', 'Member Details'];

    const headers = [
      'S.NO',
      '1. Its number ',
      '2. Full Name',
      '3. Address',
      '4. Mobile Number',
      '5. Jamaat',
      '6. Select Your Instruments ',
      '7. UserName',
      '8. Password',
    ];

    const rows = [headers];
    syncedUsers.forEach((u, idx) => {
      rows.push([
        idx + 1,
        u.itsNumber,
        u.name,
        u.address,
        u.phone,
        u.jamaat,
        u.role,
        u.username,
        u.password,
      ]);
    });

    targetSheets.forEach(sheetName => {
      wb.Sheets[sheetName] = xlsx.utils.aoa_to_sheet(rows);
      if (!wb.SheetNames.includes(sheetName)) {
        wb.SheetNames.push(sheetName);
      }
    });

    xlsx.writeFile(wb, excelPath);
    console.log(`Updated local Excel workbook at ${excelPath} with ${syncedUsers.length} members in both Member Details and Responses.`);
  }

  console.log('\n--- SECTION MAJORS & LEADERSHIP SUMMARY ---');
  syncedUsers.filter(u => u.role.includes('Major')).forEach(u => {
    console.log(`${u.itsNumber} | ${u.name} -> ${u.role} (${u.section})`);
  });
}

runSync().catch(err => console.error(err));
