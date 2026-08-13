import { Collection, PromptItem, HistoryLog, UserSettings } from '../types';

export const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'col-laravel',
    name: 'Laravel Architecture',
    description: 'Prompt untuk pengembangan web enterprise, REST API, & Queue dengan Laravel 11.',
    color: '#F43F5E',
    iconName: 'Layers',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'col-flutter',
    name: 'Flutter Mobile App',
    description: 'Prompt pembuatan aplikasi Flutter, BLoC state management, & Clean Architecture.',
    color: '#0EA5E9',
    iconName: 'Smartphone',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'col-nextjs',
    name: 'Next.js 15 Fullstack',
    description: 'App Router, Server Actions, React Server Components, & Tailwind styling.',
    color: '#10B981',
    iconName: 'Globe',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'col-cybersec',
    name: 'Cyber Security & Audit',
    description: 'Penetration testing, vulnerability audit, OWASP Top 10 remediation & hardening.',
    color: '#8B5CF6',
    iconName: 'ShieldAlert',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'col-portfolio',
    name: 'Portfolio & Freelance',
    description: 'Pitch proposal klien, studi kasus produk, & copywriting landing page.',
    color: '#F59E0B',
    iconName: 'Briefcase',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const INITIAL_PROMPTS: PromptItem[] = [
  {
    id: 'prompt-1',
    title: 'Sistem Informasi Sekolah Laravel 11 Clean Architecture',
    category: 'Development',
    subCategory: 'Backend',
    aiModel: 'Claude 3.5 Sonnet',
    language: 'Indonesian',
    programmingLanguage: 'PHP 8.3',
    framework: 'Laravel 11',
    database: 'PostgreSQL',
    platform: 'Web',
    stylePrompt: 'Roleplay / Persona',
    tone: 'Professional & Technical',
    outputLanguage: 'Indonesian',
    creativity: 'Balanced (0.7)',
    length: 'Detailed Code + Explanation',
    targetAudience: 'Senior Engineer',
    description: 'Merancang arsitektur backend sistem informasi sekolah berbasis Laravel 11 dengan modul PPDB, presensi siswa, e-learning, & laporan nilai.',
    additionalReqs: 'Gunakan Repository-Service Pattern, DB Transaction pada mutasi nilai, & Sanctum API Auth.',
    negativePrompt: 'Jangan sertakan monolithic blade template lawas, raw SQL injection risk, atau fat controller.',
    expectedOutput: 'Struktur direktori, Migration file, Service Layer, Repository Interface, & Sample API Controller.',
    reference: 'Laravel 11 Official Docs & Clean Code Guidelines',
    content: `[ROLE & CONTEXT]
Anda adalah seorang **Principal Software Architect** berpengalaman 12+ tahun dalam sistem enterprise skala besar. Anda diminta merancang arsitektur backend untuk **Sistem Informasi Sekolah Modern** yang tahan skala dan aman.

[CORE TASK & OBJECTIVES]
Rancang arsitektur backend modular berbasis **Laravel 11** dan **PostgreSQL** untuk mengelola modul-modul berikut:
1. **PPDB (Penerimaan Peserta Didik Baru)** dengan alur verifikasi berkas otomatis.
2. **Presensi QR Code** siswa & guru dengan audit log time-series.
3. **Laporan Nilai Raport** dengan proteksi DB Transaction & pessimistic locking.

[EXECUTION PLAN & RENCANA KERJA STRATEGIS]
Sebelum memberikan implementasi kode, ikuti tahapan eksekusi sistematis berikut:
- **Fase 1: Analisis Arsitektur & Perancangan Data**: Petakan hirarki folder modular, entitas database, serta kontrak API/DTO.
- **Fase 2: Pembangunan Core Layer**: Susun Service Layer, Repository Interfaces, serta DTO untuk menjamin pemisahan logika bisnis dari controller.
- **Fase 3: Keamanan & Transaksi Data**: Terapkan DB Transactions pada modul krisis (mutasi nilai) serta otentikasi Sanctum Bearer Token.
- **Fase 4: Verifikasi & Standarisasi Output**: Format seluruh respon JSON dengan skema terstandar dan type hint ketat.

[TECHNICAL SPECIFICATIONS]
- **Language**: PHP 8.3+ (\`declare(strict_types=1);\`)
- **Framework**: Laravel 11.x (App Router, Form Requests, Resources)
- **Database**: PostgreSQL 16 (dengan B-Tree Index pada ID & Timestamp)
- **Pattern**: Repository-Service Pattern + DTO (Data Transfer Objects)
- **Authentication**: Laravel Sanctum Bearer Token

[STEP-BY-STEP IMPLEMENTATION GUIDELINES]
1. Jelaskan hirarki struktur folder modular dalam direktori \`app/\` (misal \`app/Services/\`, \`app/Repositories/\`, \`app/DTOs/\`).
2. Sediakan contoh kode **Data Transfer Object (DTO)** untuk registrasi siswa baru.
3. Sediakan contoh kode **Service Layer** dengan transaksi database (\`DB::transaction\`) untuk pemrosesan nilai raport.
4. Sediakan contoh **API Resource Controller** yang mengembalikan JSON terstandar (\`status\`, \`data\`, \`meta\`).

[NEGATIVE CONSTRAINTS]
- JANGAN menggunakan Fat Controller (logika bisnis harus 100% berada di Service Layer).
- JANGAN gunakan \`DB::raw\` tanpa binding parameter safe.
- DILARANG menggunakan query di dalam file View/Blade.

[OUTPUT FORMAT]
Berikan ringkasan rencana kerja dilanjutkan dengan struktur direktori dan blok kode PHP terstruktur dengan tipe data eksplisit.`,
    isFavorite: true,
    isPinned: true,
    collectionId: 'col-laravel',
    tags: ['Laravel', 'PHP', 'Backend', 'School System', 'Clean Architecture'],
    score: 96,
    scoreDetail: {
      score: 96,
      rating: 'Excellent',
      strengths: [
        'Instruksi roleplay dan konteks sangat jelas',
        'Spesifikasi stack teknis lengkap (PHP 8.3, Laravel 11, PostgreSQL 16)',
        'Memiliki negative constraints yang mencegah anti-pattern',
        'Struktur seksi Markdown rapi'
      ],
      weaknesses: [
        'Bisa ditambahkan batasan alokasi memori atau timeout jika query berat'
      ],
      recommendations: [
        'Tambahkan instruksi pengujian (Pest / PHPUnit test suite)'
      ],
      checklist: [
        { label: 'Tujuan Jelas', passed: true, note: 'Sangat terarah' },
        { label: 'Konteks Lengkap', passed: true, note: 'Konteks sekolah terdefinisi' },
        { label: 'Output Terstruktur', passed: true, note: 'Format output sangat presisi' },
        { label: 'Struktur Rapi', passed: true, note: 'Mempunyai seksi [ROLE], [TASK], [CONSTRAINTS]' },
        { label: 'Negative Constraint', passed: true, note: 'Larangan Fat Controller & Injection' },
        { label: 'Batasan Teknis', passed: true, note: 'Versi PHP dan DB spesifik' }
      ]
    },
    versions: [
      {
        id: 'v1',
        versionNumber: 1,
        content: 'Buatkan backend sekolah dengan Laravel dan database PostgreSQL.',
        note: 'Draft pertama',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'v2',
        versionNumber: 2,
        content: 'Prompt lengkap dengan Clean Architecture, Service Layer, & Negative Constraints.',
        note: 'Optimasi AI Optimizer',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      }
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'prompt-2',
    title: 'Flutter E-Commerce App dengan BLoC & Offline First Hydrated Storage',
    category: 'Development',
    subCategory: 'Mobile',
    aiModel: 'Gemini 3.5',
    language: 'Indonesian',
    programmingLanguage: 'Dart 3.5',
    framework: 'Flutter 3.24',
    database: 'Hive / SQLite',
    platform: 'Mobile',
    stylePrompt: 'Step-by-Step',
    tone: 'Professional & Technical',
    outputLanguage: 'Indonesian',
    creativity: 'Balanced (0.7)',
    length: 'Comprehensive',
    targetAudience: 'Senior Engineer',
    description: 'Prompt untuk membangun arsitektur aplikasi mobile e-commerce Flutter yang mendukung offline caching dan Sync Manager.',
    additionalReqs: 'Integrasikan flutter_bloc, freezed untuk immutable state, & dio intercepter untuk retry mechanism.',
    negativePrompt: 'Avoid setState, avoid single large widget file, avoid hardcoded strings.',
    expectedOutput: 'Struktur BLoC, State, Event, API Repository, & Widget View.',
    reference: 'BLoC Library Official Best Practices',
    content: `[ROLE & CONTEXT]
Anda adalah seorang **Senior Mobile Engineer** spesialis Flutter & Cross-Platform Development. Anda ditugaskan membangun arsitektur Flutter E-Commerce berstandar industri dengan kemampuan **Offline-First Synchronization**.

[CORE TASK]
Sediakan arsitektur BLoC pattern untuk fitur **Cart & Checkout Engine** yang mampu bekerja secara offline dan melakukan auto-sync ketika koneksi internet kembali aktif.

[TECHNICAL REQUIREMENTS]
- **Framework**: Flutter 3.24+ / Dart 3.5+
- **State Management**: \`flutter_bloc\` v8.1+ & \`hydrated_bloc\`
- **Data Models**: \`freezed\` & \`json_serializable\`
- **Networking**: \`dio\` dengan RetryInterceptor
- **Local DB**: \`hive_ce\` untuk local caching

[STEP-BY-STEP INSTRUCTIONS]
1. Tuliskan kelas Event: \`CartAddToCart\`, \`CartRemoveItem\`, \`CartSyncWithServer\`.
2. Tuliskan kelas State immutable menggunakan \`freezed\` (\`CartInitial\`, \`CartLoading\`, \`CartLoaded\`, \`CartError\`).
3. Tuliskan BLoC handler untuk menyimpan item secara lokal di Hive sebelum menembak API backend.
4. Tuliskan komponen UI \`CartItemWidget\` dengan animasi transisi yang efisien.

[NEGATIVE CONSTRAINTS]
- JANGAN pernah menggunakan \`setState\` pada state global/keranjang.
- DILARANG menggunakan hardcoded API URL (gunakan Environment Config).
- JANGAN gabungkan logic BLoC di dalam file Widget UI.

[EXPECTED OUTPUT]
Sediakan kode Dart lengkap, bersih, terpisah per modul dengan komentar penjelasan ringkas.`,
    isFavorite: true,
    isPinned: false,
    collectionId: 'col-flutter',
    tags: ['Flutter', 'Dart', 'BLoC', 'Mobile', 'Offline First'],
    score: 94,
    scoreDetail: {
      score: 94,
      rating: 'Excellent',
      strengths: ['Spesifikasi library Flutter sangat detail', 'Mencakup skenario offline-first'],
      weaknesses: ['Perlu penambahan panduan unit test BLoC'],
      recommendations: ['Tambahkan snippet blocTest(...)'],
      checklist: [
        { label: 'Tujuan Jelas', passed: true, note: 'Sangat spesifik untuk BLoC Cart' },
        { label: 'Konteks Lengkap', passed: true, note: 'Offline-first e-commerce' },
        { label: 'Output Terstruktur', passed: true, note: 'Langkah 1-4 sangat mudah diikuti' },
        { label: 'Struktur Rapi', passed: true, note: 'Markdown rapi' },
        { label: 'Negative Constraint', passed: true, note: 'Mencegah setState' },
        { label: 'Batasan Teknis', passed: true, note: 'Versi Flutter 3.24 & Dart 3.5' }
      ]
    },
    versions: [],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'prompt-3',
    title: 'Security Hardening & Penetration Testing Audit checklist Next.js 15',
    category: 'CyberSec',
    subCategory: 'Security',
    aiModel: 'GPT-4o',
    language: 'English',
    programmingLanguage: 'TypeScript',
    framework: 'Next.js 15',
    database: 'Redis / PostgreSQL',
    platform: 'Cloud',
    stylePrompt: 'Instruction-Based',
    tone: 'Professional & Technical',
    outputLanguage: 'English',
    creativity: 'Strict/Exact (0.2)',
    length: 'Comprehensive',
    targetAudience: 'Senior Engineer',
    description: 'Comprehensive OWASP Top 10 security audit and mitigation guide for Next.js App Router Server Actions and Middleware.',
    additionalReqs: 'Include Content Security Policy (CSP), Rate Limiting with Upstash Redis, and CSRF prevention.',
    negativePrompt: 'Do not provide generic vague advice. Provide exact middleware code and header configurations.',
    expectedOutput: 'Next.js middleware.ts script, CSP nonce generator, and Server Action validation wrapper.',
    reference: 'OWASP Web Security Testing Guide v4.2',
    content: `[ROLE & CONTEXT]
You are a **Principal Application Security Specialist (AppSec)** auditing a production-grade **Next.js 15 App Router** application handling sensitive finance transactions.

[CORE TASK]
Provide an exhaustive security implementation code suite for \`middleware.ts\` and Server Actions to guard against OWASP Top 10 vulnerabilities (XSS, CSRF, SSRF, Rate Limiting Bypass, and Injection).

[TECHNICAL REQUIREMENTS]
- **Framework**: Next.js 15 (App Router)
- **Language**: Strict TypeScript 5.5+
- **Security Middleware**: Strict Content-Security-Policy with Nonce, HSTS, X-Frame-Options
- **Rate Limiting**: Upstash Redis sliding window algorithm

[STEP-BY-STEP INSTRUCTIONS]
1. Write a battle-tested Next.js \`middleware.ts\` that injects dynamic cryptographic nonces into script-src CSP headers.
2. Implement IP-based & Token-based Rate Limiting on sensitive routes (\`/api/checkout\`, \`/api/login\`).
3. Provide a secure Server Action wrapper using \`zod\` for input sanitization and authorization validation.

[NEGATIVE CONSTRAINTS]
- DO NOT use \`unsafe-inline\` or \`unsafe-eval\` in CSP headers.
- DO NOT expose raw server error stack traces to the client response.

[EXPECTED OUTPUT]
Exact, production-ready TypeScript code snippets ready to copy into \`middleware.ts\` and \`lib/security.ts\`.`,
    isFavorite: false,
    isPinned: false,
    collectionId: 'col-cybersec',
    tags: ['Next.js', 'Security', 'OWASP', 'TypeScript', 'Middleware'],
    score: 98,
    scoreDetail: {
      score: 98,
      rating: 'Excellent',
      strengths: ['Spesifikasi keamanan sangat ketat', 'Sangat praktis untuk produksi Next.js 15'],
      weaknesses: [],
      recommendations: [],
      checklist: [
        { label: 'Tujuan Jelas', passed: true, note: 'Audit keamanan terarah' },
        { label: 'Konteks Lengkap', passed: true, note: 'Finance app Next.js 15' },
        { label: 'Output Terstruktur', passed: true, note: 'File middleware.ts siap pakai' },
        { label: 'Struktur Rapi', passed: true, note: 'Tergrup dalam seksi jelas' },
        { label: 'Negative Constraint', passed: true, note: 'Tanpa unsafe-inline CSP' },
        { label: 'Batasan Teknis', passed: true, note: 'Next.js 15 + TypeScript 5.5+' }
      ]
    },
    versions: [],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

export const INITIAL_HISTORY: HistoryLog[] = [
  {
    id: 'hist-1',
    promptId: 'prompt-1',
    promptTitle: 'Sistem Informasi Sekolah Laravel 11 Clean Architecture',
    action: 'optimize',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    details: 'Dioptimalkan dengan AI Optimizer. Skor naik dari 65 ke 96.',
  },
  {
    id: 'hist-2',
    promptId: 'prompt-2',
    promptTitle: 'Flutter E-Commerce App dengan BLoC',
    action: 'create',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    details: 'Prompt baru dibuat via AI Wizard.',
  },
  {
    id: 'hist-3',
    promptId: 'prompt-3',
    promptTitle: 'Security Hardening & Penetration Testing Audit checklist Next.js 15',
    action: 'create',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    details: 'Dibuat dari template CyberSec Collection.',
  },
];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  language: 'Indonesian',
  fontSize: 14,
  autoSave: true,
  defaultModel: 'Claude 3.5 Sonnet',
  wordWrap: true,
  apiKey: '',
};
