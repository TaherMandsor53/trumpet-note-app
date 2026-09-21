const XLSX = require('xlsx');
const wb = XLSX.readFile('src/data/TAHERI_SCOUT_BAND_GROUP_1448H.xlsx');
const sheet = wb.Sheets['Responses'];
const rows = XLSX.utils.sheet_to_json(sheet);
rows.forEach((r, idx) => {
  console.log((idx+1) + ': S.NO=' + r['S.NO'] + ', ITS=' + r['1. Its number '] + ', Name=' + r['2. Full Name'] + ', Inst=' + r['6. Select Your Instruments ']);
});
