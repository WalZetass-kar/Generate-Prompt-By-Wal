import { GoogleGenAI } from "@google/genai";

export type TaskCategory =
  | "CODING"
  | "WEB_DEV"
  | "UI_UX"
  | "WRITING"
  | "MARKETING"
  | "RESEARCH"
  | "DATA_ANALYSIS"
  | "IMAGE_GEN"
  | "BUSINESS_PRD"
  | "CYBERSEC"
  | "LEGAL"
  | "GAME_DEV"
  | "AI_AGENT"
  | "GENERAL";

export interface RequirementDecomposition {
  taskCategory: TaskCategory;
  intentSummary: string;
  mustHaveRequirements: string[];
  shouldHaveRequirements: string[];
  optionalRequirements: string[];
  assumptions: string[];
  clarificationsNeeded: string[];
  detectedAmbiguities: string[];
  conflictResolutions: string[];
  negativeConstraints: string[];
  recommendedTechStack?: string;
  isBriefInput?: boolean;
}

export interface QualityDimensions {
  clarity: number;
  completeness: number;
  specificity: number;
  consistency: number;
  context: number;
  constraints: number;
  outputDefinition: number;
  ambiguityResolution: number;
}

export interface QualityControlReport {
  overallScore: number;
  rating: string;
  requirementCoverage: number;
  clarityScore: number;
  specificityScore: number;
  consistencyScore: number;
  contextAccuracy: number;
  actionabilityScore: number;
  testabilityScore: number;
  completenessScore: number;
  constraintsScore: number;
  outputDefinitionScore: number;
  ambiguityResolutionScore: number;
  dimensions: QualityDimensions;
  ambiguitiesResolved: string[];
  assumptions: string[];
  clarificationsNeeded: string[];
  qualityHighlights: string[];
  refinementsApplied?: string[];
  taskCategoryDetected: string;
  detectedDomain: string;
}

export interface GenerationPipelineResult {
  generatedPrompt: string;
  assumptions: string[];
  clarifications: string[];
  qualityControl: QualityControlReport;
  taskCategory: TaskCategory;
}

// Clean unwanted AI symbols (#, @, *) and emojis
export function cleanAISymbols(text: string): string {
  if (!text) return "";
  let cleaned = text
    .replace(/^(tentu|berikut|ini|halo|hi|here is|here's|pasti|baik|oke|siap).*?\n+/i, "")
    .replace(/^```markdown\n?/i, "")
    .replace(/\n?```$/i, "")
    .replace(/[#@*]/g, "")
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, "");

  // Normalize spacing & section headers
  cleaned = cleaned
    .replace(/([^\n])\n(\[[A-Z0-9 _\-&/:]+\])/g, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

// 1. REQUIREMENT ANALYSIS & DOMAIN DETECTION
export function detectTaskDomain(input: string, formData?: any): TaskCategory {
  const combined = `${input || ""} ${formData?.category || ""} ${formData?.subCategory || ""} ${formData?.title || ""} ${formData?.programmingLanguage || ""} ${formData?.framework || ""} ${formData?.description || ""}`.toLowerCase();

  if (
    combined.includes("midjourney") ||
    combined.includes("dall-e") ||
    combined.includes("stable diffusion") ||
    combined.includes("generate image") ||
    combined.includes("photorealistic") ||
    combined.includes("3d render") ||
    combined.includes("cinematic lighting")
  ) {
    return "IMAGE_GEN";
  }

  if (
    combined.includes("ui") ||
    combined.includes("ux") ||
    combined.includes("figma") ||
    combined.includes("design system") ||
    combined.includes("wireframe") ||
    combined.includes("glassmorphism") ||
    combined.includes("desain tampilan") ||
    combined.includes("tampilan antarmuka") ||
    combined.includes("color palette")
  ) {
    return "UI_UX";
  }

  if (
    combined.includes("rag") ||
    combined.includes("vector") ||
    combined.includes("langchain") ||
    combined.includes("llamaindex") ||
    combined.includes("ai agent") ||
    combined.includes("llm") ||
    combined.includes("embedding") ||
    combined.includes("system prompt")
  ) {
    return "AI_AGENT";
  }

  if (
    combined.includes("skripsi") ||
    combined.includes("tesis") ||
    combined.includes("jurnal") ||
    combined.includes("paper") ||
    combined.includes("academic") ||
    combined.includes("riset") ||
    combined.includes("metodologi") ||
    combined.includes("literature review") ||
    combined.includes("spss")
  ) {
    return "RESEARCH";
  }

  if (
    combined.includes("prd") ||
    combined.includes("product requirement") ||
    combined.includes("product manager") ||
    combined.includes("kpi") ||
    combined.includes("business plan") ||
    combined.includes("pitch deck") ||
    combined.includes("mvp scope")
  ) {
    return "BUSINESS_PRD";
  }

  if (
    combined.includes("seo") ||
    combined.includes("copywriting") ||
    combined.includes("artikel") ||
    combined.includes("blog") ||
    combined.includes("konten") ||
    combined.includes("naskah") ||
    combined.includes("email marketing") ||
    combined.includes("aida")
  ) {
    if (combined.includes("marketing") || combined.includes("campaign") || combined.includes("iklan")) {
      return "MARKETING";
    }
    return "WRITING";
  }

  if (
    combined.includes("cyber") ||
    combined.includes("pentest") ||
    combined.includes("security") ||
    combined.includes("owasp") ||
    combined.includes("pci-dss") ||
    combined.includes("iso 27001") ||
    combined.includes("vulnerability") ||
    combined.includes("encryption")
  ) {
    return "CYBERSEC";
  }

  if (
    combined.includes("sql") ||
    combined.includes("etl") ||
    combined.includes("data warehouse") ||
    combined.includes("pandas") ||
    combined.includes("bigquery") ||
    combined.includes("snowflake") ||
    combined.includes("data analytics") ||
    combined.includes("spark") ||
    combined.includes("tableau") ||
    combined.includes("power bi")
  ) {
    return "DATA_ANALYSIS";
  }

  if (
    combined.includes("kontrak") ||
    combined.includes("hukum") ||
    combined.includes("perjanjian") ||
    combined.includes("nda") ||
    combined.includes("legal") ||
    combined.includes("mou") ||
    combined.includes("pasal")
  ) {
    return "LEGAL";
  }

  if (
    combined.includes("game") ||
    combined.includes("unity") ||
    combined.includes("unreal") ||
    combined.includes("rpg") ||
    combined.includes("quest") ||
    combined.includes("lore") ||
    combined.includes("combat balancing")
  ) {
    return "GAME_DEV";
  }

  if (
    combined.includes("website") ||
    combined.includes("landing page") ||
    combined.includes("web app") ||
    combined.includes("frontend") ||
    combined.includes("next.js") ||
    combined.includes("react") ||
    combined.includes("vue") ||
    combined.includes("html")
  ) {
    return "WEB_DEV";
  }

  if (
    combined.includes("code") ||
    combined.includes("laravel") ||
    combined.includes("node") ||
    combined.includes("python") ||
    combined.includes("typescript") ||
    combined.includes("php") ||
    combined.includes("backend") ||
    combined.includes("api") ||
    combined.includes("flutter") ||
    combined.includes("database") ||
    combined.includes("postgres") ||
    combined.includes("mysql") ||
    combined.includes("docker") ||
    combined.includes("saas") ||
    combined.includes("app") ||
    combined.includes("aplikasi")
  ) {
    return "CODING";
  }

  return "GENERAL";
}

// 2. CONTEXT ENRICHMENT, AMBIGUITY & CONTRADICTION ANALYSIS
export function analyzeRequirementsAndConflicts(
  input: string,
  formData?: any
): RequirementDecomposition {
  const combined = `${input || ""} ${formData?.title || ""} ${formData?.description || ""} ${formData?.additionalReqs || ""}`.trim();
  const lower = combined.toLowerCase();
  
  const domain = detectTaskDomain(combined, formData);
  const ambiguities: string[] = [];
  const resolutions: string[] = [];
  const mustHave: string[] = [];
  const shouldHave: string[] = [];
  const optional: string[] = [];
  const assumptions: string[] = [];
  const clarificationsNeeded: string[] = [];
  const negativeConstraints: string[] = [];

  const isBrief = combined.split(/\s+/).length <= 6;

  // Extract explicit MUST-HAVE items specified by the user
  if (formData?.title) mustHave.push(`Tujuan Pokok: ${formData.title}`);
  if (formData?.programmingLanguage && formData.programmingLanguage !== "None") {
    mustHave.push(`Bahasa / Tech: ${formData.programmingLanguage}`);
  }
  if (formData?.framework && formData.framework !== "None") {
    mustHave.push(`Framework / Metodologi: ${formData.framework}`);
  }
  if (formData?.database && formData.database !== "None") {
    mustHave.push(`Data Store: ${formData.database}`);
  }
  if (formData?.platform && formData.platform !== "None") {
    mustHave.push(`Platform Sasaran: ${formData.platform}`);
  }
  if (formData?.expectedOutput) {
    mustHave.push(`Deliverables: ${formData.expectedOutput}`);
  }
  if (formData?.negativePrompt) {
    negativeConstraints.push(formData.negativePrompt);
  }

  // Deconstruct buzzwords into concrete specs
  if (lower.includes("modern")) {
    resolutions.push("Menginterpretasikan 'modern' menjadi: Clean visual hierarchy, consistent 8pt spacing grid, contemporary typography, accessible color contrast (WCAG AA), dan responsive multi-breakpoint layout.");
  }
  if (lower.includes("bagus") || lower.includes("terbaik")) {
    resolutions.push("Menginterpretasikan 'bagus' menjadi: Standar Clean Code, arsitektur modular, penanganan error menyeluruh, dan type safety.");
  }
  if (lower.includes("cepat") || lower.includes("ringan")) {
    resolutions.push("Menginterpretasikan 'cepat' menjadi: Sub-200ms latency target, debouncing/throttling pada input, code-splitting, dan optimasi query database.");
  }
  if (lower.includes("aman") || lower.includes("secure")) {
    resolutions.push("Menginterpretasikan 'aman' menjadi: OWASP Top 10 mitigation, input sanitization, parameterized queries (SQLi prevention), CSRF/XSS defense, dan secure cookie/token management.");
  }

  // Handle Contradictions
  if (
    (lower.includes("frontend only") || lower.includes("tanpa backend") || lower.includes("no backend")) &&
    (lower.includes("postgresql") || lower.includes("mysql") || lower.includes("oracle") || lower.includes("database relational"))
  ) {
    ambiguities.push("Permintaan frontend-only terdeteksi berdampingan dengan akses database relasional langsung.");
    resolutions.push("Mengasumsikan penggunaan Serverless Edge Functions / Supabase Client SDK dengan Row-Level Security (RLS) agar kredensial database tetap aman.");
    assumptions.push("Arsitektur menggunakan Supabase / Serverless Edge Functions dengan RLS untuk mengamankan akses data langsung dari klien.");
  }

  if (lower.includes("microservice") && (lower.includes("satu file") || lower.includes("single script"))) {
    ambiguities.push("Konsep microservice diminta dalam format satu file terpadu.");
    resolutions.push("Menyusun arsitektur modular yang membagi service boundary secara jelas dengan contract interface terpisah dalam monorepo terstruktur.");
  }

  if (lower.includes("offline") && lower.includes("realtime sync")) {
    ambiguities.push("Kebutuhan offline-first dengan sinkronisasi realtime.");
    resolutions.push("Menetapkan pola Local-First Cache (IndexedDB/SQLite) dengan Background Queue & Conflict-Free Replicated Data (CRDT/Timestamp).");
    assumptions.push("Menggunakan IndexedDB/SQLite lokal dengan antrian background sync otomatis saat koneksi internet kembali.");
  }

  // Handle Brief / Vague Inputs with Sensible Domain Assumptions
  if (isBrief || lower.includes("perpustakaan") || lower.includes("kasir") || lower.includes("toko") || lower.includes("portfolio")) {
    if (domain === "CODING" || domain === "WEB_DEV") {
      if (!formData?.programmingLanguage || formData.programmingLanguage === "None") {
        assumptions.push("Stack default yang diasumsikan: TypeScript, React/Next.js dengan Tailwind CSS dan PostgreSQL (atau Supabase) untuk performa dan keamanan optimal.");
      }
      if (!formData?.database || formData.database === "None") {
        assumptions.push("Database diasumsikan menggunakan PostgreSQL dengan skema relasional terindeks.");
      }
      assumptions.push("Autentikasi diasumsikan berbasis Role-Based Access Control (RBAC: Admin & Regular User) dengan session/JWT guard.");
      assumptions.push("UI mencakup 4 state interaktif wajib: Loading skeleton, Empty state informatif, Error feedback, dan Success state.");
      
      shouldHave.push("Fitur Autentikasi & RBAC (Admin & Pengguna)");
      shouldHave.push("Dashboard Analytics & Operasional");
      shouldHave.push("CRUD Entitas Utama dengan Validasi Input");
      shouldHave.push("Filter Pencarian, Pagination, dan Export Data");
    } else if (domain === "UI_UX") {
      assumptions.push("Design System diasumsikan menggunakan skala font Major Second (1.125), 8pt grid spacing, dan warna netral berkontras tinggi (WCAG AA).");
      assumptions.push("Dukungan responsive layout: Mobile (375px), Tablet (768px), dan Desktop (1440px).");
    } else if (domain === "WRITING" || domain === "MARKETING") {
      assumptions.push("Target pembaca diasumsikan praktisi profesional dan audiens umum yang mencari panduan actionable.");
      assumptions.push("Struktur artikel mengikuti formula AIDA / PAS dengan integrasi kata kunci LSI alami.");
    }
  }

  // Identify non-goals & constraints
  negativeConstraints.push("DILARANG memotong kode dengan komentar '// TODO' atau '// implement here'. Tuliskan implementasi utuh siap jalan.");
  negativeConstraints.push("DILARANG mengubah stack teknologi yang sudah ditentukan secara eksplisit oleh pengguna.");
  negativeConstraints.push("DILARANG menambahkan dependensi eksternal yang tidak relevan.");
  negativeConstraints.push("DILARANG mengarang data fiktif sebagai fakta tanpa atribusi.");

  return {
    taskCategory: domain,
    intentSummary: formData?.description || formData?.title || input || "Tugas Spesifikasi Teknis",
    mustHaveRequirements: mustHave.length > 0 ? mustHave : [input],
    shouldHaveRequirements: shouldHave,
    optionalRequirements: optional,
    assumptions,
    clarificationsNeeded,
    detectedAmbiguities: ambiguities,
    conflictResolutions: resolutions,
    negativeConstraints,
    recommendedTechStack: `${formData?.programmingLanguage || ""} ${formData?.framework || ""}`.trim() || undefined,
    isBriefInput: isBrief,
  };
}

// 3. ROLE DEFINITION MATRIX
export function getDomainRole(domain: TaskCategory): { title: string; mission: string } {
  switch (domain) {
    case "CODING":
    case "WEB_DEV":
      return {
        title: "Senior Principal Full-Stack Software Engineer & Lead Solution Architect",
        mission: "Merancang arsitektur perangkat lunak modular berskala enterprise, type-safe, aman (OWASP), dan siap produksi dengan kode lengkap tanpa potongan TODO.",
      };
    case "UI_UX":
      return {
        title: "Lead UI/UX Designer, Design System Specialist & Product Architect",
        mission: "Merancang antarmuka pengguna berestetika tinggi, sistem token desain matematis (8pt grid), hierarki visual tajam, state interaktif lengkap, dan aksesibilitas WCAG AA.",
      };
    case "WRITING":
      return {
        title: "Senior Editorial Director & Master Conversion Copywriting Strategist",
        mission: "Menghasilkan tulisan berkualitas editorial tinggi, memikat pembaca sejak kalimat pertama (hook), mengalir logis, bebas klise, dan berorientasi aksi nyata.",
      };
    case "MARKETING":
      return {
        title: "Chief Marketing Officer (CMO) & Growth Marketing Strategist",
        mission: "Menyusun strategi kampanye pemasaran berkonversi tinggi, positioning produk tajam, customer persona mendalam, dan funnel akuisisi terukur.",
      };
    case "RESEARCH":
      return {
        title: "Principal Academic Researcher, Methodologist & Journal Peer Reviewer",
        mission: "Menyusun kerangka metodologi penelitian yang ketat, sintesis literatur komprehensif, operasionalisasi variabel terukur, dan standar sitasi ilmiah bereputasi.",
      };
    case "BUSINESS_PRD":
      return {
        title: "Chief Product Officer (CPO) & Senior Principal Product Manager",
        mission: "Menyusun Product Requirement Document (PRD) berstandar Silicon Valley dengan problem statement tajam, matriks MoSCoW, user stories, dan acceptance criteria.",
      };
    case "AI_AGENT":
      return {
        title: "Lead AI Engineer & LLM Systems Architect",
        mission: "Merancang arsitektur AI Agent otonom, pipeline RAG dengan hybrid vector search, tool calling guardrails, dan session memory yang deterministic.",
      };
    case "DATA_ANALYSIS":
      return {
        title: "Principal Data Engineer & Lead Analytics Architect",
        mission: "Menyusun pipeline ETL/ELT efisien, pemodelan data Star/Snowflake Schema, query SQL tingkat lanjut, pembersihan data terotomasi, dan insight analitik berbasis bukti.",
      };
    case "CYBERSEC":
      return {
        title: "Principal Cybersecurity Engineer & CISSP Lead Security Auditor",
        mission: "Merancang arsitektur pertahanan siber Zero-Trust, mitigasi ancaman OWASP Top 10, manajemen kunci enkripsi AES-256, dan audit kepatuhan ISO 27001.",
      };
    case "LEGAL":
      return {
        title: "Senior Corporate Legal Counsel & Contract Drafting Specialist",
        mission: "Menyusun draf dokumen hukum formal berpasal-pasal baku, klausul perlindungan hak cipta/HAKI, pembatasan tanggung jawab, dan mitigasi risiko sengketa.",
      };
    case "GAME_DEV":
      return {
        title: "Lead Game Designer & Combat Systems Architect",
        mission: "Merancang Game Design Document (GDD) mendalam dengan core gameplay loop adiktif, balancing stat matematika, narasi dunia imersif, dan branching dialog.",
      };
    case "IMAGE_GEN":
      return {
        title: "Master Prompt Visual Artist & Cinematography Director",
        mission: "Menyusun prompt visual fotorealistik ultra-detail dengan deskripsi komposisi kamera, pencahayaan sinematik, palet warna, dan parameter render presisi.",
      };
    default:
      return {
        title: "Senior Specialist & Executive Solution Strategist",
        mission: "Menyusun panduan eksekusi tingkat ahli yang terstruktur, tuntas, komprehensif, dan langsung dapat dieksekusi tanpa keraguan.",
      };
  }
}

// 4. DOMAIN-SPECIFIC PROMPT STRUCTURING DIRECTIVES
export function getDomainDirectives(domain: TaskCategory, formData?: any): string {
  const role = getDomainRole(domain);

  switch (domain) {
    case "CODING":
    case "WEB_DEV":
      return `
[DOMAIN SPECIFIC DIRECTIVES - HIGH-PERFORMANCE SOFTWARE ENGINEERING]
- AI target bertindak sebagai: ${role.title}
- Misi: ${role.mission}
- STRUKTUR SEKSI PROMPT WAJIB:
  1. [ROLE & MISSION]
  2. [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
  3. [CONTEXT & PROBLEM BACKGROUND]
  4. [OBJECTIVES & SUCCESS METRICS]
  5. [MANDATORY REQUIREMENTS (MUST HAVE / SHOULD HAVE / OPTIONAL)]
  6. [FUNCTIONAL REQUIREMENTS (INPUT -> PROCESS -> OUTPUT FLOW)]
     * Untuk setiap fitur: Nyatakan Input data, Proses bisnis/validasi, Output sukses, dan Penanganan kasus gagal/error.
  7. [TECHNICAL & ARCHITECTURE REQUIREMENTS]
     * Pertahankan stack: ${formData?.programmingLanguage || "TypeScript"} / ${formData?.framework || "React/Next.js"} / ${formData?.database || "PostgreSQL"}.
     * Standar: Clean Architecture, Type Safety, Modular Folder Structure, DTO & Service Repository pattern.
  8. [DESIGN & UI/UX REQUIREMENTS]
     * Layout, Navigation, Spacing 8pt grid, Typography, dan 4 State Wajib: Loading Skeleton, Empty State, Error Feedback, Success Toast.
     * Responsive Behavior: Mobile-first, Tablet, Desktop.
     * Accessibility: WCAG AA contrast ratio & Semantic HTML.
  9. [EDGE CASES & ERROR HANDLING]
     * Validasi input tidak valid, data duplikat, network/API failure, unauthorized access (401/403), database deadlock, empty query.
  10. [NEGATIVE CONSTRAINTS & BOUNDARIES]
     * DILARANG menggunakan komentar '// TODO' atau kode terpotong. Berikan kode utuh siap jalan.
     * DILARANG mengganti teknologi tanpa alasan.
  11. [EXPECTED FINAL DELIVERABLES]
     * Folder Structure, Complete Source Code per modul, Database Migration Schema, Setup Instructions, dan Sample Unit/Integration Test.
  12. [QUALITY CRITERIA & ACCEPTANCE DEFINITIONS]`;

    case "UI_UX":
      return `
[DOMAIN SPECIFIC DIRECTIVES - UI/UX & DESIGN SYSTEM ARCHITECTURE]
- AI target bertindak sebagai: ${role.title}
- Misi: ${role.mission}
- STRUKTUR SEKSI PROMPT WAJIB:
  1. [ROLE & MISSION]
  2. [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
  3. [CONTEXT & USER PERSONA]
  4. [OBJECTIVES & DESIGN PRINCIPLES]
  5. [DESIGN SYSTEM & TOKENS]
     * Skala tipografi matematis (Major Second / 1.125 ratio), Spacing 8pt grid, Palet warna HSB konsisten, Tema: ${formData?.designTheme || "Clean Modern Glassmorphism"}.
  6. [LAYOUT & COMPONENT HIERARCHY]
     * Header/Navbar, Hero/Main Canvas, Bento Grid cards, Form Controls, CTA buttons, Footer.
  7. [INTERACTIVE STATES & MICRO-INTERACTIONS]
     * Hover, Focus ring (accessibility), Active, Disabled, Loading Skeleton, Empty State dengan ilustrasi/pesan bantuan, Error Toast.
  8. [RESPONSIVE BREAKPOINTS & ADAPTIVE LAYOUT]
     * Mobile (375px - touch target min 44px), Tablet (768px), Desktop (1440px).
  9. [ACCESSIBILITY & WCAG AA COMPLIANCE]
     * Contrast ratio minimal 4.5:1 untuk teks normal, ARIA tags, navigasi keyboard.
  10. [NEGATIVE CONSTRAINTS & AVOIDED PATTERNS]
     * Hindari AI Slop (warna gradient ungu-ke-biru acak, border tebal berebut sudut rounded, nested cards).
  11. [EXPECTED DELIVERABLES & CLEAN JSX/HTML CODE]`;

    case "WRITING":
    case "MARKETING":
      return `
[DOMAIN SPECIFIC DIRECTIVES - EDITORIAL & CONVERSION COPYWRITING]
- AI target bertindak sebagai: ${role.title}
- Misi: ${role.mission}
- STRUKTUR SEKSI PROMPT WAJIB:
  1. [ROLE & MISSION]
  2. [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
  3. [TARGET AUDIENCE & READERSHIP CONTEXT] (Target: ${formData?.targetAudience || "Professional Practitioner"})
  4. [CORE OBJECTIVE & VALUE PROPOSITION]
  5. [VOICE, TONE & EDITORIAL STYLE] (Tone: ${formData?.tone || "Professional, Engaging & Persuasive"})
  6. [CONTENT OUTLINE & STRUCTURAL PROGRESSION]
     * Compelling Hook, Problem Statement, Framework Solusi (AIDA/PAS), Sub-headings H1-H3, Key Takeaways, Strong Call-to-Action (CTA).
  7. [SEO & LSI KEYWORD PLACEMENT] (Integrasi alami tanpa keyword stuffing)
  8. [NEGATIVE CONSTRAINTS & FLUFF BAN]
     * DILARANG menggunakan kata klise AI generik ("supercharge", "empower", "in today's fast-paced world").
     * DILARANG mengarang statistik palsu.
  9. [EXPECTED COMPLETE COPYWRITING OUTPUT]`;

    case "RESEARCH":
      return `
[DOMAIN SPECIFIC DIRECTIVES - ACADEMIC RESEARCH & SYSTEMATIC METHODOLOGY]
- AI target bertindak sebagai: ${role.title}
- Misi: ${role.mission}
- STRUKTUR SEKSI PROMPT WAJIB:
  1. [ROLE & MISSION]
  2. [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
  3. [RESEARCH BACKGROUND & PROBLEM FORMULATION]
  4. [RESEARCH QUESTIONS & HYPOTHESES]
  5. [THEORETICAL FRAMEWORK & LITERATURE REVIEW SYNTHESIS MATRIX]
  6. [RESEARCH METHODOLOGY & INSTRUMENTATION]
     * Desain riset, populasi & teknik sampling, instrumen pengumpulan data, uji validitas & reliabilitas, teknik analisis data (SPSS/SEM/Kualitatif).
  7. [ACADEMIC RIGOR, CITATION CONVENTIONS & ETHICS] (APA 7th / IEEE standard)
  8. [NEGATIVE CONSTRAINTS] (Bebas bias, tanpa plagiasi, tanpa asumsi yang tidak berdasar teori)
  9. [EXPECTED RESEARCH DELIVERABLES]`;

    case "BUSINESS_PRD":
      return `
[DOMAIN SPECIFIC DIRECTIVES - EXECUTIVE PRODUCT SPECIFICATION (PRD)]
- AI target bertindak sebagai: ${role.title}
- Misi: ${role.mission}
- STRUKTUR SEKSI PROMPT WAJIB:
  1. [ROLE & MISSION]
  2. [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
  3. [EXECUTIVE SUMMARY & PROBLEM STATEMENT]
  4. [BUSINESS GOALS & MEASURABLE KPIS]
  5. [USER PERSONAS & USER JOURNEY MAP]
  6. [FEATURE SPECIFICATIONS & MOSCOW PRIORITIZATION MATRIX]
     * Must-Have (P1), Should-Have (P2), Could-Have (P3), Won't-Have (P4).
  7. [FUNCTIONAL REQUIREMENTS (INPUT -> PROCESS -> OUTPUT & EDGE CASES)]
  8. [TECHNICAL ARCHITECTURE & INTEGRATION REQUIREMENTS]
  9. [ACCEPTANCE CRITERIA (GIVEN-WHEN-THEN FORMAT)]
  10. [RELEASE ROADMAP & RISK MITIGATION]
  11. [NEGATIVE CONSTRAINTS & NON-GOALS]
  12. [EXPECTED PRD DELIVERABLES]`;

    case "DATA_ANALYSIS":
      return `
[DOMAIN SPECIFIC DIRECTIVES - DATA ENGINEERING & ADVANCED ANALYTICS]
- AI target bertindak sebagai: ${role.title}
- Misi: ${role.mission}
- STRUKTUR SEKSI PROMPT WAJIB:
  1. [ROLE & MISSION]
  2. [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
  3. [DATASET CONTEXT & BUSINESS QUESTIONS]
  4. [DATA SCHEMA & MODELING SPECIFICATIONS] (Star Schema / 3NF / Dimensional Modeling)
  5. [ETL & DATA TRANSFORMATION LOGIC]
     * Data Cleaning, Deduplication, Type Casting, Missing Value Handling.
  6. [ADVANCED SQL QUERIES & SCRIPT PYTHON PANDAS]
     * CTEs, Window Functions (ROW_NUMBER, DENSE_RANK, LEAD/LAG), Grouping Sets.
  7. [DATA VALIDATION & ANOMALY DETECTION]
  8. [VISUALIZATION & DASHBOARD RECOMMENDATIONS]
  9. [NEGATIVE CONSTRAINTS] (No un-indexed full table scans on large data, no SQL injection)
  10. [EXPECTED PRODUCTION DELIVERABLES]`;

    case "IMAGE_GEN":
      return `
[DOMAIN SPECIFIC DIRECTIVES - PHOTOREALISTIC & ARTISTIC IMAGE PROMPTING]
- AI target bertindak sebagai: ${role.title}
- Misi: ${role.mission}
- STRUKTUR SEKSI PROMPT WAJIB:
  1. [PRIMARY SUBJECT & COMPOSITION] (Rule of thirds, focal point, subject depth)
  2. [ARTISTIC STYLE & MEDIUM] (e.g. 35mm film photography, 8k octane render, cinematic still)
  3. [LIGHTING, TIME OF DAY & ATMOSPHERE] (Volumetric god rays, golden hour, rim light, ambient occlusion)
  4. [CAMERA SPECIFICATIONS & LENS] (85mm f/1.4 lens, shallow depth of field, bokeh, ISO 100)
  5. [COLOR PALETTE & MOOD] (Kodak Portra 400 tones, high dynamic range HDR)
  6. [NEGATIVE PROMPT & UNWANTED ARTIFACTS] (No blur, no deformed hands, no extra limbs, no watermark, no oversaturation)
  7. [RENDER PARAMETERS & ASPECT RATIO] (e.g. --ar 16:9 --v 6.0 --style raw)`;

    default:
      return `
[DOMAIN SPECIFIC DIRECTIVES - HIGH-PRECISION DIRECT EXECUTION]
- AI target bertindak sebagai: ${role.title}
- Misi: ${role.mission}
- STRUKTUR SEKSI PROMPT WAJIB:
  1. [ROLE & MISSION]
  2. [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
  3. [CONTEXT & OBJECTIVE]
  4. [STEP-BY-STEP STRATEGIC EXECUTION PLAN]
  5. [DETAILED REQUIREMENTS & SPECIFICATIONS]
  6. [NEGATIVE CONSTRAINTS & QUALITY STANDARDS]
  7. [EXPECTED OUTPUT FORMAT & PRODUCTION DELIVERABLES]`;
  }
}

// 5. 8-PILLAR PROMPT QUALITY ASSESSMENT ENGINE
export function computePromptQualityScore(
  promptText: string,
  requirements: RequirementDecomposition
): QualityControlReport {
  if (!promptText || promptText.trim().length === 0) {
    const emptyDimensions: QualityDimensions = {
      clarity: 0,
      completeness: 0,
      specificity: 0,
      consistency: 0,
      context: 0,
      constraints: 0,
      outputDefinition: 0,
      ambiguityResolution: 0,
    };
    return {
      overallScore: 0,
      rating: "Empty Output",
      requirementCoverage: 0,
      clarityScore: 0,
      specificityScore: 0,
      consistencyScore: 0,
      contextAccuracy: 0,
      actionabilityScore: 0,
      testabilityScore: 0,
      completenessScore: 0,
      constraintsScore: 0,
      outputDefinitionScore: 0,
      ambiguityResolutionScore: 0,
      dimensions: emptyDimensions,
      ambiguitiesResolved: [],
      assumptions: requirements.assumptions,
      clarificationsNeeded: requirements.clarificationsNeeded,
      qualityHighlights: ["Tidak ada prompt yang dihasilkan."],
      taskCategoryDetected: requirements.taskCategory,
      detectedDomain: requirements.taskCategory,
    };
  }

  const length = promptText.length;
  const lower = promptText.toLowerCase();

  // Check structure headers
  const sectionHeaders = promptText.match(/\[[A-Z0-9 _\-&/:]+\]/g) || [];
  const sectionCount = sectionHeaders.length;

  const hasAntiMeta =
    promptText.includes("[MANDATORY DIRECTIVE") ||
    promptText.includes("DILARANG MEMBUAT PROMPT") ||
    promptText.includes("LANGSUNG EKSEKUSI");

  const hasRole = promptText.includes("ROLE") || promptText.includes("SEBAGAI") || promptText.includes("ARCHITECT") || promptText.includes("ENGINEER");
  const hasContext = promptText.includes("CONTEXT") || promptText.includes("LATAR") || promptText.includes("BACKGROUND");
  const hasObjectives = promptText.includes("OBJECTIVE") || promptText.includes("TUJUAN") || promptText.includes("GOAL");
  const hasFuncReqs = promptText.includes("FUNCTIONAL") || promptText.includes("INPUT -> PROCESS") || promptText.includes("FITUR");
  const hasTechReqs = promptText.includes("TECHNICAL") || promptText.includes("ARSITEKTUR") || promptText.includes("STACK");
  const hasUIReqs = promptText.includes("DESIGN") || promptText.includes("UI/UX") || promptText.includes("LAYOUT") || promptText.includes("STATE");
  const hasNegativeConstraints = promptText.includes("NEGATIVE CONSTRAINTS") || promptText.includes("DILARANG") || promptText.includes("BATASAN") || promptText.includes("AVOID");
  const hasEdgeCases = promptText.includes("EDGE CASES") || promptText.includes("ERROR HANDLING") || promptText.includes("KASUS GAGAL");
  const hasDeliverables = promptText.includes("DELIVERABLES") || promptText.includes("OUTPUT") || promptText.includes("IMPLEMENTATION");
  const hasTesting = promptText.includes("TEST") || promptText.includes("ACCEPTANCE") || promptText.includes("VALIDATION") || promptText.includes("KRITERIA");

  // Requirement Coverage
  let coveredCount = 0;
  requirements.mustHaveRequirements.forEach((req) => {
    const rawVal = req.includes(":") ? req.split(":")[1].trim() : req;
    const cleanWord = rawVal.replace(/[^a-zA-Z0-9 ]/g, "").trim().toLowerCase();
    if (cleanWord.length > 2) {
      const parts = cleanWord.split(/\s+/);
      const isPresent = parts.some((p) => p.length > 3 && lower.includes(p));
      if (isPresent) coveredCount++;
    }
  });

  const reqCoverage = requirements.mustHaveRequirements.length > 0
    ? Math.min(100, Math.round((coveredCount / requirements.mustHaveRequirements.length) * 100))
    : 95;

  // Calculate 8 Pillar Scores (0 - 100)
  // 1. Clarity
  const clarity = hasAntiMeta && sectionCount >= 4 ? 98 : sectionCount >= 2 ? 88 : 75;

  // 2. Completeness
  let completenessChecklist = 0;
  if (hasRole) completenessChecklist += 12;
  if (hasContext) completenessChecklist += 12;
  if (hasObjectives) completenessChecklist += 12;
  if (hasFuncReqs || hasTechReqs) completenessChecklist += 16;
  if (hasUIReqs || requirements.taskCategory !== "CODING") completenessChecklist += 12;
  if (hasNegativeConstraints) completenessChecklist += 12;
  if (hasEdgeCases || hasTesting) completenessChecklist += 12;
  if (hasDeliverables) completenessChecklist += 12;
  const completeness = Math.min(100, Math.max(70, completenessChecklist));

  // 3. Specificity
  const hasNoPlaceholders = !promptText.includes("TODO") && !promptText.includes("ISI DISINI") && !promptText.includes("[INSERT");
  const specificity = hasNoPlaceholders && length > 900 ? 98 : length > 500 ? 90 : 78;

  // 4. Consistency
  const consistency = hasNoPlaceholders ? 98 : 82;

  // 5. Context
  const context = hasContext && hasObjectives ? 96 : 85;

  // 6. Constraints
  const constraints = hasNegativeConstraints ? 98 : 75;

  // 7. Output Definition
  const outputDefinition = hasDeliverables ? 98 : 82;

  // 8. Ambiguity Resolution
  const ambiguityResolution = requirements.detectedAmbiguities.length === 0 || requirements.conflictResolutions.length > 0 ? 96 : 80;

  const dimensions: QualityDimensions = {
    clarity,
    completeness,
    specificity,
    consistency,
    context,
    constraints,
    outputDefinition,
    ambiguityResolution,
  };

  // Weighted Overall Score
  const overallScore = Math.round(
    reqCoverage * 0.15 +
      clarity * 0.15 +
      completeness * 0.15 +
      specificity * 0.15 +
      consistency * 0.10 +
      context * 0.10 +
      constraints * 0.10 +
      outputDefinition * 0.05 +
      ambiguityResolution * 0.05
  );

  let rating = "Production-Ready Master (95-100)";
  if (overallScore < 75) rating = "Needs Refinement (<75)";
  else if (overallScore < 88) rating = "Acceptable (75-87)";
  else if (overallScore < 95) rating = "High Quality (88-94)";

  const qualityHighlights: string[] = [
    hasAntiMeta
      ? "Klausul Anti-Meta aktif: AI target langsung mengeksekusi solusi tuntas tanpa basa-basi atau membuat prompt baru."
      : "Prompt langsung berorientasi aksi nyata.",
    `Memiliki ${sectionCount} seksi terstruktur berurutan logis.`,
    hasNegativeConstraints
      ? "Negative constraints terdefinisi ketat untuk mencegah bug dan anti-pattern."
      : "Batasan operasional terdefinisi.",
    hasDeliverables
      ? "Deliverables terdaftar eksplisit dengan ekspektasi keluaran yang dapat diverifikasi."
      : "Format output tertera jelas.",
  ];

  if (requirements.assumptions.length > 0) {
    qualityHighlights.push(`${requirements.assumptions.length} Asumsi cerdas ditambahkan secara transparan untuk melengkapi input singkat.`);
  }

  return {
    overallScore,
    rating,
    requirementCoverage: reqCoverage,
    clarityScore: clarity,
    specificityScore: specificity,
    consistencyScore: consistency,
    contextAccuracy: context,
    actionabilityScore: outputDefinition,
    testabilityScore: hasTesting ? 95 : 82,
    completenessScore: completeness,
    constraintsScore: constraints,
    outputDefinitionScore: outputDefinition,
    ambiguityResolutionScore: ambiguityResolution,
    dimensions,
    ambiguitiesResolved: requirements.conflictResolutions,
    assumptions: requirements.assumptions,
    clarificationsNeeded: requirements.clarificationsNeeded,
    qualityHighlights,
    taskCategoryDetected: requirements.taskCategory,
    detectedDomain: requirements.taskCategory,
  };
}
