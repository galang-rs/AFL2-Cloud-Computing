# AFL2 Cloud Computing — Sticky Notes Kanban Board

Aplikasi manajemen tugas harian interaktif bergaya sticky notes kanban board, dibangun menggunakan arsitektur Cloud Computing berbasis Frontend SPA (**Svelte 5**, **TypeScript**, **TailwindCSS**), Backend-as-a-Service (**Firebase Realtime Database**), serta Serverless Backend API (**Firebase Cloud Functions / Hono**).

- **Production URL**: https://afl2-7e2a5.web.app
- **Firebase Project ID**: `afl2-7e2a5`
- **Database Endpoint**: `https://afl2-7e2a5-default-rtdb.asia-southeast1.firebasedatabase.app`

---

## 1. Arsitektur Sistem & Aliran Data (Data Flow)

Aplikasi mengimplementasikan pemisahan tanggung jawab yang jelas antara layer presentasi, state management reaktif, dan layer persistensi cloud secara realtime.

```text
[ Browser Client A ] <--- WebSocket (onValue) ---> [ Firebase Realtime Database ]
         |                                                    ^
   (Auth / CRUD)                                              |
         v                                                    |
[ Svelte Reactive Store ] --- REST / Client SDK -------------+
         ^
         |
[ Browser Client B ] <--- WebSocket (onValue) --- (Sinkronisasi Otomatis)
```

### A. Alur Autentikasi & Indeks Pengguna (`email_index`)
1. **Registrasi Mahasiswa Baru**:
   - Pengguna memasukkan Nama, Email, dan Password pada form registrasi.
   - Sistem melakukan hashing terhadap identitas email menjadi safe-key: `sanitizeEmail(email)` (contoh: `user@mail.com` -> `user_at_mail_dot_com`).
   - Sistem memeriksa path `email_index/{encodedEmail}` pada Realtime Database untuk mencegah duplikasi akun.
   - Profil pengguna dibuat di path `users/{userId}/profile`.
   - **Aturan Papan Bersih**: Akun mahasiswa baru diinisialisasi tanpa data dummy (`todos: null`), sehingga papan tugas langsung bersih (kosongan) siap digunakan.
2. **Login & Multi-Device Resolution**:
   - Saat pengguna login dari browser mana pun (Chrome, Edge, Incognito, atau Mobile), sistem membaca `email_index/{encodedEmail}` untuk mendapatkan `userId` unik pengguna tersebut.
   - Sesi disimpan secara aman di `localStorage` klien untuk persistensi sesi antar-reload.

### B. Alur Sinkronisasi Realtime Sticky Notes
1. **Listening Stream**:
   - Setelah login berhasil, klien mengaktifkan listener WebSocket ke path `users/{userId}/todos`.
2. **Operasi CRUD (Create, Read, Update, Delete)**:
   - **Create**: Catatan baru disimpan ke path `users/{userId}/todos/{todoId}` dengan metadata judul, deskripsi, tingkat prioritas (*urgent*, *high*, *medium*, *low*), kategori (*academic*, *work*, *personal*, *general*), serta warna kertas sticky note.
   - **Update / Toggle Status**: Perubahan status penyelesaian (*completed*) atau perpindahan kolom memicu update pada Firebase RTDB.
   - **Realtime Broadcast**: Setiap perubahan pada database cloud langsung diteruskan ke seluruh browser/tab aktif yang sedang login menggunakan akun tersebut tanpa perlu refresh halaman.

### C. Alur Akun Evaluator Dosen
Untuk kebutuhan evaluasi pengujian oleh dosen penguji:
- Disediakan tombol akses cepat **1-Klik Masuk Akun Dosen (Elizabeth Nathania Wintanto)**.
- Akun ini otomatis terhubung ke data cloud awal dengan 5 sampel tugas akademik untuk memfasilitasi pengujian operasi CRUD secara instan.

---

## 2. Struktur Proyek & Penjelasan Path

Berikut adalah penjelasan fungsional dari setiap direktori dan file dalam repositori:

```text
.
├── frontend/                   # Aplikasi klien Frontend (SPA)
│   ├── public/                 # Static assets (favicon, icon)
│   ├── src/
│   │   ├── components/         # Komponen antarmuka berbasis Atomic Design
│   │   │   ├── atoms/          # Komponen dasar (Button, Input, Badge, Pin, Select, Textarea)
│   │   │   ├── molecules/      # Komposisi atom (StickyNoteCard, DailyHeader, SearchFilterBar, TodoModal, ConfirmationModal)
│   │   │   ├── organisms/      # Komponen kompleks (KanbanBoard, KanbanColumn, Navbar)
│   │   │   └── templates/      # Template tata letak halaman (AuthLayout, DashboardLayout)
│   │   ├── lib/
│   │   │   ├── firebase/       # Inisialisasi Firebase SDK, koneksi RTDB, dan realtime listeners
│   │   │   ├── services/       # Service layer enkapsulasi logika API & Autentikasi
│   │   │   ├── stores/         # State management reaktif Svelte (authStore, todoStore, themeStore)
│   │   │   ├── types/          # Definisi TypeScript interface (TodoItem, User, Filter, DTO)
│   │   │   └── utils/          # Fungsi utilitas (format tanggal, sanitasi input)
│   │   ├── pages/              # Halaman tingkat rute (LoginPage, RegisterPage, DashboardPage)
│   │   ├── App.svelte          # Root component dengan routing berbasis state
│   │   ├── app.css             # Entry stylesheet Tailwind CSS & custom styling corkboard
│   │   └── main.ts             # Entry point bootstrap aplikasi Svelte
│   ├── tests/                  # Unit test frontend (Micro-atomic test suites & validation)
│   ├── .env.example            # Template variabel environment frontend
│   ├── package.json            # Dependensi frontend (Svelte 5, Lucide-Svelte, TailwindCSS, Firebase)
│   ├── tailwind.config.js      # Konfigurasi color tokens sticky notes & corkboard theme
│   ├── tsconfig.json           # Konfigurasi compiler TypeScript
│   └── vite.config.ts          # Konfigurasi bundler Vite
├── functions/                  # Backend Serverless API (Firebase Cloud Functions)
│   ├── src/
│   │   ├── config/             # Inisialisasi Firebase Admin SDK
│   │   ├── controllers/        # Request handler endpoint REST (AuthController, TodoController)
│   │   ├── middlewares/        # Middleware verifikasi token JWT & centralized error handling
│   │   ├── models/             # Representasi entitas data pengguna dan todo
│   │   ├── repositories/       # Abstraksi data access layer ke Realtime Database
│   │   ├── routes/             # Definisi routing Hono framework
│   │   ├── schemas/            # Skema validasi input payload request menggunakan Zod
│   │   ├── services/           # Business logic layer (AuthService, TodoService)
│   │   ├── tests/              # Test suites backend (unit & integration testing)
│   │   └── index.ts            # Entrypoint Cloud Functions HTTP trigger
│   ├── package.json            # Dependensi backend (Hono, Zod, Firebase-Admin)
│   └── tsconfig.json           # Konfigurasi TypeScript backend
├── scripts/                    # Skrip bantuan otomasi database & verifikasi sinkronisasi
├── database.rules.json         # Aturan keamanan akses Firebase Realtime Database
├── firebase.json               # Konfigurasi deployment Firebase Hosting & Cloud Functions
├── .firebaserc                 # Binding project ID Firebase CLI
└── .gitignore                  # Daftar file dan direktori yang diabaikan dari tracking Git
```

---

## 3. Panduan Menjalankan Secara Lokal (Local Development)

### Prasyarat
- Node.js versi 20 LTS atau lebih baru
- npm versi 10 atau lebih baru

### Langkah Setup

1. **Clone Repository**:
   ```bash
   git clone https://github.com/galang-rs/AFL2-Cloud-Computing.git
   cd AFL2-Cloud-Computing
   ```

2. **Setup Environment Frontend**:
   Salin template `.env.example` menjadi `.env` di dalam folder `frontend`:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   Isi konfigurasi Firebase pada file `frontend/.env` sesuai kredensial project Firebase Anda:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.asia-southeast1.firebasedatabase.app
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Install Dependencies**:
   ```bash
   # Install dependensi frontend
   npm --prefix frontend install

   # Install dependensi backend functions
   npm --prefix functions install
   ```

4. **Jalankan Aplikasi Frontend**:
   ```bash
   npm --prefix frontend run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`.

---

## 4. Pengujian Otomatis (Automated Testing)

Aplikasi dilengkapi dengan rangkaian pengujian unit dan integrasi untuk memastikan reliabilitas kode:

- **Menjalankan Pengujian Frontend**:
  ```bash
  npm --prefix frontend test
  ```
  *Mencakup pengujian struktur atomik komponen, ketiadaan inline styles, inisialisasi Firebase client, AuthService, ApiService, AuthStore, dan TodoStore.*

- **Menjalankan Pengujian Backend Functions**:
  ```bash
  npm --prefix functions test
  ```
  *Mencakup 24 test suites untuk controller HTTP, validasi skema Zod, otentikasi JWT, penanganan error, dan integrasi repository.*

---

## 5. Panduan Deployment ke Firebase

Aplikasi dikonfigurasi untuk deployment ke platform cloud Firebase menggunakan Firebase CLI.

### Langkah 1: Login ke Firebase CLI
Pastikan telah login ke akun Google yang memiliki akses ke project Firebase:
```bash
npx firebase-tools login
```

### Langkah 2: Build Aset Produksi Frontend
Jalankan proses kompilasi dan bundling Vite:
```bash
npm --prefix frontend run build
```
Hasil build akan terbuat di folder `frontend/dist/`.

### Langkah 3: Deploy Security Rules Realtime Database
Terapkan konfigurasi izin baca dan tulis database:
```bash
npx firebase-tools deploy --only database --project afl2-7e2a5
```

### Langkah 4: Deploy Frontend ke Firebase Hosting
Publikasikan folder hasil build ke CDN global Firebase Hosting:
```bash
npx firebase-tools deploy --only hosting --project afl2-7e2a5
```
Setelah proses selesai, aplikasi langsung dapat diakses secara publik melalui URL hosting:
`https://afl2-7e2a5.web.app`

### Langkah 5: Deploy Cloud Functions (Opsional / Jika Memiliki Paket Blaze)
Jika project Firebase menggunakan paket Blaze (Pay-as-you-go), backend serverless functions dapat dideploy menggunakan:
```bash
npm --prefix functions run build
npx firebase-tools deploy --only functions --project afl2-7e2a5
```
*(Catatan: Mode frontend saat ini telah dilengkapi koneksi direct-BaaS ke Realtime Database, sehingga aplikasi tetap berjalan 100% fungsional pada paket gratis Spark).*
