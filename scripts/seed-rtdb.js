// Seed script for Firebase Realtime Database with REAL student & evaluation data
const RTDB_BASE = 'https://afl2-7e2a5-default-rtdb.asia-southeast1.firebasedatabase.app';

function sanitizeEmail(email) {
  return Buffer.from(email.toLowerCase().trim()).toString('base64url');
}

const now = Date.now();

const realStudentTasks = [
  {
    id: 'task-1',
    title: 'Mengerjakan Laporan Proyek AFL2 Pemrograman Web',
    description: 'Menyusun laporan implementasi sistem, arsitektur NoSQL Firebase Realtime Database, dan dokumentasi fitur Kanban.',
    completed: true,
    priority: 'high',
    category: 'academic',
    color: 'amber',
    dueDate: '2026-09-30',
    createdAt: new Date(now - 3600000 * 8).toISOString(),
    updatedAt: new Date(now - 3600000 * 2).toISOString(),
  },
  {
    id: 'task-2',
    title: 'Persiapan Demonstrasi Proyek ke Dosen Penguji',
    description: 'Menyiapkan skenario uji coba fitur autentikasi, pembuatan sticky note baru, filter prioritas, dan live sync.',
    completed: true,
    priority: 'urgent',
    category: 'work',
    color: 'rose',
    dueDate: '2026-10-01',
    createdAt: new Date(now - 3600000 * 6).toISOString(),
    updatedAt: new Date(now - 3600000 * 1).toISOString(),
  },
  {
    id: 'task-3',
    title: 'Review Materi Kuliah Cloud Database & BaaS',
    description: 'Mempelajari kembali konsep sinkronisasi WebSocket, struktur JSON tree, dan security rules pada Firebase.',
    completed: false,
    priority: 'high',
    category: 'academic',
    color: 'sky',
    dueDate: '2026-10-03',
    createdAt: new Date(now - 3600000 * 4).toISOString(),
    updatedAt: new Date(now - 3600000 * 4).toISOString(),
  },
  {
    id: 'task-4',
    title: 'Diskusi Koordinasi Finalisasi Antarmuka Kanban',
    description: 'Memastikan estetika visual papan sticky notes, animasi drag & drop, serta mode gelap dan terang berfungsi sempurna.',
    completed: false,
    priority: 'medium',
    category: 'work',
    color: 'emerald',
    dueDate: '2026-10-05',
    createdAt: new Date(now - 3600000 * 2).toISOString(),
    updatedAt: new Date(now - 3600000 * 2).toISOString(),
  },
  {
    id: 'task-5',
    title: 'Membeli Buku Referensi Web Development Modern',
    description: 'Membeli buku pegangan perancangan antarmuka komponen Svelte dan Tailwind CSS untuk referensi belajar.',
    completed: false,
    priority: 'low',
    category: 'personal',
    color: 'yellow',
    dueDate: '2026-10-08',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  },
];

async function seedUserTasks(userId) {
  const dict = {};
  for (const t of realStudentTasks) {
    dict[t.id] = { ...t, userId };
  }
  const res = await fetch(`${RTDB_BASE}/users/${userId}/todos.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dict),
  });
  const data = await res.json();
  console.log(`Seeded tasks for user ${userId}:`, Object.keys(data).length, 'items');
}

async function seedRegisteredUsers() {
  const users = [
    {
      uid: 'dosen-afl2-evaluator',
      email: 'dosen@ciputra.ac.id',
      password: 'password123',
      displayName: 'Elizabeth Nathania Wintanto',
      role: 'dosen',
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'student-afl2-evaluator',
      email: 'student@ciputra.ac.id',
      password: 'password123',
      displayName: 'Mahasiswa AFL2',
      role: 'student',
      createdAt: new Date().toISOString(),
    }
  ];

  for (const u of users) {
    const key = sanitizeEmail(u.email);
    const res = await fetch(`${RTDB_BASE}/registered_users/${key}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u),
    });
    const data = await res.json();
    console.log(`Registered user in RTDB: ${u.email} ->`, data.uid);
    await seedUserTasks(u.uid);
  }
}

async function main() {
  console.log('Seeding REAL tasks to Firebase Realtime Database:', RTDB_BASE);
  await seedRegisteredUsers();
  await seedUserTasks('default-user');

  // Student accounts remain clean/blank upon registration per requirements

  console.log('ALL REAL DATA SUCCESSFULLY SEEDED TO FIREBASE REALTIME DATABASE!');
}

main().catch(console.error);
