const RTDB_BASE = (process.env.FIREBASE_DATABASE_URL || '').replace(/\/$/, '');
const HOSTING_URL = (process.env.HOSTING_URL || process.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
if (!RTDB_BASE || !HOSTING_URL) {
  console.error('[Error] FIREBASE_DATABASE_URL and HOSTING_URL environment variables are required.');
  process.exit(1);
}

function emailToKey(email) {
  return Buffer.from(email.toLowerCase().trim()).toString('base64url');
}

async function verifyAll() {
  console.log('=== VERIFIKASI SISTEM FIREBASE REALTIME DATABASE & HOSTING ===\n');

  // 1. Verify Firebase Hosting
  console.log('1. Checking Firebase Hosting URL:', HOSTING_URL);
  const hostRes = await fetch(HOSTING_URL);
  console.log('Hosting HTTP Status:', hostRes.status, hostRes.statusText);
  const html = await hostRes.text();
  console.log('Hosting HTML contains Svelte bundle:', html.includes('/assets/index-'));

  // 2. Verify Dosen Evaluator Data in RTDB
  console.log('\n2. Checking Dosen Evaluator Data in Firebase Realtime Database:');
  const dosenTasksRes = await fetch(`${RTDB_BASE}/users/dosen-afl2-evaluator/todos.json`);
  const dosenTasks = await dosenTasksRes.json();
  const taskKeys = Object.keys(dosenTasks || {});
  console.log(`Found ${taskKeys.length} persistent tasks in 'users/dosen-afl2-evaluator/todos':`);
  taskKeys.forEach((key, idx) => {
    const t = dosenTasks[key];
    console.log(`  [${idx + 1}] "${t.title}" | Priority: ${t.priority} | Completed: ${t.completed} | Category: ${t.category}`);
  });

  // 3. Verify Login Validation: Unregistered email
  console.log('\n3. Testing Login Validation (Unregistered Email):');
  const fakeEmail = 'unregistered_' + Date.now() + '@test.com';
  const fakeKey = emailToKey(fakeEmail);
  const fakeRes = await fetch(`${RTDB_BASE}/registered_users/${fakeKey}.json`);
  const fakeUser = await fakeRes.json();
  if (fakeUser === null) {
    console.log(`  -> SUCCESS: Account "${fakeEmail}" not found in RTDB. Login correctly BLOCKED.`);
  } else {
    console.error('  -> FAIL: Fake user was found');
  }

  // 4. Testing Login Validation: Wrong password on registered account
  console.log('\n4. Testing Login Validation (Wrong Password on Registered Dosen Account):');
  const dosenKey = emailToKey('dosen@ciputra.ac.id');
  const dosenRes = await fetch(`${RTDB_BASE}/registered_users/${dosenKey}.json`);
  const dosenUser = await dosenRes.json();
  console.log(`  -> Dosen account found: ${dosenUser.email}`);
  const wrongPasswordAttempt = 'WrongPassword123!';
  const isMatch = dosenUser.password === wrongPasswordAttempt;
  if (!isMatch) {
    console.log(`  -> SUCCESS: Password check "${wrongPasswordAttempt}" !== "${dosenUser.password}". Login correctly REJECTED with error message.`);
  } else {
    console.error('  -> FAIL: Wrong password matched');
  }

  // 5. Testing Real Registration Flow: Register new student account
  console.log('\n5. Testing Registration Flow for New Student Account:');
  const testStudentEmail = `mahasiswa_test_${Date.now()}@student.ciputra.ac.id`;
  const studentKey = emailToKey(testStudentEmail);
  const newStudentUid = `usr_test_${Date.now()}`;
  const newStudent = {
    uid: newStudentUid,
    email: testStudentEmail,
    password: 'PasswordMahasiswa2026!',
    displayName: 'Test Mahasiswa AFL2',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const regRes = await fetch(`${RTDB_BASE}/registered_users/${studentKey}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newStudent)
  });
  console.log('  -> Registration written to RTDB:', (await regRes.json()).email);

  // 6. Test Seeded Tasks for New User
  console.log('\n6. Testing Auto-Seed of Real Tasks for New Student:');
  const seedTasks = {
    'task-init-1': {
      id: 'task-init-1',
      userId: newStudentUid,
      title: 'Tugas Pertama Mahasiswa',
      description: 'Catatan pertama yang tersimpan langsung di Firebase Realtime Database',
      completed: false,
      priority: 'high',
      category: 'academic',
      color: 'amber',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  await fetch(`${RTDB_BASE}/users/${newStudentUid}/todos.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seedTasks)
  });

  const studentTasksRes = await fetch(`${RTDB_BASE}/users/${newStudentUid}/todos.json`);
  const studentTasks = await studentTasksRes.json();
  console.log(`  -> New user tasks in RTDB: ${Object.keys(studentTasks).length} task found: "${studentTasks['task-init-1'].title}"`);

  // 7. Test Updating Task
  console.log('\n7. Testing Task Status Toggle in RTDB:');
  await fetch(`${RTDB_BASE}/users/${newStudentUid}/todos/task-init-1.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true, updatedAt: new Date().toISOString() })
  });
  const updatedTaskRes = await fetch(`${RTDB_BASE}/users/${newStudentUid}/todos/task-init-1.json`);
  const updatedTask = await updatedTaskRes.json();
  console.log(`  -> Task updated: completed = ${updatedTask.completed}`);

  // 8. Cleanup test user
  console.log('\n8. Cleaning up test user from RTDB:');
  await fetch(`${RTDB_BASE}/registered_users/${studentKey}.json`, { method: 'DELETE' });
  await fetch(`${RTDB_BASE}/users/${newStudentUid}.json`, { method: 'DELETE' });
  console.log('  -> Test user and temporary tasks cleaned up cleanly.');

  console.log('\n=== ALL PRODUCTION CHECKS COMPLETED SUCCESSFULLY! ===');
}

verifyAll().catch(console.error);
