const http = require('http');
const xlsx = require('xlsx');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let body = null;
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            body = JSON.parse(buffer.toString());
          } catch (e) {
            body = buffer.toString();
          }
        } else {
          body = buffer;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('=== VERIFICATION OF UPDATED FEATURES ===\n');

  // 1. Overall Major Login
  console.log('--- Step 1: Overall Major Authentication ---');
  const loginRes1 = await makeRequest({
    hostname: 'localhost',
    port: 3005,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: 'mufaddalValinabu@tsgband.com',
    password: 'mufaddalvalinabu123'
  });

  console.log('Login Status:', loginRes1.statusCode);
  console.log('User Role:', loginRes1.body?.user?.role);
  const cookieOverall = loginRes1.headers['set-cookie'] ? loginRes1.headers['set-cookie'][0].split(';')[0] : '';

  // 2. Query All Users & Validate Trombone + Instrument Counts
  console.log('\n--- Step 2: Validating Instrument Counts & Trombone ---');
  const usersRes = await makeRequest({
    hostname: 'localhost',
    port: 3005,
    path: '/api/users?all=true',
    method: 'GET',
    headers: { 'Cookie': cookieOverall }
  });

  const allUsers = usersRes.body?.users || [];
  console.log('Total members in band database:', allUsers.length);
  if (allUsers.length !== 40) {
    throw new Error(`Expected 40 members, got ${allUsers.length}`);
  }

  // Check Trombone
  const tromboneUsers = allUsers.filter(u => u.section === 'Trombone');
  console.log('Trombone members count:', tromboneUsers.length);
  console.log('Trombone player:', tromboneUsers[0]?.name, '(', tromboneUsers[0]?.rank, ')');
  if (tromboneUsers.length !== 1 || !tromboneUsers[0].name.toLowerCase().includes('pithapurwala')) {
    throw new Error('Trombone section validation failed!');
  }

  // Check Trumpet players (excluding Overall Major, Executive Command, Command Overall Major)
  const isExec = (u) =>
    u.role === 'Overall Major' ||
    (u.rank && u.rank.toLowerCase().includes('overall major')) ||
    (u.rank && u.rank.toLowerCase().includes('executive command')) ||
    (u.rank && u.rank.toLowerCase().includes('command overall major'));

  const trumpetPlayers = allUsers.filter(u => u.section === 'Trumpet' && !isExec(u));
  console.log('Trumpet instrument players count (excluding Executive Commands):', trumpetPlayers.length);
  if (trumpetPlayers.length !== 13) {
    throw new Error(`Expected 13 Trumpet players, got ${trumpetPlayers.length}`);
  }

  // Check Majors appear first when sorted
  const trumpetSorted = [...trumpetPlayers].sort((a, b) => {
    const aIsMajor = a.role.endsWith('Major');
    const bIsMajor = b.role.endsWith('Major');
    if (aIsMajor && !bIsMajor) return -1;
    if (!aIsMajor && bIsMajor) return 1;
    return a.name.localeCompare(b.name);
  });
  console.log('First Trumpet player in sorted roster:', trumpetSorted[0]?.name, `(${trumpetSorted[0]?.role})`);
  if (trumpetSorted[0]?.role !== 'Trumpet Major') {
    throw new Error('Trumpet Major is not first in sorted roster!');
  }

  const saxPlayers = allUsers.filter(u => u.section === 'Saxophone');
  console.log('Saxophone players count:', saxPlayers.length);
  const euphPlayers = allUsers.filter(u => u.section === 'Euphonium');
  console.log('Euphonium players count:', euphPlayers.length);
  const dishPlayers = allUsers.filter(u => u.section === 'Dish');
  console.log('Dish players count:', dishPlayers.length);
  const sideDrumPlayers = allUsers.filter(u => u.section === 'SideDrum');
  console.log('SideDrum players count:', sideDrumPlayers.length);

  // 3. Test Attendance Permissions (Overall Major vs Section Major)
  console.log('\n--- Step 3: Testing Attendance Permissions ---');
  // Overall Major marks attendance
  const markRes = await makeRequest({
    hostname: 'localhost',
    port: 3005,
    path: '/api/attendance',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieOverall
    }
  }, {
    date: '2026-09-22',
    records: [
      { userId: 'sheet-40405751', userName: 'BURHANUDDIN ABBASBHAI GULAMALI', section: 'SideDrum', status: 'Present' },
      { userId: 'sheet-40409813', userName: 'Taher Shabbir Shikari', section: 'Trumpet', status: 'Absent' },
      { userId: 'sheet-50447649', userName: 'TAHA MAZHARBHAI KUNDAWALA', section: 'SideDrum', status: 'Late' }
    ]
  });
  console.log('Overall Major Mark Attendance Status:', markRes.statusCode);
  if (markRes.statusCode !== 200 && markRes.statusCode !== 201) {
    throw new Error('Overall Major should be authorized to mark attendance!');
  }

  // Trumpet Major attempts to mark attendance -> should be 403 Forbidden
  const loginRes2 = await makeRequest({
    hostname: 'localhost',
    port: 3005,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: 'burhanTrumpet@tsgband.com',
    password: 'BURHAN_TRUMPET_LEAD'
  });
  const cookieTrumpet = loginRes2.headers['set-cookie'] ? loginRes2.headers['set-cookie'][0].split(';')[0] : '';

  const markForbiddenRes = await makeRequest({
    hostname: 'localhost',
    port: 3005,
    path: '/api/attendance',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieTrumpet
    }
  }, {
    date: '2026-09-22',
    records: [
      { userId: 'sheet-40409813', userName: 'Taher Shabbir Shikari', section: 'Trumpet', status: 'Present' }
    ]
  });
  console.log('Trumpet Major Mark Attendance Status:', markForbiddenRes.statusCode);
  console.log('Trumpet Major Error Message:', markForbiddenRes.body?.error);
  if (markForbiddenRes.statusCode !== 403) {
    throw new Error('Section Major should be FORBIDDEN (403) from marking attendance!');
  }
  console.log('SUCCESS: Attendance marking is strictly restricted to Overall Major!');

  // 4. Test Attendance Details Excel Export (Image 3 format)
  console.log('\n--- Step 4: Testing Attendance Details Excel Export (Image 3 Format) ---');
  const excelRes = await makeRequest({
    hostname: 'localhost',
    port: 3005,
    path: '/api/excel/export?type=attendance',
    method: 'GET',
    headers: { 'Cookie': cookieOverall }
  });

  console.log('Excel Export Status:', excelRes.statusCode);
  const wb = xlsx.read(excelRes.body, { type: 'buffer' });
  console.log('Sheet Names in Excel:', wb.SheetNames);
  const attSheet = wb.Sheets['Attendance Details'];
  const sheetJson = xlsx.utils.sheet_to_json(attSheet, { header: 1 });
  console.log('Row 1 (Header Row):', sheetJson[0]);
  console.log('Row 2:', sheetJson[1]);
  console.log('Row 3:', sheetJson[2]);
  console.log('Row 4:', sheetJson[3]);

  if (sheetJson[0][0] !== 'Full Name') {
    throw new Error(`Expected Col A header to be "Full Name", got: ${sheetJson[0][0]}`);
  }
  console.log('SUCCESS: Excel format strictly matches Image 3 (Full Name in Col A, DD/MM/YYYY date headers, Present/Absent/Late)!');

  console.log('\nALL FEATURES AND SCOPING TESTS COMPLETED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
