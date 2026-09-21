const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = fs.existsSync('src/data/TAHERI_SCOUT_BAND_GROUP_1448H.xlsx')
  ? 'src/data/TAHERI_SCOUT_BAND_GROUP_1448H.xlsx'
  : 'C:\\Users\\taher\\Downloads\\TAHERI SCOUT BAND GROUP 1448H.xlsx';

const wb = XLSX.readFile(excelPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet);

function cleanName(str) {
  return (str || '').trim().replace(/\s+/g, ' ');
}

function normalizeSectionAndRole(rawInstrument, rawName, itsNumber) {
  const inst = (rawInstrument || '').toLowerCase().trim();
  const name = rawName.toUpperCase();
  const its = String(itsNumber || '').trim();

  // 1. Executive Overall Major mappings
  if (its === '40403000' || name.includes('MUFADDAL ABIZARBHAI VALINABU')) {
    return { section: 'Trumpet', role: 'Overall Major', rank: 'Band Commander / Overall Major' };
  }
  if (its === '40408012' || name.includes('M ISMAIL SH YUSUFBHAI ZOZWALA')) {
    return { section: 'Trumpet', role: 'Overall Major', rank: 'Executive Overall Major' };
  }
  if (its === '50445270' || name.includes('HUSSAIN HANNANBHAI MULLAMITHAWALA')) {
    return { section: 'Trumpet', role: 'Overall Major', rank: 'Command Overall Major' };
  }

  // 2. Authentic Section Majors (from sheet & historical band leadership)
  // Trumpet Major: Taher Akbarbhai Mandsorwala
  if (its === '40404863' || name.includes('TAHER AKBARBHAI MANDSORWALA')) {
    return { section: 'Trumpet', role: 'Trumpet Major', rank: 'Trumpet Section Major / Lead Voice' };
  }
  // Saxophone Major: Mustafa bhai taizoonbhai bhai piplaya
  if (its === '40405707' || name.includes('MUSTAFA BHAI TAIZOONBHAI BHAI PIPLAYA')) {
    return { section: 'Saxophone', role: 'Saxophone Major', rank: 'Saxophone Section Major / Woodwind Lead' };
  }
  // Euphonium Major: ABBAS BURHANUDDIN BHAI SODAWALA
  if (its === '40404034' || name.includes('ABBAS BURHANUDDIN BHAI SODAWALA')) {
    return { section: 'Euphonium', role: 'Euphonium Major', rank: 'Euphonium Section Major / Low Brass Lead' };
  }
  // Dish Major: Burhanuddin Taher Nalawala
  if (its === '40151901' || name.includes('BURHANUDDIN TAHER NALAWALA')) {
    return { section: 'Dish', role: 'Dish Major', rank: 'Dish & Cymbals Section Major / Cadence Lead' };
  }
  // SideDrum / BaseDrum Major: BURHANUDDIN ABBASBHAI GULAMALI
  if (its === '40405751' || name.includes('BURHANUDDIN ABBASBHAI GULAMALI')) {
    return { section: 'SideDrum', role: 'SideDrum Major', rank: 'SideDrum & BaseDrum Section Major / Percussion Lead' };
  }

  // 3. User Specific Appointed Roles & Sections:
  // "Also HUSAIN JUJARBHAI KUNDAWALA will Treasurer and Trumpet Member so show him in Trumpet section"
  if (its === '40405101' || name.includes('HUSAIN JUJARBHAI KUNDAWALA')) {
    return { section: 'Trumpet', role: 'Treasurer', rank: 'Band Treasurer & Trumpet Musician' };
  }
  // "TAHA MAZHARBHAI KUNDAWALA will be Treasurer and SideDrum Member so show him in SideDrum section"
  if (its === '50447649' || name.includes('TAHA MAZHARBHAI KUNDAWALA')) {
    return { section: 'SideDrum', role: 'Treasurer', rank: 'Band Treasurer & SideDrum/BaseDrum Musician' };
  }
  // "HUSAIN BURHANBHAI KADVALWALA will be Instrument Maintainer and Trumpet Member so show him in Trumpet section"
  if (its === '40408855' || name.includes('HUSAIN BURHANBHAI KADVALWALA')) {
    return { section: 'Trumpet', role: 'Instrument Maintainer', rank: 'Instrument Maintainer & Trumpet Musician' };
  }

  // 4. Instrument section categorization for all other band members
  if (inst.includes('trumpet')) {
    return { section: 'Trumpet', role: 'Band Member / Player', rank: 'Trumpet Musician' };
  }
  if (inst.includes('saxophone')) {
    return { section: 'Saxophone', role: 'Band Member / Player', rank: 'Saxophone Musician' };
  }
  if (inst.includes('trombone')) {
    return { section: 'Trombone', role: 'Band Member / Player', rank: 'Trombone Musician' };
  }
  if (inst.includes('euphonium')) {
    return { section: 'Euphonium', role: 'Band Member / Player', rank: 'Euphonium Musician' };
  }
  if (inst.includes('three drum') || inst.includes('side drum') || inst.includes('base drum') || inst.includes('drum') || inst.includes('snare')) {
    return { section: 'SideDrum', role: 'Band Member / Player', rank: 'SideDrum/BaseDrum Musician' };
  }
  if (inst.includes('dish') || inst.includes('ghugara') || inst.includes('khanjari') || inst.includes('triangle')) {
    return { section: 'Dish', role: 'Band Member / Player', rank: 'Dish & Auxiliary Percussion' };
  }

  return { section: 'Trumpet', role: 'Band Member / Player', rank: 'Trumpet Musician' };
}

const members = rawRows.map((r, i) => {
  const itsNumber = String(r['1. Its number '] || r['Its number'] || r.ITS || '').trim();
  const name = cleanName(r['2. Full Name'] || r.Name || '');
  const address = cleanName(r['3. Address'] || r.Address || '');
  const phone = String(r['4. Mobile Number'] || r.Mobile || '').trim();
  const jamaat = cleanName(r['5. Jamaat'] || r.Jamaat || '');
  const rawInstrument = cleanName(r['6. Select Your Instruments '] || r.Instrument || '');

  const { section, role, rank } = normalizeSectionAndRole(rawInstrument, name, itsNumber);

  // Clean username & email
  const nameParts = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const firstName = nameParts[0] || 'member';
  const lastName = nameParts[nameParts.length - 1] || String(i + 1);
  let username = (firstName + (nameParts.length > 1 ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : '')).trim();

  // Specific username overrides for easy login
  if (itsNumber === '40403000') username = 'mufaddalValinabu';
  if (itsNumber === '40404863') username = 'taherMandsorwala';
  if (itsNumber === '40405600') username = 'burhanKundawala';
  if (itsNumber === '40405751') username = 'burhanGulamali';
  if (itsNumber === '40405101') username = 'husainKundawala';
  if (itsNumber === '50447649') username = 'tahaKundawala';
  if (itsNumber === '40408855') username = 'husainKadvalwala';

  let email = username.toLowerCase() + '@tsgband.com';
  if (itsNumber === '40403000') email = 'mufaddalValinabu@tsgband.com';

  let password = '786110515253';
  if (itsNumber === '40403000') password = 'mufaddalvalinabu123';

  return {
    id: itsNumber ? 'sheet-' + itsNumber : 'sheet-user-' + (i + 1),
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
    rank,
    joinedDate: '2024-01-15',
    active: true,
  };
});

// Save to data/ as backup
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/members-40.json', JSON.stringify(members, null, 2));

console.log('Successfully written 40 members to src/data/members-40.json!');
console.log('Total count:', members.length);
const counts = {};
members.forEach(m => { counts[m.section] = (counts[m.section] || 0) + 1; });
console.log('Section counts:', counts);
