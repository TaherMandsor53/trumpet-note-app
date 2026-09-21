const members = require('../src/data/members-40.json');
const assert = require('assert');

console.log('=== VERIFYING 40 MEMBERS ROSTER ===');
console.log('Total members:', members.length);
assert.strictEqual(members.length, 40, 'Must have exactly 40 members');

// 1. Husain Jujarbhai Kundawala
const husainKundawala = members.find(m => m.itsNumber === '40405101' || m.name.includes('HUSAIN JUJARBHAI KUNDAWALA'));
console.log('Husain Kundawala:', husainKundawala?.name, '| Role:', husainKundawala?.role, '| Section:', husainKundawala?.section);
assert(husainKundawala, 'Husain Kundawala must exist');
assert.strictEqual(husainKundawala.role, 'Treasurer', 'Husain Kundawala must be Treasurer');
assert.strictEqual(husainKundawala.section, 'Trumpet', 'Husain Kundawala must be in Trumpet section');

// 2. Taha Mazharbhai Kundawala
const tahaKundawala = members.find(m => m.itsNumber === '50447649' || m.name.includes('TAHA MAZHARBHAI KUNDAWALA'));
console.log('Taha Kundawala:', tahaKundawala?.name, '| Role:', tahaKundawala?.role, '| Section:', tahaKundawala?.section);
assert(tahaKundawala, 'Taha Kundawala must exist');
assert.strictEqual(tahaKundawala.role, 'Treasurer', 'Taha Kundawala must be Treasurer');
assert.strictEqual(tahaKundawala.section, 'SideDrum', 'Taha Kundawala must be in SideDrum section');

// 3. Husain Burhanbhai Kadvalwala
const husainKadvalwala = members.find(m => m.itsNumber === '40408855' || m.name.includes('Husain burhanbhai Kadvalwala') || m.name.includes('HUSAIN BURHANBHAI KADVALWALA'));
console.log('Husain Kadvalwala:', husainKadvalwala?.name, '| Role:', husainKadvalwala?.role, '| Section:', husainKadvalwala?.section);
assert(husainKadvalwala, 'Husain Kadvalwala must exist');
assert.strictEqual(husainKadvalwala.role, 'Instrument Maintainer', 'Husain Kadvalwala must be Instrument Maintainer');
assert.strictEqual(husainKadvalwala.section, 'Trumpet', 'Husain Kadvalwala must be in Trumpet section');

// 4. Section Majors
const trumpetMajor = members.find(m => m.role === 'Trumpet Major');
console.log('Trumpet Major:', trumpetMajor?.name, '| ITS:', trumpetMajor?.itsNumber);
assert(trumpetMajor && trumpetMajor.itsNumber === '40404863', 'Trumpet Major must be Taher Akbarbhai Mandsorwala');

const saxMajor = members.find(m => m.role === 'Saxophone Major');
console.log('Saxophone Major:', saxMajor?.name, '| ITS:', saxMajor?.itsNumber);
assert(saxMajor && saxMajor.itsNumber === '40405707', 'Saxophone Major must be Mustafa bhai taizoonbhai piplaya');

const euphMajor = members.find(m => m.role === 'Euphonium Major');
console.log('Euphonium Major:', euphMajor?.name, '| ITS:', euphMajor?.itsNumber);
assert(euphMajor && euphMajor.itsNumber === '40404034', 'Euphonium Major must be ABBAS BURHANUDDIN BHAI SODAWALA');

const dishMajor = members.find(m => m.role === 'Dish Major');
console.log('Dish Major:', dishMajor?.name, '| ITS:', dishMajor?.itsNumber);
assert(dishMajor && dishMajor.itsNumber === '40151901', 'Dish Major must be Burhanuddin Taher Nalawala');

const sideDrumMajor = members.find(m => m.role === 'SideDrum Major');
console.log('SideDrum Major:', sideDrumMajor?.name, '| ITS:', sideDrumMajor?.itsNumber);
assert(sideDrumMajor && sideDrumMajor.itsNumber === '40405751', 'SideDrum Major must be BURHANUDDIN ABBASBHAI GULAMALI');

console.log('\n=== SECTION BREAKDOWN ===');
const counts = {};
members.forEach(m => { counts[m.section] = (counts[m.section] || 0) + 1; });
console.log(counts);

console.log('\n✅ ALL ASSERTIONS PASSED SUCCESSFULLY!');
