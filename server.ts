import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

const currentDirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  let onlineUsersCount = 0;

  function broadcast(data: any, senderWs?: WebSocket) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client !== senderWs) {
        client.send(payload);
      }
    });
  }

  function broadcastAll(data: any) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  wss.on("connection", (ws) => {
    onlineUsersCount++;
    
    // Initial connection payload
    ws.send(JSON.stringify({
      type: "INIT_PRESENCE",
      onlineUsers: onlineUsersCount,
      timestamp: new Date().toISOString(),
    }));

    broadcastAll({
      type: "PRESENCE_CHANGE",
      onlineUsers: onlineUsersCount,
    });

    ws.on("message", (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === "PING") {
          ws.send(JSON.stringify({
            type: "PONG",
            clientTimestamp: parsed.timestamp,
            serverTimestamp: Date.now(),
          }));
          return;
        }

        // Forward activity and state sync events to all other connected clients
        broadcast(parsed, ws);
      } catch (e) {
        console.error("WebSocket message parse error:", e);
      }
    });

    ws.on("close", () => {
      onlineUsersCount = Math.max(1, onlineUsersCount - 1);
      broadcastAll({
        type: "PRESENCE_CHANGE",
        onlineUsers: onlineUsersCount,
      });
    });
  });

  app.use(express.json({ limit: "10mb" }));

  // Helper to initialize GoogleGenAI with appropriate user-agent header
  const getAI = () => {
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Helper to strip #, @, * symbols and emojis from AI responses
  function cleanAISymbols(text: string): string {
    if (!text) return "";
    return text
      .replace(/[#@*]/g, "")
      .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, "");
  }

  // Fallback models if primary model hits rate limit / quota limits (429)
  const FALLBACK_MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  async function generateContentWithFallback(ai: GoogleGenAI, params: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }) {
    const primary = params.preferredModel || "gemini-3.6-flash";
    const modelsToTry = [
      primary,
      ...FALLBACK_MODELS.filter((m) => m !== primary),
    ];

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err);
        const isQuotaError =
          err?.status === 429 ||
          errStr.includes("429") ||
          errStr.includes("RESOURCE_EXHAUSTED") ||
          errStr.includes("Quota exceeded") ||
          errStr.includes("rate-limits");

        if (!isQuotaError) {
          throw err;
        }
        console.warn(`Gemini model ${model} hit quota limit, trying fallback...`);
      }
    }

    throw lastError || new Error("Batas kuota harian API Gemini telah tercapai.");
  }

  function formatFriendlyErrorMessage(error: any): string {
    if (!error) return "Terjadi kesalahan tidak dikenal pada server.";

    let rawMsg = error.message || String(error);

    if (typeof rawMsg === "string" && rawMsg.trim().startsWith("{")) {
      try {
        const parsedObj = JSON.parse(rawMsg.trim());
        if (parsedObj?.error?.message) {
          rawMsg = parsedObj.error.message;
        }
      } catch {
        // Keep rawMsg
      }
    }

    if (
      rawMsg.includes("RESOURCE_EXHAUSTED") ||
      rawMsg.includes("Quota exceeded") ||
      rawMsg.includes("429")
    ) {
      return "Batas kuota gratis API Gemini telah tercapai (Rate Limit 429). Silakan tunggu beberapa saat atau coba lagi secara berkala.";
    }

    return rawMsg.replace(/[#@*]/g, "").replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, "");
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 1. AI Wizard Endpoint: Auto-fill form fields and build prompt from simple user sentence
  app.post("/api/gemini/wizard", async (req, res) => {
    try {
      const { input } = req.body;
      if (!input) {
        return res.status(400).json({ error: "Input statement is required" });
      }

      const ai = getAI();
      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.6-flash",
        contents: `Analisa permintaan pengguna berikut dan buatkan rekomendasi field form serta prompt AI TINGKAT MASTER YANG BERSIH, TERSTRUKTUR, & PRESISI TINGGI DENGAN RENCANA EKSEKUSI (EXECUTION PLAN) untuk domain apapun.
Input pengguna: "${input}"

Aturan Penulisan "generatedPrompt":
- WAJIB BERSIH & PRESISI: Jangan menyertakan kalimat pembuka/basa-basi seperti "Berikut adalah prompt...". Langsung mulai dari header.
- DILARANG GUNAKAN TANDA PAGAR / HASHTAG (# ATAU ###), AT SIGN (@), DAN BINTANG (* ATAU **): DILARANG PERNAH menggunakan karakter #, @, atau *. Gunakan format bracket bersih seperti [ROLE & EXPERT PERSONA].
- WAJIB TERSTRUKTUR:
  1. [ROLE & EXPERT PERSONA]
  2. [CORE OBJECTIVES & TASK]
  3. [EXECUTION PLAN & RENCANA KERJA STRATEGIS] (Fase 1: Persiapan & Analisis, Fase 2: Pembangunan Core Architecture/Konten Utama, Fase 3: Integrasi & Optimasi, Fase 4: Pengujian & Output Final)
  4. [SPECIFICATIONS & DOMAIN CONTEXT]
  5. [STEP-BY-STEP IMPLEMENTATION GUIDELINES]
  6. [NEGATIVE CONSTRAINTS]
  7. [EXPECTED OUTPUT FORMAT]

Berikan response dalam JSON dengan format persis berikut:
{
  "title": "Judul prompt yang deskriptif dan profesional",
  "category": "Development | Content | CyberSec | Design | Productivity | Marketing | Business | Academic | AI Agent | Data Science | Legal | Game Dev",
  "subCategory": "Sub-kategori yang sesuai (e.g. Backend, SEO Copy, Research, UI Specs, RAG, Legal Draft, Analysis, Lore)",
  "aiModel": "Gemini 3.6 Flash | Claude 3.5 Sonnet | GPT-4o | DeepSeek V3 | Midjourney v6",
  "language": "Indonesian | English",
  "programmingLanguage": "Bahasa Pemrograman / Tools Utama (e.g. PHP, Python, React, Photoshop, SPSS, or None)",
  "framework": "Framework / Method (e.g. Laravel, Next.js, SEO Framework, Qualitative Method, or None)",
  "database": "Database / Data Store (e.g. PostgreSQL, Redis, Vector DB, Excel, or None)",
  "platform": "Platform / Channel (e.g. Web, Mobile, Blog, Instagram, YouTube, Cloud, or None)",
  "stylePrompt": "Roleplay / Persona | Instruction-Based | Few-Shot | Step-by-Step",
  "tone": "Professional & Technical | Engaging & Persuasive | Academic & Formal | Creative & Inspiring",
  "outputLanguage": "Indonesian | English | Japanese | Spanish",
  "creativity": "Balanced (0.7) | High (1.0) | Strict/Exact (0.2)",
  "length": "Comprehensive | Concise | Detailed Code + Explanation | Essay / Full Chapter",
  "targetAudience": "Senior Engineer | General Reader | Academic Evaluator | End User | Executive | Client",
  "description": "Deskripsi singkat tentang apa yang ingin dicapai oleh prompt ini",
  "additionalReqs": "Kebutuhan khusus, konteks khusus, atau constraint utama",
  "negativePrompt": "Hal-hal yang HARUS DIHINDARI oleh AI saat menjawab",
  "expectedOutput": "Format output yang diharapkan (misal: markdown document, step-by-step table, clean modular code, image prompt)",
  "generatedPrompt": "Teks prompt master yang sudah diformat bersih tanpa basa-basi dan tanpa simbol #, @, *"
}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const jsonText = response.text || "{}";
      const parsed = JSON.parse(jsonText);
      if (parsed && parsed.generatedPrompt) {
        parsed.generatedPrompt = cleanAISymbols(parsed.generatedPrompt);
      }
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error("AI Wizard Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 2. Generate Prompt Endpoint: Build a prompt from structured form data
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const formData = req.body;
      const ai = getAI();

      const isDirectAllInOne = 
        (formData.stylePrompt && (formData.stylePrompt.includes("Direct") || formData.stylePrompt.includes("Langsung Jadi") || formData.stylePrompt.includes("All-in-One"))) ||
        (formData.length && (formData.length.includes("Full Complete Solution") || formData.length.includes("Langsung")));

      const systemInstruction = `Kamu adalah World-Class Master Prompt Engineer & Universal AI Architect.
Tugasmu adalah menghasilkan PROMPT AI YANG ULTRA-CLEAN, PRESISI, TERSTRUKTUR DENGAN SANGAT RAPI, DAN BEBAS HALUSINASI/AMBIGUITAS.

ATURAN UTAMA PROMPT CLEAN & PRESISI:
1. TANPA BASA-BASI / META-TEXT: JANGAN PERNAH menyertakan pesan seperti "Berikut adalah prompt Anda..." atau "Tentu, ini prompt-nya:". Mulai langsung dari baris pertama.
2. DILARANG SANGAT GUNAKAN TANDA PAGAR (#), AT SIGN (@), DAN BINTANG (* ATAU **): DILARANG KERAS menggunakan karakter #, @, atau * di bagian mana pun. Gunakan format judul bracket bersih seperti [ROLE & EXPERT PERSONA].
3. BAHASA TAJAM & AKURAT: Gunakan istilah teknis/domain yang tepat 100% sesuai dengan bahasa pemrograman, framework, atau domain yang diminta.
4. STRUKTUR MANDATORI (7 SEKSI WAJIB):
   - [ROLE & EXPERT PERSONA]
   - [CORE OBJECTIVES & TASK]
   - [EXECUTION MODE: ${isDirectAllInOne ? 'LANGSUNG JADI & LENGKAP (ALL-IN-ONE SINGLE RESPONSE)' : 'STEP-BY-STEP EXECUTION PLAN'}]
   - [DOMAINS & SPECIFICATIONS CONTEXT]
   - [FULL IMPLEMENTATION & CODE / CONTENT REQUIREMENTS]
   - [NEGATIVE CONSTRAINTS & STRICT RULE: DILARANG POTONGAN KODE ATAU TANYA KONFIRMASI BERTAHAP]
   - [EXPECTED OUTPUT FORMAT & DELIVERABLES]

5. ATURAN EKSEKUSI: ${isDirectAllInOne 
  ? 'MANDATORI UTAMA: Prompt yang dihasilkan HARUS MENGAJARKAN & MEMERINTAHKAN AI PENERIMA PROMPT UNTUK LANGSUNG MEMBERIKAN SELURUH SOLUSI/KODE LENGKAP A-Z SECARA UTUH, SIAP PAKAI, TANPA MEMINTA KONFIRMASI BERTAHAP ATAU JAWABAN SETENGAH-SETENGAH.' 
  : 'Setiap prompt yang dihasilkan harus menginstruksikan AI penerima prompt untuk bekerja secara sistematis dan terarah fase demi fase.'}`;

      const promptPayload = `Susunlah prompt AI tingkat master yang sangat bersih, ampuh, presisi, dan terstruktur berdasarkan spesifikasi berikut:
- Judul: ${formData.title || "Untitled Prompt"}
- Kategori / Sub-Kategori: ${formData.category || "General"} / ${formData.subCategory || "General"}
- Target Model AI: ${formData.aiModel || "Universal AI"}
- Bahasa Pemrograman / Tools: ${formData.programmingLanguage || "N/A"}
- Framework / Metode: ${formData.framework || "N/A"}
- Database / Data Store: ${formData.database || "N/A"}
- Platform / Channel: ${formData.platform || "N/A"}
- Style Prompt: ${formData.stylePrompt || "Direct All-in-One (Langsung Jadi & Lengkap)"}
- Tema & Gaya Tampilan UI (Theme / Aesthetic): ${formData.designTheme || "Glassmorphism / Glass Friendly Clean UI"}
- Tone: ${formData.tone || "Professional"}
- Bahasa Output AI: ${formData.outputLanguage || "Indonesian"}
- Tingkat Kreativitas: ${formData.creativity || "Balanced"}
- Panjang Jawaban: ${formData.length || "Full Complete Solution"}
- Target Audience: ${formData.targetAudience || "Target User"}
- Deskripsi Ide Utama: ${formData.description || "N/A"}
- Kebutuhan Tambahan: ${formData.additionalReqs || "N/A"}
- Negative Prompt (Avoid): ${formData.negativePrompt || "N/A"}
- Expected Output: ${formData.expectedOutput || "N/A"}
- Referensi: ${formData.reference || "N/A"}
${isDirectAllInOne ? '- CATATAN KHUSUS: PENGGUNA MEMINTA PROMPT "LANGSUNG JADI & LENGKAP (ALL-IN-ONE)". Pastikan prompt menginstruksikan AI untuk menulis seluruh file/konten/kode secara utuh tanpa terpotong!' : ''}

Pastikan prompt akhir ini SANGAT BERSIH, PRESISI, TANPA SIMBOL #, @, *, dan BERHASIL TINGGI! Hasilkan HANYA TULISAN PROMPT AKHIR siap pakai tanpa basa-basi.`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.6-flash",
        contents: promptPayload,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      res.json({ success: true, generatedPrompt: cleanAISymbols(response.text || "") });
    } catch (error: any) {
      console.error("Generate Prompt Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 3. PRD Generator Endpoint: Generate a full Product Requirement Document (PRD)
  app.post("/api/gemini/prd", async (req, res) => {
    try {
      const { title, description, category, targetAudience, techStack, keyFeatures } = req.body;
      const ai = getAI();

      const systemInstruction = `Kamu adalah Chief Product Officer (CPO) & Senior Principal Product Manager berpengalaman di perusahaan teknologi global.
Tugasmu adalah menyusun PRODUCT REQUIREMENT DOCUMENT (PRD) yang SANGAT LENGKAP, SANGAT DETAIL, DAN LANGSUNG SIAP EKSEKUSI (PRODUCTION-READY PRD).

ATURAN MANDATORI SIMBOL:
DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG (#), AT SIGN (@), DAN BINTANG (* ATAU **). Gunakan penomoran biasa (1., 2.), huruf kapital, atau tanda kurung siku [JUDUL] tanpa simbol #, @, atau *.

Struktur Wajib PRD:
[PRODUCT REQUIREMENT DOCUMENT (PRD): ${title || "Untitled Product"}]

[1. EXECUTIVE SUMMARY & PROBLEM STATEMENT]
- Visi Produk & Latar Belakang Masalah
- Masalah Utama Pengguna & Solusi Produk

[2. GOALS & KEY SUCCESS METRICS (KPIs)]
- Core Business Objectives
- Key Performance Indicators (KPIs & Target)

[3. TARGET USER PERSONAS & USER STORIES]
- Primary & Secondary User Personas
- List User Stories (As a User, I want Action, so that Value)

[4. FUNCTIONAL REQUIREMENTS & FEATURE SPECS]
- Core Features Breakdown & Priority Matrix (P1 Must-Have, P2 Should-Have, P3 Nice-To-Have)
- Acceptance Criteria per Fitur

[5. TECHNICAL ARCHITECTURE & DATA MODEL PROPOSAL]
- Recommended Tech Stack (Frontend, Backend, Database, Infrastructure)
- Entity Relationship / Key Data Models

[6. EXECUTION PLAN & PHASED ROADMAP]
- Phase 1: MVP & Core Foundation
- Phase 2: Feature Expansion & Integrations
- Phase 3: Scaling, Security & Polish

[7. NON-FUNCTIONAL REQUIREMENTS & RISK MATRIX]
- Performance, Security, & Scalability
- Risk Analysis & Mitigation Strategy`;

      const promptPayload = `Buatkan PRD (Product Requirement Document) lengkap & profesional berdasarkan spesifikasi berikut:
- Nama Produk: ${title || "Aplikasi Enterprise"}
- Konsep Produk / Ide: ${description || "Sistem web berbasis AI"}
- Kategori: ${category || "SaaS / Web App"}
- Target Audience: ${targetAudience || "Software Engineers & Business Users"}
- Recommended Tech Stack: ${techStack || "TypeScript, React, Node.js, PostgreSQL"}
- Kebutuhan / Fitur Utama: ${keyFeatures || "Dashboard, Otentikasi, Reporting, AI Integration"}

Hasilkan PRD yang SANGAT DETAIL, PROFESIONAL, LENGKAP DAN DILARANG GUNAKAN SIMBOL #, @, ATAU * !`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.6-flash",
        contents: promptPayload,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      res.json({ success: true, prdDocument: cleanAISymbols(response.text || "") });
    } catch (error: any) {
      console.error("PRD Generator Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 3. Prompt Scoring & Audit Endpoint
  app.post("/api/gemini/score", async (req, res) => {
    try {
      const { promptText, title } = req.body;
      if (!promptText) {
        return res.status(400).json({ error: "Prompt text is required for scoring" });
      }

      const ai = getAI();
      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.6-flash",
        contents: `Evaluasi kualitas prompt AI berikut sebagai seorang AI Prompt Engineer Senior.
DILARANG GUNAKAN SIMBOL #, @, ATAU * DALAM NILAI TEKS EVALUASI.

Judul Prompt: "${title || "Prompt"}"
Isi Prompt:
${promptText}

Berikan hasil evaluasi dalam format JSON persis berikut:
{
  "score": 95,
  "rating": "Excellent | Good | Average | Needs Improvement",
  "strengths": [
    "Poin kelebihan 1",
    "Poin kelebihan 2"
  ],
  "weaknesses": [
    "Poin kelemahan 1 atau area yang belum optimal"
  ],
  "recommendations": [
    "Saran konkret 1",
    "Saran konkret 2"
  ],
  "checklist": [
    { "label": "Tujuan Jelas", "passed": true, "note": "Target tugas terdefinisi dengan spesifik" },
    { "label": "Konteks Lengkap", "passed": true, "note": "Konteks latar belakang cukup" },
    { "label": "Output Terstruktur", "passed": true, "note": "Format keluaran dijelaskan" },
    { "label": "Struktur Rapi", "passed": true, "note": "Penataan seksi jelas" },
    { "label": "Negative Constraint", "passed": false, "note": "Belum ada instruksi hal yang dihindari" },
    { "label": "Batasan Teknis", "passed": true, "note": "Stack dan framework disebutkan" }
  ]
}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const jsonText = response.text || "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error("Score Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 4. Prompt Optimizer Endpoint
  app.post("/api/gemini/optimize", async (req, res) => {
    try {
      const { promptText, goal } = req.body;
      if (!promptText) {
        return res.status(400).json({ error: "Prompt text is required" });
      }

      const ai = getAI();
      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.6-flash",
        contents: `Perbaiki dan optimalkan prompt AI berikut menjadi jauh lebih profesional, terstruktur, presisi, dan bebas dari ambiguitas.
DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG (#), AT SIGN (@), ATAU BINTANG (* ATAU **). Gunakan format bracket [JUDUL] atau teks biasa.
${goal ? `Fokus perbaikan: ${goal}` : ""}

Original Prompt:
${promptText}

Berikan response JSON:
{
  "optimizedPrompt": "Versi prompt yang sudah dioptimalkan secara menyeluruh tanpa simbol #, @, atau *, role clear, context, step-by-step guidelines, negative constraints, dan output schema",
  "improvementsMade": [
    "Menambahkan konteks spesifik dan spesifikasi teknis",
    "Memperjelas instruksi langkah demi langkah",
    "Menambahkan batasan negatif (Negative constraints)",
    "Merapikan struktur teks"
  ],
  "scoreBefore": 65,
  "scoreAfter": 98
}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const jsonText = response.text || "{}";
      const parsed = JSON.parse(jsonText);
      if (parsed && parsed.optimizedPrompt) {
        parsed.optimizedPrompt = cleanAISymbols(parsed.optimizedPrompt);
      }
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error("Optimize Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 5. Prompt Translator Endpoint
  app.post("/api/gemini/translate", async (req, res) => {
    try {
      const { promptText, targetLanguage } = req.body;
      if (!promptText || !targetLanguage) {
        return res.status(400).json({ error: "promptText and targetLanguage are required" });
      }

      const ai = getAI();
      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.6-flash",
        contents: `Terjemahkan prompt AI berikut ke bahasa target "${targetLanguage}".
DILARANG GUNAKAN SIMBOL #, @, ATAU *. Pertahankan isi, kode, variabel placeholder, dan istilah teknis dengan tepat.

Original Prompt:
${promptText}

Hasil terjemahan:`,
        config: {
          temperature: 0.2,
        },
      });

      res.json({ success: true, translatedPrompt: cleanAISymbols(response.text || "") });
    } catch (error: any) {
      console.error("Translate Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 6. Playground Test Execution Endpoint
  app.post("/api/gemini/test-run", async (req, res) => {
    try {
      const { promptText, sampleInput } = req.body;
      if (!promptText) {
        return res.status(400).json({ error: "promptText is required" });
      }

      const ai = getAI();
      const combinedInput = sampleInput 
        ? `Prompt/Instruction:\n${promptText}\n\nUser Sample Input Data:\n${sampleInput}`
        : promptText;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.6-flash",
        contents: combinedInput,
        config: {
          systemInstruction: "ATURAN UTAMA: DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG (#), AT SIGN (@), ATAU BINTANG (* ATAU **). Gunakan kalimat teks biasa, penomoran biasa (1., 2.), atau huruf kapital.",
        },
      });

      res.json({ success: true, output: cleanAISymbols(response.text || "") });
    } catch (error: any) {
      console.error("Playground Test Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 7. Floating Gemini AI Assistant Chat Endpoint
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, enableThinking } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      const ai = getAI();
      const systemInstruction = `Kamu adalah ZetassAI — Asisten Ahli AI Engineering, Architect, & Product Manager.
Tugasmu adalah membantu pengguna merancang prompt AI yang tajam, menulis Product Requirement Document (PRD), menyusun arsitektur sistem, memecahkan masalah koding, dan memberikan ide-ide kreatif.
Berikan jawaban yang jelas, sangat membantu, terstruktur rapi, dan gunakan bahasa Indonesia yang ramah & profesional.

ATURAN STRICT SIMBOL & EMOJI:
DILARANG KERAS MENGGUNAKAN EMOJI DALAM BENTUK APA PUN. DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG (#), AT SIGN (@), BINTANG (* ATAU **), ATAU FORMAT BOLD MARKDOWN. Gunakan kalimat teks biasa, penomoran angka biasa (1., 2.), atau huruf KAPITAL untuk penekanan.`;

      // Map chat messages format for Gemini
      const formattedContents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const config: any = {
        systemInstruction,
        temperature: enableThinking ? 0.4 : 0.7,
      };

      if (enableThinking) {
        config.thinkingConfig = {
          thinkingBudget: 2048,
        };
      }

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.6-flash",
        contents: formattedContents,
        config,
      });

      res.json({
        success: true,
        reply: cleanAISymbols(response.text || "Maaf, tidak ada tanggapan dari AI."),
      });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // Vite middleware or production static build handler
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`PromptForge AI Realtime Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
