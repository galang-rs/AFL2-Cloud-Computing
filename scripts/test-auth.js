const RTDB_BASE = 'https://afl2-7e2a5-default-rtdb.asia-southeast1.firebasedatabase.app';

function emailToKey(email) {
  return Buffer.from(email.toLowerCase().trim()).toString('base64url');
}

async function testFlow() {
  // 1. Test login unregistered
  const unregKey = emailToKey('unregistered@test.com');
  const res1 = await fetch(`${RTDB_BASE}/registered_users/${unregKey}.json`);
  const user1 = await res1.json();
  console.log('1. Unregistered check (should be null):', user1 === null ? 'PASS' : 'FAIL');

  // 2. Test login registered
  const dosenKey = emailToKey('dosen@ciputra.ac.id');
  const res2 = await fetch(`${RTDB_BASE}/registered_users/${dosenKey}.json`);
  const user2 = await res2.json();
  console.log('2. Registered check:', user2 ? 'PASS (found ' + user2.email + ')' : 'FAIL');
  console.log('2b. Password check wrong:', user2.password === 'wrongpass' ? 'FAIL' : 'PASS (rejected)');
  console.log('2c. Password check correct:', user2.password === 'password123' ? 'PASS (accepted)' : 'FAIL');
}

testFlow().catch(console.error);
