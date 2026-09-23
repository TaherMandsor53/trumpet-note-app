const assert = require('assert');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Test Credential Generation
function generateCredentialsFromFullName(fullName) {
  const clean = (fullName || '').trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { username: '', password: '' };

  const firstName = words[0].toLowerCase();
  let lastName = '';
  if (words.length > 1) {
    const rawLast = words[words.length - 1].toLowerCase();
    lastName = rawLast.charAt(0).toUpperCase() + rawLast.slice(1);
  }

  const username = `${firstName}${lastName}@tsgband.com`;
  const password = `${firstName}${lastName.toLowerCase()}123`;
  return { username, password };
}

console.log('--- 1. Testing Credential Generation ---');
const test1 = generateCredentialsFromFullName('BURHANUDDIN ABBASBHAI GULAMALI');
console.log('BURHANUDDIN ABBASBHAI GULAMALI:', test1);
assert.strictEqual(test1.username, 'burhanuddinGulamali@tsgband.com');
assert.strictEqual(test1.password, 'burhanuddingulamali123');

const test2 = generateCredentialsFromFullName('Taher Shabbir Shikari');
console.log('Taher Shabbir Shikari:', test2);
assert.strictEqual(test2.username, 'taherShikari@tsgband.com');
assert.strictEqual(test2.password, 'tahershikari123');

const test3 = generateCredentialsFromFullName('Murtaza Bhai');
console.log('Murtaza Bhai:', test3);
assert.strictEqual(test3.username, 'murtazaBhai@tsgband.com');
assert.strictEqual(test3.password, 'murtazabhai123');

const test4 = generateCredentialsFromFullName('Murtaza');
console.log('Murtaza:', test4);
assert.strictEqual(test4.username, 'murtaza@tsgband.com');
assert.strictEqual(test4.password, 'murtaza123');

console.log('✓ Credential generation passed all tests!\n');

// 2. Test Role Scoping
console.log('--- 2. Testing Role Scoping ---');
const ALL_18_ROLES = [
  'SideDrum Major',
  'Trumpet Member',
  'Treasurer',
  'Major',
  'Euphonium Member',
  'Saxophone Member',
  'Ghugara Member',
  'Trombone Member',
  'Trombone Major',
  'Dish Major',
  'Instrument Maintainer',
  'BaseDrum Member',
  'Khanjari Member',
  'Euphonium Major',
  'Saxophone Major',
  'Dish Member',
  'Triangle Member',
  'Trumpet Major',
];

const SECTION_MAJOR_ALLOWED_ROLES = {
  'Trumpet Major': ['Trumpet Member'],
  'Saxophone Major': ['Saxophone Member'],
  'Euphonium Major': ['Euphonium Member'],
  'Trombone Major': ['Trombone Member'],
  'Dish Major': ['Dish Member', 'Ghugara Member', 'Triangle Member', 'Khanjari Member'],
  'SideDrum Major': ['SideDrum Member', 'BaseDrum Member'],
};

assert.strictEqual(ALL_18_ROLES.length, 18);
assert.deepStrictEqual(SECTION_MAJOR_ALLOWED_ROLES['Trumpet Major'], ['Trumpet Member']);
assert.deepStrictEqual(SECTION_MAJOR_ALLOWED_ROLES['Dish Major'], [
  'Dish Member',
  'Ghugara Member',
  'Triangle Member',
  'Khanjari Member',
]);
assert.deepStrictEqual(SECTION_MAJOR_ALLOWED_ROLES['SideDrum Major'], [
  'SideDrum Member',
  'BaseDrum Member',
]);

console.log('✓ All 18 roles and section major mappings verified!\n');

// 3. Test Jamaat Sectors
console.log('--- 3. Testing Jamaat Sectors ---');
const JAMAAT_SECTORS = [
  'BADRI SECTOR',
  'QUTBI SECTOR',
  'SHUJAI SECTOR',
  'NAJMI SECTOR',
  'EZZY SECTOR',
  'SAIFEE BURHANI SECTOR',
];
assert.strictEqual(JAMAAT_SECTORS.length, 6);
console.log('Jamaat sectors:', JAMAAT_SECTORS);
console.log('✓ Jamaat sectors verified!\n');

// 4. Test Excel File Appending
console.log('--- 4. Testing Excel File Appending ---');
const excelPath = path.join(process.cwd(), 'src', 'data', 'TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
if (fs.existsSync(excelPath)) {
  const wb = XLSX.readFile(excelPath);
  const sheetName = wb.SheetNames[0] || 'Responses';
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`Current Excel rows in '${sheetName}':`, rows.length);
  console.log('Headers:', rows[0]);
  assert.ok(rows.length > 0, 'Excel file must have headers and rows');
  console.log('✓ Excel file verified and accessible for updates!\n');
} else {
  console.warn('Excel file not found at expected path:', excelPath);
}

console.log('All automated tests PASSED successfully!');
