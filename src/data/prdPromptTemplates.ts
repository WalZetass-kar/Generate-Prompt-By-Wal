import { PRDFormState } from '../types';

export type PromptTemplateTechnique =
  | 'Role-Play'
  | 'Chain-of-Thought'
  | 'Few-Shot'
  | 'Tree-of-Thoughts'
  | 'ReAct Agent'
  | 'Structured JSON'
  | 'Socratic';

export interface TemplateVariableMeta {
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  multiline?: boolean;
}

export interface PromptRequirementTemplate {
  id: string;
  name: string;
  technique: PromptTemplateTechnique;
  badgeColor: string;
  description: string;
  useCase: string;
  variables: TemplateVariableMeta[];
  formDefaults: Partial<PRDFormState>;
  templateContent: string;
}

export interface DetectedVariable {
  name: string;
  token: string;
  occurrences: number;
  inDocument: boolean;
  inForm: boolean;
  formFields: string[];
}

export const PROMPT_REQUIREMENT_TEMPLATES: PromptRequirementTemplate[] = [
  {
    id: 'role-play-expert',
    name: 'Role-Play & Expert Persona',
    technique: 'Role-Play',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    description:
      'Menetapkan persona pakar dengan otoritas domain, batasan peran, gaya komunikasi, dan kriteria output spesifik.',
    useCase: 'Advisory AI, Senior Code Reviewer, Legal/Product Strategist, Customer Persona Simulator',
    variables: [
      {
        name: 'expert_role',
        label: 'Expert Role / Persona',
        placeholder: 'Contoh: Principal Solutions Architect dengan 15 tahun pengalaman FinTech',
        defaultValue: 'Principal Product Architect & AI Systems Strategist',
      },
      {
        name: 'topic',
        label: 'Topik / Fokus Utama',
        placeholder: 'Contoh: Arsitektur sistem pembayaran multi-tenant real-time',
        defaultValue: 'Perancangan Sistem SaaS B2B Multi-Tenant',
      },
      {
        name: 'target_audience',
        label: 'Target Audiens',
        placeholder: 'Contoh: CTO, Engineering Managers, dan Tech Leads',
        defaultValue: 'Engineering Leads & Product Managers',
      },
      {
        name: 'tone_style',
        label: 'Gaya & Nada Komunikasi',
        placeholder: 'Contoh: Tegas, analitis, berbasis data, tanpa basa-basi',
        defaultValue: 'Eksekutif, terstruktur, objektif, dan actionable',
      },
      {
        name: 'constraints',
        label: 'Batasan & Guardrails',
        placeholder: 'Contoh: Jangan berasumsi tentang fitur yang tidak diminta; prioritaskan keamanan OWASP',
        defaultValue: 'Hindari jargon kosong, sertakan trade-off konkret, patuhi standar keamanan OWASP Top 10',
        multiline: true,
      },
    ],
    formDefaults: {
      productTitle: 'Role-Play AI Spec: {{topic}}',
      tagline: 'Persona-driven prompt requirement specification for {{expert_role}}',
      category: 'AI Agent / RAG Pipeline',
      targetAudience: '{{target_audience}}',
      problemStatement:
        'Output AI generik sering terlalu dangkal dan tidak mencerminkan sudut pandang praktisi senior saat membahas {{topic}}.',
      keyFeatures:
        'P1: Persona Authority Framing ({{expert_role}}), Tone Calibration ({{tone_style}}).\nP2: Domain Guardrails & Refusal Rules ({{constraints}}).\nP3: Actionable Deliverable Formatting untuk {{target_audience}}.',
      prdFormat: 'Comprehensive Enterprise PRD',
    },
    templateContent: `[PRODUCT REQUIREMENT DOCUMENT - ROLE-PLAY PROMPT SPECIFICATION]
Judul Sistem: {{topic}} - Persona Prompt Engine
Pola Struktur: Role-Play & Expert Persona
Target Audiens: {{target_audience}}

[1. PERSONA & ROLE DEFINITION]
Anda bertindak sebagai {{expert_role}}.
Seluruh analisis, keputusan arsitektur, dan rekomendasi yang Anda hasilkan harus mencerminkan standar keahlian tingkat senior dalam domain {{topic}}.

[2. CORE OBJECTIVE & CONTEXT]
Tujuan utama sesi ini adalah merancang spesifikasi dan solusi komprehensif terkait {{topic}} yang dirancang khusus untuk {{target_audience}}.
Gaya komunikasi wajib: {{tone_style}}.

[3. BEHAVIORAL RULES & GUARDRAILS]
- Tetap konsisten dalam peran {{expert_role}} dari awal hingga akhir respons.
- Terapkan batasan ketat berikut: {{constraints}}.
- Jika terdapat ambiguitas pada permintaan terkait {{topic}}, nyatakan asumsi teknis secara eksplisit sebelum memberikan rekomendasi.
- Fokus pada keputusan praktis yang dapat langsung dieksekusi oleh {{target_audience}}.

[4. REQUIRED OUTPUT STRUCTURE]
1. Ringkasan Eksekutif & Diagnosis Masalah {{topic}}
2. Rekomendasi Strategis dari Sudut Pandang {{expert_role}}
3. Analisis Risiko, Trade-offs & Mitigasi
4. Rencana Aksi Prioritas (P0, P1, P2)

[5. ACCEPTANCE CRITERIA]
- Respons 100% sesuai nada {{tone_style}} tanpa kalimat pembuka generik.
- Setiap rekomendasi memuat alasan teknis atau bisnis yang terukur.`,
  },
  {
    id: 'chain-of-thought',
    name: 'Chain-of-Thought (CoT) Reasoning',
    technique: 'Chain-of-Thought',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    description:
      'Memaksa model memecah masalah kompleks menjadi langkah penalaran logis bertahap sebelum menyusun kesimpulan akhir.',
    useCase: 'Root-Cause Analysis, Architecture Trade-offs, Financial Modeling, Complex Debugging',
    variables: [
      {
        name: 'topic',
        label: 'Masalah / Topik Analisis',
        placeholder: 'Contoh: Optimasi latensi database PostgreSQL pada beban 10k RPS',
        defaultValue: 'Optimasi Performa & Skalabilitas Sistem',
      },
      {
        name: 'problem_context',
        label: 'Konteks & Data Awal',
        placeholder: 'Jelaskan kondisi saat ini, gejala, atau metrik baseline...',
        defaultValue: 'Latensi P99 melonjak di atas 1.2 detik saat peak traffic dengan CPU database mencapai 92%.',
        multiline: true,
      },
      {
        name: 'reasoning_steps',
        label: 'Tahapan Penalaran Wajib',
        placeholder: 'Contoh: 1) Dekomposisi masalah, 2) Hipotesis akar masalah, 3) Evaluasi solusi, 4) Validasi akhir',
        defaultValue: '1) Dekomposisi masalah, 2) Identifikasi bottleneck, 3) Evaluasi opsi teknis, 4) Verifikasi dampak',
        multiline: true,
      },
      {
        name: 'constraints',
        label: 'Batasan Solusi',
        placeholder: 'Contoh: Zero downtime migration, budget infrastruktur maksimal +15%',
        defaultValue: 'Zero-downtime deployment, kompatibel dengan stack eksisting, budget efisien',
      },
      {
        name: 'verification_criteria',
        label: 'Kriteria Verifikasi Mandiri',
        placeholder: 'Contoh: Periksa edge cases, konsistensi angka, dan potensi regresi',
        defaultValue: 'Validasi edge cases, estimasi dampak latensi, dan rencana rollback',
      },
    ],
    formDefaults: {
      productTitle: 'CoT Reasoning Spec: {{topic}}',
      tagline: 'Step-by-step analytical Chain-of-Thought prompt blueprint',
      category: 'AI Agent / RAG Pipeline',
      problemStatement: '{{problem_context}}',
      keyFeatures:
        'P1: Explicit Multi-Step Reasoning Protocol ({{reasoning_steps}}).\nP2: Constraint Enforcement ({{constraints}}).\nP3: Self-Verification Gate ({{verification_criteria}}).',
      prdFormat: 'Technical Spec & Architecture PRD',
    },
    templateContent: `[PRODUCT REQUIREMENT DOCUMENT - CHAIN-OF-THOUGHT PROMPT SPECIFICATION]
Judul Tugas: Analisis Mendalam {{topic}}
Pola Struktur: Chain-of-Thought (Step-by-Step Reasoning)

[1. PROBLEM STATEMENT & CONTEXT]
Topik Utama: {{topic}}
Konteks Lapangan:
{{problem_context}}

[2. MANDATORY STEP-BY-STEP REASONING PROTOCOL]
Jangan langsung melompat ke kesimpulan akhir. Uraikan alur berpikir Anda secara transparan mengikuti tahapan berikut:
{{reasoning_steps}}

[3. OPERATIONAL CONSTRAINTS]
Seluruh hipotesis dan solusi yang dipertimbangkan wajib mematuhi batasan:
{{constraints}}

[4. SELF-VERIFICATION CHECKLIST]
Sebelum mengeluarkan keputusan akhir, lakukan audit internal terhadap penalaran Anda berdasarkan:
{{verification_criteria}}

[5. FINAL SYNTHESIS FORMAT]
- Ringkasan Penalaran Inti (Step-by-step trace)
- Solusi Terpilih & Justifikasi Kuantitatif
- Langkah Implementasi Bertahap & Rencana Rollback`,
  },
  {
    id: 'few-shot-exemplar',
    name: 'Few-Shot Exemplar Blueprint',
    technique: 'Few-Shot',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    description:
      'Menggunakan pasangan contoh Input -> Output terkurasi agar model meniru pola, format, dan ketepatan klasifikasi secara konsisten.',
    useCase: 'Data Extraction, Ticket Triage, Copywriting Style Transfer, User Story Normalization',
    variables: [
      {
        name: 'task_name',
        label: 'Nama Tugas / Transformasi',
        placeholder: 'Contoh: Konversi Feedback Pengguna menjadi User Story Gherkin',
        defaultValue: 'Transformasi Kebutuhan Bisnis menjadi Acceptance Criteria',
      },
      {
        name: 'topic',
        label: 'Domain / Produk',
        placeholder: 'Contoh: Aplikasi Mobile Banking',
        defaultValue: 'Platform SaaS Manajemen Proyek',
      },
      {
        name: 'example_input_1',
        label: 'Contoh Input 1',
        placeholder: 'Masukkan contoh input pertama...',
        defaultValue: 'User sering lupa password dan minta login cepat tanpa ketik ulang.',
        multiline: true,
      },
      {
        name: 'example_output_1',
        label: 'Contoh Output 1',
        placeholder: 'Masukkan contoh output ideal untuk input pertama...',
        defaultValue: 'Story: Magic Link Login | Priority: P1 | AC: Given user enters email, When clicking Send Link, Then one-time login link expires in 10 mins.',
        multiline: true,
      },
      {
        name: 'example_input_2',
        label: 'Contoh Input 2',
        placeholder: 'Masukkan contoh input kedua...',
        defaultValue: 'Admin butuh ekspor laporan bulanan ke Excel untuk tim finance.',
        multiline: true,
      },
      {
        name: 'example_output_2',
        label: 'Contoh Output 2',
        placeholder: 'Masukkan contoh output ideal untuk input kedua...',
        defaultValue: 'Story: Monthly CSV/XLSX Export | Priority: P2 | AC: Given admin selects month, When clicking Export, Then report downloads within 3s.',
        multiline: true,
      },
      {
        name: 'target_input',
        label: 'Target Input Baru (Untuk Diproses)',
        placeholder: 'Masukkan input aktual yang ingin diproses menggunakan pola di atas...',
        defaultValue: 'Tim sales ingin notifikasi real-time di Slack setiap kali ada prospek enterprise mendaftar.',
        multiline: true,
      },
    ],
    formDefaults: {
      productTitle: 'Few-Shot Engine: {{task_name}}',
      tagline: 'Pattern-consistent Few-Shot prompt requirement for {{topic}}',
      category: 'AI Agent / RAG Pipeline',
      problemStatement:
        'Format output sering berubah-ubah antar eksekusi ketika menjalankan {{task_name}} pada domain {{topic}}.',
      keyFeatures:
        'P1: Curated Input-Output Exemplar Pairs.\nP2: Deterministic Formatting & Schema Alignment.\nP3: Edge-case Handling untuk {{target_input}}.',
      prdFormat: 'Agile User Stories PRD',
    },
    templateContent: `[PRODUCT REQUIREMENT DOCUMENT - FEW-SHOT PROMPT SPECIFICATION]
Nama Pipeline: {{task_name}}
Domain Produk: {{topic}}
Pola Struktur: Few-Shot Exemplar Learning

[1. INSTRUCTION & TRANSFORMATION GOAL]
Jalankan tugas "{{task_name}}" untuk domain {{topic}}.
Tiru struktur, tingkat keringkasan, dan gaya penulisan dari contoh pasangan Input -> Output di bawah ini secara persis tanpa menambahkan penjelasan tambahan di luar pola.

[2. FEW-SHOT EXEMPLARS]
--- CONTOH 1 ---
INPUT:
{{example_input_1}}

OUTPUT:
{{example_output_1}}

--- CONTOH 2 ---
INPUT:
{{example_input_2}}

OUTPUT:
{{example_output_2}}

[3. TARGET EXECUTION INPUT]
Sekarang proses input aktual berikut menggunakan pola output yang identik:
INPUT:
{{target_input}}

OUTPUT:
(Hasilkan output mengikuti format persis Contoh 1 dan Contoh 2)

[4. QUALITY GUARDRAILS]
- Dilarang mengubah nama kolom/label atau menambahkan teks pengantar.
- Pertahankan presisi semantik sesuai domain {{topic}}.`,
  },
  {
    id: 'tree-of-thoughts',
    name: 'Tree-of-Thoughts (ToT) Strategist',
    technique: 'Tree-of-Thoughts',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    description:
      'Mengeksplorasi 3 cabang strategi paralel, menilai trade-off tiap cabang terhadap rubrik, lalu memilih jalur optimal.',
    useCase: 'Product Strategy, System Architecture Selection, Go-To-Market Planning, Build vs Buy',
    variables: [
      {
        name: 'topic',
        label: 'Keputusan / Topik Strategis',
        placeholder: 'Contoh: Memilih arsitektur Monolith Modular vs Microservices untuk fase Growth',
        defaultValue: 'Pemilihan Arsitektur & Roadmap Produk MVP',
      },
      {
        name: 'stakeholder_goal',
        label: 'Tujuan Utama Stakeholder',
        placeholder: 'Contoh: Time-to-market < 6 minggu dengan kesiapan scale ke 100k MAU',
        defaultValue: 'Peluncuran cepat dalam 6 minggu dengan biaya operasional rendah dan skalabilitas tinggi',
      },
      {
        name: 'evaluation_criteria',
        label: 'Kriteria Evaluasi / Rubrik Skor',
        placeholder: 'Contoh: Biaya, Kecepatan Delivery, Maintainability, Keamanan, Skalabilitas',
        defaultValue: 'Kecepatan Delivery (30%), Biaya Infrastruktur (25%), Skalabilitas (25%), Risiko Teknis (20%)',
        multiline: true,
      },
      {
        name: 'constraints',
        label: 'Batasan Sumber Daya',
        placeholder: 'Contoh: Tim terdiri dari 3 full-stack engineers, deadline Q3',
        defaultValue: 'Tim ramping 3-4 engineer, tidak ada DevOps dedicated pada fase awal',
      },
    ],
    formDefaults: {
      productTitle: 'ToT Decision Spec: {{topic}}',
      tagline: 'Multi-branch Tree-of-Thoughts evaluation framework',
      category: 'SaaS B2B Platform',
      problemStatement:
        'Pengambilan keputusan pada {{topic}} berisiko bias jika hanya mengevaluasi satu pendekatan linear tanpa membandingkan alternatif cabang.',
      keyFeatures:
        'P1: 3-Branch Parallel Hypothesis Generation.\nP2: Weighted Scoring Matrix ({{evaluation_criteria}}).\nP3: Pruning & Optimal Path Execution Plan.',
      prdFormat: 'Comprehensive Enterprise PRD',
    },
    templateContent: `[PRODUCT REQUIREMENT DOCUMENT - TREE-OF-THOUGHTS SPECIFICATION]
Topik Keputusan: {{topic}}
Pola Struktur: Tree-of-Thoughts (Multi-Branch Exploration & Pruning)

[1. STRATEGIC OBJECTIVE & CONSTRAINTS]
Tujuan Utama: {{stakeholder_goal}}
Batasan Sumber Daya: {{constraints}}

[2. MULTI-BRANCH EXPLORATION PROTOCOL]
Hasilkan 3 pendekatan alternatif yang benar-benar berbeda untuk menyelesaikan {{topic}}:
- Cabang A (Konservatif / Low-Risk): Prioritas stabilitas dan kecepatan rilis.
- Cabang B (Balanced / Pragmatic): Keseimbangan optimal antara kecepatan dan skalabilitas.
- Cabang C (Ambitious / Future-Proof): Desain skala enterprise jangka panjang.

[3. EVALUATION RUBRIC & SCORING MATRIX]
Evaluasi dan beri skor (1-10) untuk setiap cabang berdasarkan kriteria:
{{evaluation_criteria}}

Sertakan kelemahan tersembunyi (failure mode) dari masing-masing cabang sebelum melakukan eliminasi (pruning).

[4. FINAL SELECTION & EXECUTION ROADMAP]
- Cabang Terpilih & Alasan Eliminasi Cabang Lain
- Rencana Mitigasi untuk Kelemahan Cabang Terpilih
- Milestone Implementasi 30-60-90 Hari`,
  },
  {
    id: 'react-agent-spec',
    name: 'ReAct Agentic Tool-Use Spec',
    technique: 'ReAct Agent',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    description:
      'Spesifikasi agen otonom berbasis siklus Thought -> Action -> Observation lengkap dengan katalog tools dan kebijakan eskalasi.',
    useCase: 'Customer Support Agents, Research Copilots, DevOps Auto-Remediation, Workflow Automation',
    variables: [
      {
        name: 'agent_name',
        label: 'Nama AI Agent',
        placeholder: 'Contoh: SentinelOps Copilot',
        defaultValue: 'ResolveAI Support Agent',
      },
      {
        name: 'topic',
        label: 'Misi / Domain Operasional',
        placeholder: 'Contoh: Triase tiket insiden produksi dan investigasi log otomatis',
        defaultValue: 'Otomatisasi Penyelesaian Tiket & Refund Pelanggan',
      },
      {
        name: 'available_tools',
        label: 'Daftar Tools / Function Calls',
        placeholder: 'Contoh: search_kb(query), get_order_status(id), issue_refund(id, amount), escalate_human(reason)',
        defaultValue: 'search_knowledge_base(query), fetch_customer_order(order_id), trigger_refund(order_id, reason), escalate_to_human(ticket_id, summary)',
        multiline: true,
      },
      {
        name: 'guardrails',
        label: 'Kebijakan Keamanan & Batasan Aksi',
        placeholder: 'Contoh: Wajib konfirmasi manusia untuk transaksi > $100; dilarang membocorkan PII',
        defaultValue: 'Wajib human-in-the-loop untuk aksi destruktif/finansial > Rp 1.000.000; jangan pernah mengarang hasil tool.',
        multiline: true,
      },
    ],
    formDefaults: {
      productTitle: '{{agent_name}} - ReAct Agent PRD',
      tagline: 'Autonomous Thought-Action-Observation agent specification for {{topic}}',
      category: 'AI Agent / RAG Pipeline',
      problemStatement:
        'Agen AI tanpa protokol ReAct yang ketat rentan halusinasi parameter tool dan gagal menangani kegagalan API pada skenario {{topic}}.',
      keyFeatures:
        'P1: ReAct Loop (Thought -> Action -> Observation).\nP2: Tool Registry ({{available_tools}}).\nP3: Safety Guardrails & Escalation Policy ({{guardrails}}).',
      prdFormat: 'Technical Spec & Architecture PRD',
    },
    templateContent: `[PRODUCT REQUIREMENT DOCUMENT - REACT AGENT SPECIFICATION]
Nama Agen: {{agent_name}}
Domain Misi: {{topic}}
Pola Struktur: ReAct (Reason + Act + Observe)

[1. AGENT MISSION & AUTONOMY SCOPE]
{{agent_name}} bertugas menyelesaikan permintaan pengguna dalam ruang lingkup {{topic}} secara akurat menggunakan alat (tools) yang tersedia sebelum memberikan jawaban final.

[2. AVAILABLE TOOLS & CAPABILITIES]
Alat resmi yang boleh dipanggil oleh {{agent_name}}:
{{available_tools}}

[3. REACT EXECUTION LOOP]
Untuk setiap langkah penyelesaian tugas, ikuti siklus disiplin:
1. THOUGHT: Analisis informasi yang sudah dimiliki dan tentukan apakah tool perlu dipanggil.
2. ACTION: Pilih satu tool yang paling relevan beserta argumen tervalidasi.
3. OBSERVATION: Evaluasi hasil nyata dari tool (termasuk penanganan error atau data kosong).
4. FINAL ANSWER: Sampaikan jawaban ringkas yang didukung bukti dari Observation.

[4. SAFETY GUARDRAILS & ESCALATION]
{{guardrails}}

[5. FALLBACK & ERROR RECOVERY]
- Maksimal 5 iterasi pemanggilan tool per permintaan untuk mencegah infinite loop.
- Jika tool gagal 2 kali berturut-turut, hentikan eksekusi dan lakukan eskalasi dengan ringkasan konteks lengkap.`,
  },
  {
    id: 'structured-json-contract',
    name: 'Structured Output / JSON Schema Enforcer',
    technique: 'Structured JSON',
    badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    description:
      'Kontrak prompt zero-prose untuk menghasilkan JSON tervalidasi yang aman diparsing langsung oleh backend API atau database.',
    useCase: 'Resume Parsers, Invoice Extraction, Sentiment Pipelines, Structured API Backends',
    variables: [
      {
        name: 'topic',
        label: 'Nama Pipeline Ekstraksi',
        placeholder: 'Contoh: Ekstraksi Metadata Kontrak Vendor',
        defaultValue: 'Ekstraksi Entitas & Prioritas Laporan Bug',
      },
      {
        name: 'source_data',
        label: 'Sumber Data Input',
        placeholder: 'Contoh: Email pelanggan, transkrip meeting, atau dokumen OCR PDF',
        defaultValue: 'Teks bebas laporan bug dari Slack, Zendesk, atau form pengguna',
      },
      {
        name: 'json_schema_fields',
        label: 'Field Wajib JSON Schema',
        placeholder: 'Contoh: title (string), severity (P0|P1|P2), component (string), steps_to_reproduce (string[]), confidence (number)',
        defaultValue: 'title (string), severity ("P0"|"P1"|"P2"|"P3"), affected_module (string), summary (string), action_items (string[]), confidence_score (0-1)',
        multiline: true,
      },
      {
        name: 'fallback_behavior',
        label: 'Aturan Data Kosong / Ambigu',
        placeholder: 'Contoh: Gunakan null untuk field opsional yang tidak ditemukan; jangan menebak nilai',
        defaultValue: 'Isi null jika informasi tidak eksplisit ditemukan di sumber data; dilarang mengarang fakta.',
      },
    ],
    formDefaults: {
      productTitle: 'JSON Contract Spec: {{topic}}',
      tagline: 'Strict deterministic structured-output prompt specification',
      category: 'Developer Tools & DevOps',
      problemStatement:
        'Backend parser sering gagal ketika LLM menyisipkan narasi markdown atau mengubah nama key saat memproses {{source_data}}.',
      keyFeatures:
        'P1: Strict JSON-only Output Contract.\nP2: Explicit Field Typing ({{json_schema_fields}}).\nP3: Null-safe Fallback Policy ({{fallback_behavior}}).',
      prdFormat: 'Technical Spec & Architecture PRD',
    },
    templateContent: `[PRODUCT REQUIREMENT DOCUMENT - STRUCTURED JSON CONTRACT SPECIFICATION]
Pipeline: {{topic}}
Sumber Input: {{source_data}}
Pola Struktur: Strict JSON Schema Enforcer

[1. EXTRACTION OBJECTIVE]
Ekstrak dan normalisasi informasi dari {{source_data}} untuk kebutuhan {{topic}} ke dalam objek JSON valid tunggal.

[2. STRICT OUTPUT SCHEMA]
Kembalikan HANYA JSON valid (tanpa teks pembuka, tanpa penutup, tanpa blok penjelasan tambahan) dengan skema field wajib:
{{json_schema_fields}}

[3. VALIDATION & FALLBACK RULES]
- Validasi tipe data setiap field secara ketat (string, number, boolean, array).
- Kebijakan data tidak ditemukan: {{fallback_behavior}}
- Pastikan seluruh string ter-escape dengan benar agar lolos JSON.parse() tanpa error.

[4. SYSTEM INTEGRATION ACCEPTANCE CRITERIA]
- 100% respons dapat diparsing langsung oleh API consumer.
- Tidak ada key tambahan di luar skema yang ditetapkan.`,
  },
  {
    id: 'socratic-discovery',
    name: 'Socratic / Guided Discovery Flow',
    technique: 'Socratic',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    description:
      'Memandu pengguna melalui pertanyaan terarah secara bertahap untuk menggali kebutuhan, mengklarifikasi asumsi, dan membangun solusi bersama.',
    useCase: 'Interactive Onboarding, Requirement Gathering Interviewer, Executive Coaching, EdTech Tutor',
    variables: [
      {
        name: 'topic',
        label: 'Topik Eksplorasi / Coaching',
        placeholder: 'Contoh: Validasi ide produk SaaS tahap pre-seed',
        defaultValue: 'Discovery Kebutuhan Produk & Prioritas MVP',
      },
      {
        name: 'user_level',
        label: 'Level / Profil Pengguna',
        placeholder: 'Contoh: Founder non-teknis tahap awal',
        defaultValue: 'Product Manager & Founder Tahap Awal',
      },
      {
        name: 'learning_goal',
        label: 'Hasil Akhir yang Diharapkan',
        placeholder: 'Contoh: Scope MVP tajam yang siap diserahkan ke tim engineering',
        defaultValue: 'Dokumen ruang lingkup MVP yang tervalidasi beserta metrik keberhasilan',
      },
      {
        name: 'max_questions',
        label: 'Batas Pertanyaan per Giliran',
        placeholder: 'Contoh: Maksimal 2 pertanyaan tajam per respons',
        defaultValue: 'Maksimal 2 pertanyaan terfokus per giliran',
      },
    ],
    formDefaults: {
      productTitle: 'Socratic Discovery Spec: {{topic}}',
      tagline: 'Iterative question-led discovery & clarification prompt architecture',
      category: 'EdTech & Learning',
      targetAudience: '{{user_level}}',
      problemStatement:
        'Pengguna ({{user_level}}) sering kesulitan merumuskan kebutuhan secara lengkap dalam satu kali input saat membahas {{topic}}.',
      keyFeatures:
        'P1: Progressive Socratic Questioning ({{max_questions}}).\nP2: Assumption Challenging & Clarity Scoring.\nP3: Final Deliverable Synthesis ({{learning_goal}}).',
      prdFormat: 'Lean Startup MVP PRD',
    },
    templateContent: `[PRODUCT REQUIREMENT DOCUMENT - SOCRATIC DISCOVERY SPECIFICATION]
Topik Sesi: {{topic}}
Profil Pengguna: {{user_level}}
Pola Struktur: Socratic / Iterative Clarification Flow

[1. FACILITATION ROLE]
Anda adalah fasilitator Socratic yang membantu {{user_level}} mencapai "{{learning_goal}}" pada topik {{topic}} melalui dialog yang tajam, suportif, dan terstruktur.

[2. CONVERSATIONAL RULES]
- Jangan langsung memberikan jawaban panjang sebelum konteks inti tergali.
- Ajukan {{max_questions}} yang paling berdampak untuk membuka asumsi tersembunyi.
- Setiap respons harus merangkum singkat poin yang sudah disepakati sebelum melanjutkan ke pertanyaan berikutnya.

[3. DISCOVERY STAGES]
Tahap 1: Klarifikasi masalah inti dan pengguna terdampak pada {{topic}}.
Tahap 2: Eksplorasi batasan, alternatif saat ini, dan risiko terbesar.
Tahap 3: Sintesis akhir menjadi {{learning_goal}}.

[4. COMPLETION CRITERIA]
Saat seluruh informasi kunci telah lengkap atau pengguna meminta ringkasan, susun output final terstruktur untuk {{learning_goal}}.`,
  },
];

// Regex matching {{variable_name}} (allows letters, numbers, underscores, hyphens, dots, optional inner spaces)
const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

const PRD_SCAN_FIELDS: Array<{ key: keyof PRDFormState; label: string }> = [
  { key: 'productTitle', label: 'Nama Produk' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'targetAudience', label: 'Target Pengguna' },
  { key: 'targetPlatform', label: 'Target Platform' },
  { key: 'problemStatement', label: 'Problem Statement' },
  { key: 'keyFeatures', label: 'Fitur Kunci' },
  { key: 'techStack', label: 'Tech Stack' },
  { key: 'integrations', label: 'Integrasi' },
  { key: 'releasePhase', label: 'Fase Rilis' },
  { key: 'nonFunctionalReqs', label: 'NFR' },
];

export function formatVariableLabel(varName: string): string {
  return varName
    .replace(/[_.-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function extractBracketedVariables(
  documentText: string,
  formData: PRDFormState
): DetectedVariable[] {
  const map = new Map<string, DetectedVariable>();

  const registerMatch = (name: string, source: 'document' | 'form', fieldLabel?: string) => {
    const existing = map.get(name);
    if (existing) {
      existing.occurrences += 1;
      if (source === 'document') existing.inDocument = true;
      if (source === 'form') {
        existing.inForm = true;
        if (fieldLabel && !existing.formFields.includes(fieldLabel)) {
          existing.formFields.push(fieldLabel);
        }
      }
    } else {
      map.set(name, {
        name,
        token: `{{${name}}}`,
        occurrences: 1,
        inDocument: source === 'document',
        inForm: source === 'form',
        formFields: fieldLabel ? [fieldLabel] : [],
      });
    }
  };

  if (documentText) {
    let match: RegExpExecArray | null;
    const docRegex = new RegExp(VARIABLE_REGEX.source, 'g');
    while ((match = docRegex.exec(documentText)) !== null) {
      if (match[1]) registerMatch(match[1], 'document');
    }
  }

  for (const field of PRD_SCAN_FIELDS) {
    const val = formData[field.key];
    if (typeof val === 'string' && val.includes('{{')) {
      let match: RegExpExecArray | null;
      const fieldRegex = new RegExp(VARIABLE_REGEX.source, 'g');
      while ((match = fieldRegex.exec(val)) !== null) {
        if (match[1]) registerMatch(match[1], 'form', field.label);
      }
    }
  }

  return Array.from(map.values());
}

export function injectVariablesIntoText(
  text: string,
  values: Record<string, string>
): string {
  if (!text) return text;
  return text.replace(VARIABLE_REGEX, (fullMatch, varName: string) => {
    const val = values[varName];
    return val && val.trim().length > 0 ? val : fullMatch;
  });
}

export function injectVariablesIntoForm(
  formData: PRDFormState,
  values: Record<string, string>
): PRDFormState {
  const updated: PRDFormState = { ...formData };
  for (const field of PRD_SCAN_FIELDS) {
    const currentVal = updated[field.key];
    if (typeof currentVal === 'string') {
      updated[field.key] = injectVariablesIntoText(currentVal, values);
    }
  }
  return updated;
}

export function getVariableMeta(varName: string): TemplateVariableMeta | undefined {
  for (const tpl of PROMPT_REQUIREMENT_TEMPLATES) {
    const found = tpl.variables.find((v) => v.name === varName);
    if (found) return found;
  }
  return undefined;
}
