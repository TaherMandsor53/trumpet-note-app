const http = require('http');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null
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

async function test() {
  console.log('--- Step 1: Testing Overall Major Credentials ---');
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

  console.log('Login 1 Status:', loginRes1.statusCode);
  console.log('User Role:', loginRes1.body?.user?.role);
  console.log('User Name:', loginRes1.body?.user?.name);
  console.log('User ITS:', loginRes1.body?.user?.itsNumber);

  const cookie1 = loginRes1.headers['set-cookie'] ? loginRes1.headers['set-cookie'][0].split(';')[0] : '';
  console.log('Cookie obtained:', !!cookie1);

  console.log('\n--- Step 2: Fetching /api/users for Overall Major ---');
  const usersRes1 = await makeRequest({
    hostname: 'localhost',
    port: 3005,
    path: '/api/users',
    method: 'GET',
    headers: { 'Cookie': cookie1 }
  });

  console.log('Users Count for Overall Major:', usersRes1.body?.users?.length);
  if (usersRes1.body?.users?.length !== 40) {
    console.error('ERROR: Expected 40 members for Overall Major, got:', usersRes1.body?.users?.length);
    process.exit(1);
  }
  console.log('SUCCESS: Exactly 40 members returned for Overall Major!');

  console.log('\n--- Step 3: Testing Trumpet Major Scoping ---');
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

  console.log('Login 2 Status:', loginRes2.statusCode);
  console.log('User Role:', loginRes2.body?.user?.role);
  const cookie2 = loginRes2.headers['set-cookie'] ? loginRes2.headers['set-cookie'][0].split(';')[0] : '';

  const usersRes2 = await makeRequest({
    hostname: 'localhost',
    port: 3005,
    path: '/api/users',
    method: 'GET',
    headers: { 'Cookie': cookie2 }
  });

  console.log('Users Count for Trumpet Major (scoped):', usersRes2.body?.users?.length);
  const nonTrumpet = usersRes2.body?.users?.filter(u => u.section !== 'Trumpet');
  console.log('Non-trumpet count:', nonTrumpet?.length);
  if (usersRes2.body?.users?.length !== 16 || nonTrumpet?.length > 0) {
    console.error('ERROR: Scoping failed for Trumpet Major!');
    process.exit(1);
  }
  console.log('SUCCESS: Trumpet Major correctly sees only 16 Trumpet members!');

  console.log('\n--- Step 4: Testing Trumpet Major with all=true (Org Chart query) ---');
  const usersRes2All = await makeRequest({
    hostname: 'localhost',
    port: 3005,
    path: '/api/users?all=true',
    method: 'GET',
    headers: { 'Cookie': cookie2 }
  });
  console.log('Users Count for Trumpet Major with all=true:', usersRes2All.body?.users?.length);
  if (usersRes2All.body?.users?.length !== 40) {
    console.error('ERROR: Expected 40 members for Org Chart with all=true');
    process.exit(1);
  }
  console.log('SUCCESS: Org Chart query with all=true correctly returns all 40 members!');

  console.log('\nALL SCOPING AND CREDENTIAL TESTS PASSED PERFECTLY!');
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
