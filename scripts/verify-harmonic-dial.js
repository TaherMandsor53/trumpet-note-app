const members = require('../src/data/members-40.json');

// Mirror HarmonicDial logic:
const map = {
  Trumpet: [],
  Saxophone: [],
  Euphonium: [],
  Trombone: [],
  Dish: [],
  SideDrum: [],
};

members.forEach(u => {
  if (u.role === 'Overall Major' || u.rank?.includes('Overall Major')) return;
  if (map[u.section]) {
    map[u.section].push(u);
  }
});

Object.keys(map).forEach(secKey => {
  map[secKey].sort((a, b) => {
    const aIsMajor = a.role.endsWith('Major') || a.role === `${secKey} Major`;
    const bIsMajor = b.role.endsWith('Major') || b.role === `${secKey} Major`;
    if (aIsMajor && !bIsMajor) return -1;
    if (!aIsMajor && bIsMajor) return 1;
    return a.name.localeCompare(b.name);
  });
});

console.log('=== HARMONIC DIAL CARD ROSTER COUNTS ===');
Object.keys(map).forEach(sec => {
  const displayName = sec === 'SideDrum' ? 'SideDrum/BaseDrum' : sec;
  console.log(`${displayName}: ${map[sec].length} Players`);
  console.log(`  Lead / First: ${map[sec][0]?.name} (${map[sec][0]?.role})`);
});

console.log('\n=== CHECKING TRUMPET SECTION MEMBERS ===');
map.Trumpet.forEach((m, idx) => {
  console.log(`  #${idx+1}: ${m.name} | ITS: ${m.itsNumber} | Role: ${m.role} | Rank: ${m.rank}`);
});

console.log('\n=== CHECKING SIDEDRUM/BASEDRUM SECTION MEMBERS ===');
map.SideDrum.forEach((m, idx) => {
  console.log(`  #${idx+1}: ${m.name} | ITS: ${m.itsNumber} | Role: ${m.role} | Rank: ${m.rank}`);
});
