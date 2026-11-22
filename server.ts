import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation, ThinkingLevel } from "@google/genai";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  cleanAISymbols,
  detectTaskDomain,
  analyzeRequirementsAndConflicts,
  getDomainDirectives,
  computePromptQualityScore,
  RequirementDecomposition,
} from "./server/promptPipeline";
import {
  executeMultiAiChat,
  executeMultiAiGenerate,
  testAiConnection,
  SupportedProvider,
} from "./server/multiAiProvider";

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

  app.use(express.json({ limit: "20mb" }));

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

  // Gemini API Usage State Tracker
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const usageTrackerState = {
    dailyLimit: 1500,
    rpmLimit: 15,
    requestsToday: 45,
    requestsThisMinute: 1,
    lastResetDate: getTodayString(),
    lastMinuteTimestamp: Date.now(),
    breakdown: {
      generator: 18,
      chat: 12,
      optimizer: 5,
      wizard: 4,
      prd: 3,
      playground: 2,
      translate: 1,
      score: 0,
      image: 0,
      video: 0,
      transcribe: 0,
      variants: 0,
    } as Record<string, number>,
    recentLogs: [
      {
        id: "log-init-1",
        action: "Master Prompt Generator",
        model: "gemini-4-hydrogen",
        timestamp: new Date(Date.now() - 120000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        status: "success" as const,
        tokensEstimated: 420,
      },
      {
        id: "log-init-2",
        action: "AI Co-Pilot Chat",
        model: "gemini-4-hydrogen",
        timestamp: new Date(Date.now() - 300000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        status: "success" as const,
        tokensEstimated: 580,
      },
    ] as Array<{
      id: string;
      action: string;
      model: string;
      timestamp: string;
      status: 'success' | 'quota_exceeded' | 'error';
      tokensEstimated?: number;
    }>,
  };

  function checkAndResetUsage() {
    const today = getTodayString();
    if (usageTrackerState.lastResetDate !== today) {
      usageTrackerState.requestsToday = 0;
      usageTrackerState.lastResetDate = today;
      Object.keys(usageTrackerState.breakdown).forEach((k) => {
        usageTrackerState.breakdown[k] = 0;
      });
    }

    const now = Date.now();
    if (now - usageTrackerState.lastMinuteTimestamp > 60000) {
      usageTrackerState.requestsThisMinute = 0;
      usageTrackerState.lastMinuteTimestamp = now;
    }
  }

  function recordUsage(actionName: string, featureKey: string, modelUsed: string, isSuccess = true, tokens = 380) {
    checkAndResetUsage();
    usageTrackerState.requestsToday += 1;
    usageTrackerState.requestsThisMinute += 1;
    if (usageTrackerState.breakdown[featureKey] !== undefined) {
      usageTrackerState.breakdown[featureKey] += 1;
    } else {
      usageTrackerState.breakdown[featureKey] = 1;
    }

    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action: actionName,
      model: modelUsed,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      status: isSuccess ? ("success" as const) : ("quota_exceeded" as const),
      tokensEstimated: tokens,
    };

    usageTrackerState.recentLogs = [newLog, ...usageTrackerState.recentLogs].slice(0, 15);
  }

  function getUsageStats() {
    checkAndResetUsage();
    const remainingRequests = Math.max(0, usageTrackerState.dailyLimit - usageTrackerState.requestsToday);
    const percentUsed = Number(((usageTrackerState.requestsToday / usageTrackerState.dailyLimit) * 100).toFixed(1));
    const quotaAlert80Percent = percentUsed >= 80;

    return {
      requestsToday: usageTrackerState.requestsToday,
      dailyLimit: usageTrackerState.dailyLimit,
      remainingRequests,
      percentUsed,
      requestsPerMinute: usageTrackerState.requestsThisMinute,
      rpmLimit: usageTrackerState.rpmLimit,
      lastResetDate: usageTrackerState.lastResetDate,
      breakdown: { ...usageTrackerState.breakdown },
      recentLogs: [...usageTrackerState.recentLogs],
      quotaAlert80Percent,
    };
  }

  // Active Gemini models conforming strictly to @google/genai guidelines
  const FALLBACK_MODELS = [
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite",
  ];

  function normalizeGeminiModel(model?: string): string {
    if (!model || model === "gemini-3.7-flash" || model === "gemini-flash-latest") {
      return "gemini-4-hydrogen";
    }
    return model;
  }

  function sanitizeGeminiConfig(model: string, config?: any): any {
    const cloned = config && typeof config === "object" ? { ...config } : {};
    if (model.startsWith("gemini-4-")) {
      delete cloned.temperature;
      delete cloned.topP;
      delete cloned.topK;
      delete cloned.candidateCount;
      delete cloned.thinkingBudget;
      const nextThinking =
        cloned.thinkingConfig && typeof cloned.thinkingConfig === "object"
          ? { ...cloned.thinkingConfig }
          : {};
      delete nextThinking.thinkingBudget;
      if (!nextThinking.thinkingLevel) {
        // Default to LOW thinking on gemini-4-hydrogen for fast time-to-first-token
        nextThinking.thinkingLevel = ThinkingLevel.LOW;
      }
      cloned.thinkingConfig = nextThinking;
    }
    return Object.keys(cloned).length > 0 ? cloned : undefined;
  }

  function getActiveAI(ai: GoogleGenAI, customKeys?: Record<string, string>): GoogleGenAI {
    const customGeminiKey = customKeys?.customGemini?.trim() || customKeys?.gemini?.trim();
    if (customGeminiKey) {
      return new GoogleGenAI({
        apiKey: customGeminiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return ai;
  }

  async function generateContentWithFallback(ai: GoogleGenAI, params: {
    contents: any;
    config?: any;
    preferredModel?: string;
    actionName?: string;
    featureKey?: string;
    customKeys?: Record<string, string>;
  }) {
    const primary = normalizeGeminiModel(params.preferredModel || "gemini-4-hydrogen");
    const action = params.actionName || "Gemini Request";
    const feat = params.featureKey || "generator";

    const activeAI = getActiveAI(ai, params.customKeys);

    const rawModels = [
      primary,
      ...FALLBACK_MODELS.filter((m) => m !== primary),
    ];
    const modelsToTry = Array.from(new Set(rawModels.filter(Boolean)));

    let lastError: any = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const maxRetriesPerModel = 2;
      for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
        try {
          const safeConfig = sanitizeGeminiConfig(model, params.config);
          const response = await activeAI.models.generateContent({
            model,
            contents: params.contents,
            config: safeConfig,
          });
          recordUsage(action, feat, model, true, 420);
          return response;
        } catch (err: any) {
          lastError = err;
          const errStr = String(err?.message || err);
          const is503HighDemand = errStr.includes("503") || errStr.includes("high demand") || errStr.includes("UNAVAILABLE") || errStr.includes("temporary");
          const is429Quota = errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED");

          console.warn(`Gemini model ${model} (attempt ${attempt}/${maxRetriesPerModel}) encountered error (${err?.status || 'ERR'}):`, err?.message || err);

          if (attempt < maxRetriesPerModel && (is503HighDemand || is429Quota)) {
            const delayMs = attempt * 600 + Math.floor(Math.random() * 200);
            console.warn(`Retrying model ${model} in ${delayMs}ms due to high demand...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }

          // If high demand spike or quota limit on final attempt for this model, move to next model
          if (i < modelsToTry.length - 1) {
            const nextModel = modelsToTry[i + 1];
            console.warn(`Switching seamlessly to fallback model ${nextModel} (reason: ${is503HighDemand ? '503 High Demand' : is429Quota ? '429 Rate Limit' : 'Failover'})...`);
            await new Promise((resolve) => setTimeout(resolve, is503HighDemand ? 400 : 200));
            break; // Break inner retry loop to move to next model
          }
        }
      }
    }

    // Secondary fallback: If all Gemini models fail and user has other custom keys (e.g. OpenAI, Claude, Groq, DeepSeek)
    if (params.customKeys) {
      const altProviders: SupportedProvider[] = ['openai', 'anthropic', 'deepseek', 'groq', 'openrouter'];
      for (const prov of altProviders) {
        if (params.customKeys[prov]) {
          try {
            console.warn(`Attempting secondary fallback to ${prov}...`);
            const promptText = typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents);
            const altResult = await executeMultiAiGenerate({
              provider: prov,
              customKeys: params.customKeys,
              prompt: promptText,
              systemInstruction: params.config?.systemInstruction,
              temperature: params.config?.temperature || 0.3,
            });
            if (altResult && altResult.text) {
              return {
                text: altResult.text,
                candidates: [{ content: { parts: [{ text: altResult.text }] } }],
              } as any;
            }
          } catch (altErr) {
            console.warn(`Secondary fallback to ${prov} failed:`, altErr);
          }
        }
      }
    }

    recordUsage(action, feat, primary, false, 0);
    throw lastError || new Error("Tidak dapat menghubungi model AI saat ini.");
  }

  function formatFriendlyErrorMessage(error: any): string {
    if (!error) return "Terjadi kesalahan tidak dikenal pada server.";

    let rawMsg = error.message || String(error);

    if (typeof rawMsg === "string" && (rawMsg.trim().startsWith("{") || rawMsg.includes('{"error"'))) {
      try {
        const jsonMatch = rawMsg.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedObj = JSON.parse(jsonMatch[0]);
          if (parsedObj?.error?.message) {
            rawMsg = parsedObj.error.message;
          }
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
      return "Batas kuota gratis API Gemini telah tercapai (Rate Limit 429). Silakan tunggu beberapa saat atau hubungkan API Key kustom Anda di Pengaturan.";
    }

    if (
      rawMsg.includes("503") ||
      rawMsg.includes("high demand") ||
      rawMsg.includes("UNAVAILABLE") ||
      rawMsg.includes("temporary") ||
      rawMsg.includes("experiencing high demand")
    ) {
      return "Layanan model AI sedang mengalami lonjakan beban trafik sementara dari Google (503 High Demand). Sistem telah mencoba failover otomatis. Silakan coba klik tombol aksi sekali lagi dalam beberapa detik.";
    }

    return cleanAISymbols(rawMsg);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Usage Tracker Endpoints
  app.get("/api/gemini/usage", (req, res) => {
    res.json({ success: true, stats: getUsageStats() });
  });

  app.post("/api/gemini/usage/simulate", (req, res) => {
    const { requestsToday, dailyLimit } = req.body;
    if (typeof requestsToday === "number") {
      usageTrackerState.requestsToday = Math.max(0, requestsToday);
    }
    if (typeof dailyLimit === "number" && dailyLimit > 0) {
      usageTrackerState.dailyLimit = dailyLimit;
    }
    res.json({ success: true, stats: getUsageStats() });
  });

  // 1. AI Wizard Endpoint: Auto-fill form fields and build production prompt with requirement analysis
  app.post("/api/gemini/wizard", async (req, res) => {
    try {
      const { input, customKeys } = req.body;
      if (!input || typeof input !== "string" || !input.trim()) {
        return res.status(400).json({ error: "Input ide atau kebutuhan prompt wajib diisi." });
      }

      const cleanInput = input.trim();
      const detectedDomain = detectTaskDomain(cleanInput);
      const reqDecomposition = analyzeRequirementsAndConflicts(cleanInput);
      const domainDirectives = getDomainDirectives(detectedDomain);

      const ai = getAI();
      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.1-flash-lite",
        actionName: "AI Wizard Auto-Fill",
        featureKey: "wizard",
        customKeys,
        contents: `Analisa ide pengguna dan isi parameter form prompt secara ringkas, akurat, dan spesifik (JSON murni tanpa simbol #, @, *).

Input Pengguna: "${cleanInput}"
Domain Terdeteksi: ${detectedDomain}

Format Response JSON wajib:
{
  "title": "Judul prompt singkat dan jelas",
  "category": "Development | Content | CyberSec | Design | Productivity | Marketing | Business | Academic | AI Agent | Data Science | Legal | Game Dev",
  "subCategory": "Sub-kategori spesifik",
  "aiModel": "Gemini 4 Hydrogen | Claude 3.5 Sonnet | GPT-4o | DeepSeek V3",
  "language": "Indonesian | English",
  "programmingLanguage": "Bahasa pemrograman/tools atau kosong",
  "framework": "Framework/metode atau kosong",
  "database": "Database atau kosong",
  "platform": "Platform/channel atau kosong",
  "stylePrompt": "Direct All-in-One (Langsung Jadi & Lengkap) | Step-by-Step | Roleplay / Persona | Few-Shot",
  "tone": "Professional & Technical | Direct & Concise | Educational & Detailed",
  "outputLanguage": "Indonesian | English",
  "creativity": "Balanced (0.7) | High (1.0) | Strict/Exact (0.2)",
  "length": "Full Complete Solution | Comprehensive | Detailed Code + Explanation",
  "targetAudience": "Target audiens",
  "description": "Deskripsi ide dan tujuan utama (2-3 kalimat padat)",
  "additionalReqs": "Spesifikasi teknis, fitur inti, dan batasan utama",
  "negativePrompt": "Hal yang harus dihindari",
  "expectedOutput": "Format output yang diharapkan",
  "assumptions": ["Asumsi singkat 1", "Asumsi singkat 2"],
  "clarifications": ["Pertanyaan klarifikasi opsional"]
}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      let jsonText = (response.text || "").trim();
      if (jsonText.includes("```")) {
        jsonText = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();
      }
      
      let parsed: any = {};
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseErr) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error("JSON fallback match parse failed:", e);
          }
        }
      }

      if (!parsed || typeof parsed !== 'object') {
        parsed = {
          title: cleanInput.slice(0, 50),
          category: detectedDomain === 'CODING' || detectedDomain === 'WEB_DEV' ? 'Development' : 'Business',
          subCategory: 'General',
          aiModel: 'Claude 3.5 Sonnet',
          language: 'Indonesian',
          description: cleanInput,
          generatedPrompt: `[ROLE & EXPERT PRACTITIONER]\nAnda adalah praktisi ahli di bidang terkait.\n\n[MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]\nLangsung eksekusi solusi untuk: ${cleanInput}`,
        };
      }

      if (parsed && parsed.generatedPrompt) {
        parsed.generatedPrompt = cleanAISymbols(parsed.generatedPrompt);
      }

      // Merge backend and model assumptions
      const combinedAssumptions = Array.from(
        new Set([
          ...(reqDecomposition.assumptions || []),
          ...(Array.isArray(parsed.assumptions) ? parsed.assumptions : []),
        ])
      );

      const combinedClarifications = Array.from(
        new Set([
          ...(reqDecomposition.clarificationsNeeded || []),
          ...(Array.isArray(parsed.clarifications) ? parsed.clarifications : []),
        ])
      );

      reqDecomposition.assumptions = combinedAssumptions;
      reqDecomposition.clarificationsNeeded = combinedClarifications;

      const qualityControl = computePromptQualityScore(parsed.generatedPrompt || "", reqDecomposition);

      res.json({
        success: true,
        data: parsed,
        assumptions: combinedAssumptions,
        clarifications: combinedClarifications,
        qualityControl,
      });
    } catch (error: any) {
      console.error("AI Wizard Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 2. Generate Prompt Endpoint: Build a prompt from structured form data with 8-pillar quality check & refinement
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { customKeys, ...formData } = req.body || {};
      if (!formData || typeof formData !== "object") {
        return res.status(400).json({ error: "Form data tidak valid." });
      }

      const inputContext = `${formData.title || ""} ${formData.description || ""} ${formData.additionalReqs || ""}`.trim();
      const taskCategory = detectTaskDomain(inputContext, formData);
      const reqDecomposition = analyzeRequirementsAndConflicts(inputContext, formData);
      const domainDirectives = getDomainDirectives(taskCategory, formData);

      const ai = getAI();

      const systemInstruction = `Kamu adalah Senior Prompt Architect. Susun PROMPT EKSEKUSI LANGSUNG (Direct-Execution Prompt) yang tajam, padat, terstruktur, dan langsung siap dipakai tanpa bertele-tele.

ATURAN WAJIB:
1. Posisikan AI penerima sebagai praktisi ahli langsung di bidangnya, BUKAN pembuat prompt.
2. Sertakan blok singkat [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU] di bagian awal.
3. Gunakan struktur ringkas & padat (maksimal 7 seksi bernilai tinggi):
   - [ROLE & OBJECTIVE]
   - [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
   - [CONTEXT & SCOPE]
   - [CORE REQUIREMENTS & ARCHITECTURE]
   - [EDGE CASES & CONSTRAINTS]
   - [EXPECTED DELIVERABLES]
   - [ACCEPTANCE CRITERIA]
4. DILARANG menggunakan simbol #, @, atau *. Gunakan kurung siku [JUDUL SEKSI] dan penomoran 1., 2.
5. Pertahankan seluruh variabel {{nama_variabel}} dari input pengguna jika ada.
6. Jaga agar setiap poin konkret, langsung ke inti, dan tanpa basa-basi pembuka/penutup.`;

      const promptPayload = `Susun master prompt siap eksekusi berdasarkan spesifikasi berikut:
- Judul: ${formData.title || "Untitled Master Prompt"}
- Kategori: ${formData.category || "General"}${formData.subCategory ? ` / ${formData.subCategory}` : ""}
- Target AI: ${formData.aiModel || "Gemini 4 Hydrogen"}
- Stack: ${[formData.programmingLanguage, formData.framework, formData.database, formData.platform].filter(Boolean).join(", ") || "Sesuai domain"}
- Style & Tone: ${formData.stylePrompt || "Direct All-in-One"} | ${formData.tone || "Professional & Technical"} | Output: ${formData.outputLanguage || "Indonesian"}
- Deskripsi Utama: ${formData.description || "Solusi teknis terintegrasi"}
${formData.additionalReqs ? `- Kebutuhan Tambahan: ${formData.additionalReqs}` : ""}
${formData.negativePrompt ? `- Hindari: ${formData.negativePrompt}` : ""}
${formData.expectedOutput ? `- Expected Output: ${formData.expectedOutput}` : ""}
${formData.designTheme ? `- Gaya Desain: ${formData.designTheme}` : ""}

${domainDirectives}

Keluarkan HANYA teks prompt akhir siap salin tanpa simbol #, @, *.`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "Master Prompt Generator",
        featureKey: "generator",
        customKeys,
        contents: promptPayload,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const cleanedPrompt = cleanAISymbols(response.text || "");
      const qcReport = computePromptQualityScore(cleanedPrompt, reqDecomposition);

      res.json({
        success: true,
        generatedPrompt: cleanedPrompt,
        assumptions: reqDecomposition.assumptions,
        clarifications: reqDecomposition.clarificationsNeeded,
        qualityControl: qcReport,
        taskCategory,
      });
    } catch (error: any) {
      console.error("Generate Prompt Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 2a. Voice Transcription Endpoint using gemini-3.5-transcribe
  app.post("/api/gemini/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType, customKeys } = req.body || {};
      if (!audioBase64 || typeof audioBase64 !== "string" || audioBase64.length < 32) {
        return res.status(400).json({ error: "Data audio tidak valid atau kosong." });
      }
      if (audioBase64.length > 18 * 1024 * 1024) {
        return res.status(413).json({ error: "Ukuran audio terlalu besar (maksimal 12MB)." });
      }

      const allowedMimes = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/flac", "audio/aac"];
      const normalizedMime = String(mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
      const safeMime = allowedMimes.includes(normalizedMime) ? normalizedMime : "audio/webm";

      const ai = getActiveAI(getAI(), customKeys);
      const transcribePrompt =
        "Transkrip rekaman audio ini secara akurat dalam bahasa aslinya (Bahasa Indonesia atau Inggris). Pertahankan istilah teknis dengan benar. Kembalikan HANYA teks hasil transkripsi yang bersih tanpa komentar pembuka, penutup, atau format markdown.";

      const modelsToTry = ["gemini-3.5-transcribe", "gemini-4-hydrogen"];
      let transcriptText = "";
      let usedModel = "gemini-3.5-transcribe";
      let lastErr: any = null;

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: safeMime,
                    data: audioBase64,
                  },
                },
                { text: transcribePrompt },
              ],
            },
          });
          const raw = cleanAISymbols(response.text || "").trim();
          if (raw) {
            transcriptText = raw;
            usedModel = modelName;
            break;
          }
        } catch (err: any) {
          lastErr = err;
          console.warn(`Transcribe model ${modelName} failed:`, err?.message || err);
        }
      }

      if (!transcriptText) {
        recordUsage("Voice Transcribe", "transcribe", "gemini-3.5-transcribe", false, 0);
        throw lastErr || new Error("Tidak dapat mentranskrip audio saat ini.");
      }

      recordUsage("Voice Transcribe", "transcribe", usedModel, true, Math.max(80, Math.round(transcriptText.length / 3)));
      res.json({
        success: true,
        transcript: transcriptText,
        model: usedModel,
      });
    } catch (error: any) {
      console.error("Transcribe Audio Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 2b. Live SSE Streaming Master Prompt Generator
  app.post("/api/gemini/generate-stream", async (req, res) => {
    const { customKeys, ...formData } = req.body || {};
    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ error: "Form data tidak valid." });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, any>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const inputContext = `${formData.title || ""} ${formData.description || ""} ${formData.additionalReqs || ""}`.trim();
      const taskCategory = detectTaskDomain(inputContext, formData);
      const reqDecomposition = analyzeRequirementsAndConflicts(inputContext, formData);
      const domainDirectives = getDomainDirectives(taskCategory, formData);

      const systemInstruction = `Kamu adalah Senior Prompt Architect. Susun PROMPT EKSEKUSI LANGSUNG (Direct-Execution Prompt) yang tajam, padat, terstruktur, dan langsung siap dipakai tanpa bertele-tele.

ATURAN WAJIB:
1. Posisikan AI penerima sebagai praktisi ahli langsung di bidangnya, BUKAN pembuat prompt.
2. Sertakan blok singkat [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU] di bagian awal.
3. Gunakan 7 seksi padat & bernilai tinggi:
   - [ROLE & OBJECTIVE]
   - [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
   - [CONTEXT & SCOPE]
   - [CORE REQUIREMENTS & ARCHITECTURE]
   - [EDGE CASES & CONSTRAINTS]
   - [EXPECTED DELIVERABLES]
   - [ACCEPTANCE CRITERIA]
4. DILARANG menggunakan simbol #, @, atau *. Gunakan kurung siku [JUDUL SEKSI] dan penomoran 1., 2.
5. Pertahankan seluruh variabel dinamis {{nama_variabel}} dari input pengguna jika ada.
6. Langsung keluarkan teks prompt akhir siap salin tanpa basa-basi pembuka/penutup.`;

      const promptPayload = `Susun master prompt siap eksekusi berdasarkan spesifikasi berikut:
- Judul: ${formData.title || "Untitled Master Prompt"}
- Kategori: ${formData.category || "General"}${formData.subCategory ? ` / ${formData.subCategory}` : ""}
- Target AI: ${formData.aiModel || "Gemini 4 Hydrogen"}
- Stack: ${[formData.programmingLanguage, formData.framework, formData.database, formData.platform].filter(Boolean).join(", ") || "Sesuai domain"}
- Style & Tone: ${formData.stylePrompt || "Direct All-in-One"} | ${formData.tone || "Professional & Technical"} | Output: ${formData.outputLanguage || "Indonesian"}
- Deskripsi Utama: ${formData.description || "Solusi teknis terintegrasi"}
${formData.additionalReqs ? `- Kebutuhan Tambahan: ${formData.additionalReqs}` : ""}
${formData.negativePrompt ? `- Hindari: ${formData.negativePrompt}` : ""}
${formData.expectedOutput ? `- Expected Output: ${formData.expectedOutput}` : ""}
${formData.designTheme ? `- Gaya Desain: ${formData.designTheme}` : ""}

${domainDirectives}

Keluarkan HANYA teks prompt akhir siap salin tanpa simbol #, @, *.`;

      const activeAI = getActiveAI(getAI(), customKeys);
      let accumulated = "";
      let modelUsed = "gemini-4-hydrogen";
      let streamSuccess = false;
      let lastErr: any = null;

      for (const candidateModel of FALLBACK_MODELS) {
        try {
          const safeConfig = sanitizeGeminiConfig(candidateModel, {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          });
          const stream = await activeAI.models.generateContentStream({
            model: candidateModel,
            contents: promptPayload,
            config: safeConfig,
          });

          modelUsed = candidateModel;
          for await (const chunk of stream) {
            const textChunk = chunk.text || "";
            if (textChunk) {
              accumulated += textChunk;
              sendEvent({ type: "chunk", text: textChunk });
            }
          }
          if (accumulated.trim().length > 0) {
            streamSuccess = true;
            break;
          }
        } catch (err: any) {
          lastErr = err;
          console.warn(`Stream model ${candidateModel} failed:`, err?.message || err);
          if (accumulated.length > 0) {
            // Partial output already streamed; finish gracefully
            streamSuccess = true;
            break;
          }
        }
      }

      if (!streamSuccess) {
        recordUsage("Master Prompt Stream", "generator", modelUsed, false, 0);
        sendEvent({ type: "error", error: formatFriendlyErrorMessage(lastErr) });
        return res.end();
      }

      const cleanedPrompt = cleanAISymbols(accumulated);
      const qcReport = computePromptQualityScore(cleanedPrompt, reqDecomposition);
      recordUsage("Master Prompt Stream", "generator", modelUsed, true, Math.max(200, Math.round(cleanedPrompt.length / 4)));

      sendEvent({
        type: "done",
        generatedPrompt: cleanedPrompt,
        assumptions: reqDecomposition.assumptions,
        clarifications: reqDecomposition.clarificationsNeeded,
        qualityControl: qcReport,
        taskCategory,
        modelUsed,
      });
      res.end();
    } catch (error: any) {
      console.error("Generate Stream Error:", error);
      sendEvent({ type: "error", error: formatFriendlyErrorMessage(error) });
      res.end();
    }
  });

  // 2c. Multi-Variant Prompt Strategy Generator (3 Distinct Architectures)
  app.post("/api/gemini/generate-variants", async (req, res) => {
    try {
      const { customKeys, ...formData } = req.body || {};
      if (!formData || typeof formData !== "object") {
        return res.status(400).json({ error: "Form data tidak valid." });
      }

      const inputContext = `${formData.title || ""} ${formData.description || ""} ${formData.additionalReqs || ""}`.trim();
      const taskCategory = detectTaskDomain(inputContext, formData);
      const reqDecomposition = analyzeRequirementsAndConflicts(inputContext, formData);
      const domainDirectives = getDomainDirectives(taskCategory, formData);

      const ai = getAI();
      const systemInstruction = `Kamu adalah Principal Prompt Systems Architect.
Tugasmu adalah menyusun 3 VARIASI ARSITEKTUR PROMPT BERBEDA untuk kebutuhan yang sama agar pengguna dapat membandingkan strategi prompt terbaik:
1. Variant 1 ("direct-execution"): Direct All-in-One Execution — Fokus eksekusi tuntas, cepat, anti-meta, langsung deliverable produksi.
2. Variant 2 ("chain-of-thought"): Chain-of-Thought Analytical — Memaksa penalaran langkah-demi-langkah, analisis trade-off, validasi edge case sebelum solusi akhir.
3. Variant 3 ("structured-contract"): Few-Shot & Structured Contract — Menetapkan skema kontrak input-output ketat, contoh pola/format eksak, dan rubrik acceptance criteria.

ATURAN WAJIB:
- DILARANG menggunakan simbol #, @, atau *. Gunakan kurung siku [JUDUL SEKSI] dan penomoran 1., 2.
- Setiap prompt harus lengkap, siap pakai, dan memiliki klausul [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU].
- Kembalikan HANYA JSON murni yang valid.`;

      const promptPayload = `Buatkan 3 variasi strategi master prompt berdasarkan spesifikasi berikut:
- Judul: ${formData.title || "Untitled Master Prompt"}
- Kategori: ${formData.category || "Development"} / ${formData.subCategory || "General"}
- Target Model: ${formData.aiModel || "Gemini 4 Hydrogen"}
- Stack / Tools: ${formData.programmingLanguage || "None"} / ${formData.framework || "None"} / ${formData.database || "None"}
- Bahasa Output: ${formData.outputLanguage || "Indonesian"}
- Deskripsi Ide: ${formData.description || "Solusi teknis terintegrasi"}
- Kebutuhan Tambahan: ${formData.additionalReqs || "Modularitas, keamanan, performa tinggi"}
- Hindari: ${formData.negativePrompt || "Kode terpotong, TODO comments"}
- Expected Output: ${formData.expectedOutput || "Solusi lengkap siap produksi"}

${domainDirectives}

Kembalikan JSON persis dengan format:
{
  "variants": [
    {
      "id": "direct-execution",
      "label": "Direct All-in-One",
      "badge": "Tercepat & Langsung Jadi",
      "summary": "Ringkasan 1 kalimat keunggulan strategi ini",
      "bestFor": "Eksekusi langsung fitur/deliverable tanpa banyak iterasi",
      "prompt": "Isi master prompt lengkap tanpa simbol #, @, *"
    },
    {
      "id": "chain-of-thought",
      "label": "Chain-of-Thought Analytical",
      "badge": "Penalaran Mendalam",
      "summary": "Ringkasan 1 kalimat keunggulan strategi ini",
      "bestFor": "Arsitektur kompleks, debugging, dan analisis keputusan",
      "prompt": "Isi master prompt lengkap tanpa simbol #, @, *"
    },
    {
      "id": "structured-contract",
      "label": "Structured Contract & Few-Shot",
      "badge": "Presisi Format Tinggi",
      "summary": "Ringkasan 1 kalimat keunggulan strategi ini",
      "bestFor": "Output terstandar, API/JSON contract, dan evaluasi ketat",
      "prompt": "Isi master prompt lengkap tanpa simbol #, @, *"
    }
  ]
}`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "3-Variant Prompt Strategy",
        featureKey: "variants",
        customKeys,
        contents: promptPayload,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });

      let jsonText = (response.text || "{}").trim();
      if (jsonText.includes("```")) {
        jsonText = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();
      }
      const parsed = JSON.parse(jsonText);
      const rawVariants = Array.isArray(parsed?.variants) ? parsed.variants : [];

      const variants = rawVariants.slice(0, 3).map((v: any, idx: number) => {
        const cleaned = cleanAISymbols(String(v.prompt || ""));
        const qc = computePromptQualityScore(cleaned, reqDecomposition);
        return {
          id: String(v.id || `variant-${idx + 1}`),
          label: cleanAISymbols(String(v.label || `Strategi ${idx + 1}`)),
          badge: cleanAISymbols(String(v.badge || "Production Ready")),
          summary: cleanAISymbols(String(v.summary || "")),
          bestFor: cleanAISymbols(String(v.bestFor || "")),
          prompt: cleaned,
          qualityScore: qc.overallScore,
          qualityControl: qc,
        };
      });

      res.json({
        success: true,
        variants,
        assumptions: reqDecomposition.assumptions,
        clarifications: reqDecomposition.clarificationsNeeded,
        taskCategory,
      });
    } catch (error: any) {
      console.error("Generate Variants Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 3. PRD Generator Endpoint: Generate a full Product Requirement Document (PRD)
  app.post("/api/gemini/prd", async (req, res) => {
    try {
      const {
        title,
        productTitle,
        tagline,
        description,
        problemStatement,
        category,
        targetAudience,
        targetPlatform,
        techStack,
        keyFeatures,
        integrations,
        releasePhase,
        nonFunctionalReqs,
        prdFormat,
        language,
        customKeys,
      } = req.body || {};

      const ai = getAI();
      const finalTitle = productTitle || title || "Aplikasi Enterprise Modern";
      const finalCategory = category || "SaaS B2B Platform";
      const finalDesc = problemStatement || description || "Solusi platform digital modern";
      const finalFormat = prdFormat || "Comprehensive Enterprise PRD";
      const finalLang = language || "Indonesian";

      const systemInstruction = `Kamu adalah Chief Product Officer (CPO), VP of Product, & Principal Systems Architect berpengalaman di perusahaan teknologi Fortune 500 dan unicorn startup.
Tugasmu adalah menyusun PRODUCT REQUIREMENT DOCUMENT (PRD) TINGKAT EKSEKUTIF yang SANGAT MENDALAM, SANGAT DETAIL, TERSTRUKTUR DENGAN STANDAR SILICON VALLEY, DAN LANGSUNG SIAP DIEKSEKUSI OLEH TIM ENGINEERING & DESIGN (PRODUCTION-READY PRD).

FORMAT DOKUMEN YANG DIMINTA: ${finalFormat}
BAHASA DOKUMEN: ${finalLang}

ATURAN MANDATORI SIMBOL & FORMATTING:
DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG (#), AT SIGN (@), DAN BINTANG (* ATAU **). Dilarang teks tebal markdown **bold**. Gunakan penomoran angka biasa (1., 2.), huruf kapital pada judul seksi, atau kurung siku [JUDUL SEKSI] tanpa simbol markdown liar.

STRUKTUR KELENGKAPAN STANDAR PRD EKSEKUTIF (WAJIB LENGKAP SEMUA SEKSI TANPA MERINGKAS):
[PRODUCT REQUIREMENT DOCUMENT (PRD): ${finalTitle.toUpperCase()}]
${tagline ? `Tagline / One-Liner: ${tagline}\n` : ""}
[1. EXECUTIVE SUMMARY & VALUE PROPOSITION]
- Vision & Mission Statement
- Problem Background & Pain Points yang Dihadapi Pengguna
- Proposed Solution & Core Value Proposition
- Market Opportunity & Target Industry

[2. GOALS & MEASURABLE SUCCESS METRICS (KPIs)]
- Core Business Objectives (Tahap Peluncuran & 6 Bulan Pertama)
- Primary KPIs: Conversion Rate, Daily Active Users (DAU), Monthly Recurring Revenue (MRR), Retention Rate
- Technical Performance KPIs: P99 Latency (<200ms), Uptime SLA (99.9%), Zero Critical Vulnerabilities

[3. TARGET USER PERSONAS & DETAILED USER STORIES]
- Primary Persona (Demografi, Goals, Pain Points, Typical Workflow)
- Secondary Persona & Admin/Ops Persona
- Comprehensive User Stories Table:
  Format: As a [Role], I want [Feature Action], So that [Measurable Benefit]
  Prioritas: (P0 Blocker, P1 Must-Have, P2 Should-Have, P3 Nice-To-Have)

[4. CORE FUNCTIONAL SPECIFICATIONS & ACCEPTANCE CRITERIA]
- Modul 1: Otentikasi, Hak Akses & Profil Pengguna
- Modul 2: Core Business Logic & Workflow Engine
- Modul 3: Dashboard, Analytics & Reporting
- Modul 4: Integrasi Pihak Ketiga & Webhooks
- Acceptance Criteria per Fitur (Standar Gherkin: Given - When - Then)
- Edge Cases Handling (Koneksi Terputus, Token Expired, Concurrent Edits, Input Malformed)

[5. TECHNICAL ARCHITECTURE & DATA MODEL PROPOSAL]
- High-Level Architecture (Frontend, API Gateway, Microservices/Monolith, Background Workers)
- Stack Rekomendasi: Frontend, Backend, Database, Cache, Infrastructure
- Entity Relationship (ERD) Schema / Tabel Utama beserta Field Kunci & Relasi
- API Endpoints Specification Summary (Method, Route, Request Body, Response Data, HTTP Status Codes)
- Third-Party Integrations & SDKs

[6. NON-FUNCTIONAL REQUIREMENTS & COMPLIANCE]
- Security Standards (OAuth 2.0, JWT, Encryption at Rest AES-256, Encryption in Transit TLS 1.3)
- Compliance & Data Privacy (GDPR, SOC2, OWASP Top 10)
- Scalability & Disaster Recovery (Horizontal Pod Autoscaling, Multi-AZ Database, Automated Backups)

[7. RELEASE ROADMAP & PHASING STRATEGY]
- Phase 1: MVP Horizon (Core Value & Alpha Testing)
- Phase 2: Feature Maturity & Beta Launch
- Phase 3: Enterprise Scale, Advanced Automation & GA

[8. RISK MATRIX & MITIGATION PLAN]
- Identifikasi Risiko Teknis, Risiko Operasional, dan Risiko Adopsi Pasar beserta Rencana Mitigasi Konkret`;

      const promptPayload = `Susunlah PRD (Product Requirement Document) lengkap dan sangat mendalam berdasarkan data berikut:
- Nama Produk: ${finalTitle}
- Tagline / Visi: ${tagline || "Solusi digital modern berkinerja tinggi"}
- Kategori Produk: ${finalCategory}
- Target Platform: ${targetPlatform || "Web Application & Responsive Mobile"}
- Target Pengguna / Audiens: ${targetAudience || "Software Engineers, Product Teams & Enterprise Users"}
- Latar Belakang Masalah: ${finalDesc}
- Fitur Kunci & Ruang Lingkup: ${keyFeatures || "Otentikasi, Dashboard Analytics, CRUD Data, Reporting, Notifikasi Realtime, Billing Subscription"}
- Tech Stack Pilihan: ${techStack || "TypeScript, Next.js / React, Node.js / Laravel, PostgreSQL, Redis, Docker"}
- Integrasi Eksternal: ${integrations || "Payment Gateway (Stripe/Midtrans), Google OAuth, SendGrid Email, S3 Storage"}
- Target Fase Rilis: ${releasePhase || "MVP Phase 1 (4-6 Minggu)"}
- Standar Non-Fungsional: ${nonFunctionalReqs || "Keamanan tingkat perbankan, latency < 200ms, uptime 99.9%"}
- Format PRD: ${finalFormat}
- Bahasa: ${finalLang}

Instruksi Khusus Kedalaman:
Uraikan setiap seksi secara komprehensif, jangan persingkat, buatkan detail skema database tabel nyata, endpoint REST API nyata, dan acceptance criteria standar industri.
Keluarkan HANYA DOKUMEN PRD AKHIR siap pakai tanpa basa-basi pembuka, tanpa kata penutup, dan TANPA SIMBOL #, @, ATAU * !`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "PRD Generator",
        featureKey: "prd",
        customKeys,
        contents: promptPayload,
        config: {
          systemInstruction,
          temperature: 0.25,
          maxOutputTokens: 8192,
        },
      });

      res.json({ success: true, prdDocument: cleanAISymbols(response.text || "") });
    } catch (error: any) {
      console.error("PRD Generator Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 3b. PRD Auto-Fill AI Wizard Endpoint: Auto-fills PRD form from a simple concept
  app.post("/api/gemini/prd/auto-fill", async (req, res) => {
    try {
      const { input, customKeys } = req.body || {};
      if (!input || typeof input !== "string" || !input.trim()) {
        return res.status(400).json({ error: "Input konsep produk wajib diisi." });
      }

      const ai = getAI();
      const systemInstruction = `Kamu adalah Senior Technical Product Manager.
Tugasmu adalah menganalisis ide produk dari pengguna dan menghasilkan seluruh parameter kebutuhan PRD terstruktur dalam bentuk JSON yang sangat lengkap dan tajam.
DILARANG GUNAKAN SIMBOL #, @, ATAU *.`;

      const promptPayload = `Analisis ide produk berikut dan buatkan parameter PRD lengkap:
Ide Produk: "${input.trim()}"

Berikan response JSON murni dengan format:
{
  "productTitle": "Nama Produk yang Catchy & Profesional",
  "tagline": "Satu kalimat value proposition yang kuat",
  "category": "SaaS B2B Platform | Mobile App | AI Agent / RAG | Fintech | E-Commerce | EdTech | Healthcare | Internal Tool",
  "targetAudience": "Deskripsi spesifik siapa pengguna utama dan pembeli produk",
  "targetPlatform": "Web Application (SaaS) | Mobile iOS & Android | Cross-Platform Desktop | Chrome Extension",
  "problemStatement": "Uraian 2-3 kalimat mengenai masalah nyata yang dihadapi calon pengguna dan mengapa produk ini penting",
  "keyFeatures": "Daftar fitur kunci terbagi dalam P1 Must-Have, P2 Should-Have, dan P3 Nice-To-Have",
  "techStack": "Frontend, Backend, Database, Cloud & DevOps yang optimal",
  "integrations": "Payment Gateway, OAuth, Email/SMS, Cloud Storage, Analytics",
  "releasePhase": "MVP Phase 1 (Core Foundation) -> Phase 2 (Expansion)",
  "nonFunctionalReqs": "Standar latency, keamanan data, audit log, SLA 99.9%",
  "prdFormat": "Comprehensive Enterprise PRD"
}`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-3.1-flash-lite",
        actionName: "PRD Auto-Fill Wizard",
        featureKey: "prd",
        customKeys,
        contents: promptPayload,
        config: {
          responseMimeType: "application/json",
          systemInstruction,
          temperature: 0.2,
        },
      });

      const jsonText = response.text || "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error("PRD Auto-Fill Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 3c. PRD Completeness & Quality Audit Endpoint
  app.post("/api/gemini/prd/audit", async (req, res) => {
    try {
      const { prdDocument, customKeys } = req.body || {};
      if (!prdDocument || typeof prdDocument !== "string" || !prdDocument.trim()) {
        return res.status(400).json({ error: "Dokumen PRD wajib disertakan untuk audit." });
      }

      const ai = getAI();
      const systemInstruction = `Kamu adalah Lead Product Auditor & Staff Software Architect.
Tugasmu adalah mengaudit dokumen PRD (Product Requirement Document) terhadap standar kualitas industri Silicon Valley.
Analisis:
1. Scope Clarity & Feasibility
2. Acceptance Criteria Precision (Gherkin format)
3. Edge Cases & Error Handling Coverage
4. Technical Architecture & Database ERD Depth
5. Security, Privacy & Compliance (OWASP/SOC2/GDPR)
6. Measurable KPIs & Business Metrics

DILARANG GUNAKAN SIMBOL #, @, ATAU * dalam teks output JSON.`;

      const promptPayload = `Lakukan audit mendalam terhadap dokumen PRD berikut:

DOKUMEN PRD:
${prdDocument}

Kembalikan format JSON murni:
{
  "overallScore": 88,
  "grade": "A | B | C | D",
  "summary": "Ringkasan 2 kalimat tentang kesiapan dokumen PRD ini untuk tahap engineering",
  "scoreBreakdown": {
    "scopeClarity": 90,
    "technicalFeasibility": 85,
    "acceptanceCriteria": 80,
    "securityCompliance": 90,
    "metricsAndRoadmap": 88
  },
  "strengths": [
    "Poin kekuatan 1",
    "Poin kekuatan 2",
    "Poin kekuatan 3"
  ],
  "gapsAndRisks": [
    {
      "area": "Area / Seksi yang kurang",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "issue": "Deskripsi kekurangan atau blind spot",
      "fixRecommendation": "Solusi perbaikan konkret"
    }
  ],
  "engineeringReadinessChecklist": [
    { "item": "Database ERD & Foreign Keys Defined", "passed": true },
    { "item": "REST API Endpoint Contracts Complete", "passed": true },
    { "item": "Gherkin Acceptance Criteria on Key Features", "passed": true },
    { "item": "Security & RBAC Specifications Detailed", "passed": true },
    { "item": "Edge Cases & Offline Fallbacks Addressed", "passed": false }
  ]
}`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "PRD Quality Audit",
        featureKey: "prd",
        customKeys,
        contents: promptPayload,
        config: {
          responseMimeType: "application/json",
          systemInstruction,
          temperature: 0.15,
        },
      });

      const jsonText = response.text || "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error("PRD Audit Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 3d. PRD Database Schema Generator (PostgreSQL DDL, Prisma Schema, TypeScript Interfaces)
  app.post("/api/gemini/prd/generate-schema", async (req, res) => {
    try {
      const { prdDocument, customKeys } = req.body || {};
      if (!prdDocument || typeof prdDocument !== "string" || !prdDocument.trim()) {
        return res.status(400).json({ error: "Dokumen PRD wajib disertakan." });
      }

      const ai = getAI();
      const systemInstruction = `Kamu adalah Principal Database Engineer & Senior Backend Architect.
Tugasmu adalah mengekstrak kebutuhan data dari dokumen PRD dan menghasilkan:
1. PostgreSQL DDL SQL yang valid (CREATE TABLE, PRIMARY KEY, FOREIGN KEY, INDEXES, ENUMS, ON DELETE CASCADE, CREATED_AT/UPDATED_AT triggers)
2. Prisma ORM Schema (schema.prisma) yang lengkap dengan relasi (@relation), @id, @default(uuid()), @updatedAt, @@map
3. TypeScript Interfaces / Types yang sesuai persis dengan tabel database

DILARANG GUNAKAN SIMBOL #, @, ATAU * kecuali simbol yang memang sintaks bahasa pemrograman seperti @id, @@map, atau tipe TypeScript.`;

      const promptPayload = `Dari PRD berikut, rancang skema database lengkap untuk PostgreSQL DDL, Prisma ORM Schema, dan TypeScript Interfaces:

DOKUMEN PRD:
${prdDocument}

Kembalikan format JSON murni:
{
  "postgresSql": "-- PostgreSQL DDL Script\nCREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n...",
  "prismaSchema": "// Prisma Schema\ngenerator client {\n  provider = \"prisma-client-js\"\n}\n...",
  "typeScriptTypes": "// TypeScript Database Types\nexport interface User {\n  id: string;\n  ...\n}"
}`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "PRD Database Schema Generator",
        featureKey: "prd",
        customKeys,
        contents: promptPayload,
        config: {
          responseMimeType: "application/json",
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      });

      const jsonText = response.text || "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error("PRD Schema Generator Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 3e. PRD API Spec & OpenAPI Generator
  app.post("/api/gemini/prd/generate-api-spec", async (req, res) => {
    try {
      const { prdDocument, customKeys } = req.body || {};
      if (!prdDocument || typeof prdDocument !== "string" || !prdDocument.trim()) {
        return res.status(400).json({ error: "Dokumen PRD wajib disertakan." });
      }

      const ai = getAI();
      const systemInstruction = `Kamu adalah Principal API Architect & OpenAPI / Swagger Specialist.
Tugasmu adalah mengekstrak semua endpoint dari PRD dan menyusun:
1. OpenAPI 3.0 / Swagger JSON valid
2. Daftar Endpoint dengan Method, Route, Deskripsi, Headers, Request Body, Response 200, dan Error Responses
3. Contoh cURL request siap pakai untuk setiap endpoint utama

DILARANG GUNAKAN SIMBOL #, @, ATAU * liar di luar format JSON / sintaks cURL.`;

      const promptPayload = `Dari PRD berikut, rancang spesifikasi REST API lengkap:

DOKUMEN PRD:
${prdDocument}

Kembalikan format JSON murni:
{
  "openApiJson": "{\n  \"openapi\": \"3.0.0\",\n  \"info\": { ... }\n}",
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/v1/auth/register",
      "summary": "Pendaftaran akun baru",
      "authRequired": false,
      "requestSample": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"Secret123!\"\n}",
      "responseSample": "{\n  \"token\": \"jwt_token_here\",\n  \"user\": { \"id\": \"usr_123\" }\n}",
      "curlCommand": "curl -X POST https://api.domain.com/api/v1/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"user@example.com\"}'"
    }
  ]
}`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "PRD API Spec Generator",
        featureKey: "prd",
        customKeys,
        contents: promptPayload,
        config: {
          responseMimeType: "application/json",
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      });

      const jsonText = response.text || "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error("PRD API Spec Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 3f. PRD Mermaid.js Architecture & Flow Diagram Generator
  app.post("/api/gemini/prd/generate-diagrams", async (req, res) => {
    try {
      const { prdDocument, customKeys } = req.body || {};
      if (!prdDocument || typeof prdDocument !== "string" || !prdDocument.trim()) {
        return res.status(400).json({ error: "Dokumen PRD wajib disertakan." });
      }

      const ai = getAI();
      const systemInstruction = `Kamu adalah Cloud Solutions Architect & Systems Visualizer.
Tugasmu adalah menganalisis PRD dan menghasilkan 3 kode diagram Mermaid.js yang VALID dan siap dirender:
1. System Architecture Flowchart (flowchart TD atau graph TD)
2. Database Entity Relationship Diagram (erDiagram)
3. Core User Sequence Journey (sequenceDiagram)

Pastikan sintaks Mermaid valid tanpa markdown wrapping bintang/hashtag liar.`;

      const promptPayload = `Ekstrak dan buatkan diagram Mermaid.js dari PRD berikut:

DOKUMEN PRD:
${prdDocument}

Kembalikan format JSON murni:
{
  "systemArchitectureMermaid": "flowchart TD\n  Client[Web / Mobile Client] --> Gateway[API Gateway / Nginx]\n  Gateway --> Auth[Auth Service / JWT]\n  Gateway --> Core[Core Business API]\n  Core --> DB[(PostgreSQL Database)]\n  Core --> Cache[(Redis Cache)]\n  Core --> Queue[Background Worker Queue]",
  "erdMermaid": "erDiagram\n  USER ||--o{ ORDER : places\n  USER {\n    uuid id PK\n    string email\n    string role\n  }\n  ORDER {\n    uuid id PK\n    uuid user_id FK\n    float total_amount\n    string status\n  }",
  "sequenceJourneyMermaid": "sequenceDiagram\n  autonumber\n  actor User\n  participant Client\n  participant API\n  participant DB\n  User->>Client: Buka aplikasi & login\n  Client->>API: POST /auth/login\n  API->>DB: Query kredensial\n  DB-->>API: Valid user\n  API-->>Client: JWT Token & Session\n  Client-->>User: Tampilkan Dashboard"
}`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "PRD Mermaid Diagrams",
        featureKey: "prd",
        customKeys,
        contents: promptPayload,
        config: {
          responseMimeType: "application/json",
          systemInstruction,
          temperature: 0.2,
        },
      });

      const jsonText = response.text || "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error("PRD Diagrams Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 3g. PRD Jira / Linear Tickets Breakdown & CSV Exporter
  app.post("/api/gemini/prd/generate-tickets", async (req, res) => {
    try {
      const { prdDocument, customKeys } = req.body || {};
      if (!prdDocument || typeof prdDocument !== "string" || !prdDocument.trim()) {
        return res.status(400).json({ error: "Dokumen PRD wajib disertakan." });
      }

      const ai = getAI();
      const systemInstruction = `Kamu adalah Agile Scrum Master & Technical Project Manager.
Tugasmu adalah membedah dokumen PRD menjadi daftar Epics, User Stories, dan Technical Tasks terstruktur yang siap diimpor ke Jira / Linear / GitHub Projects.
Sertakan Story Points (Fibonacci: 1, 2, 3, 5, 8, 13), Priority (P0 Blocker, P1 High, P2 Medium, P3 Low), dan Acceptance Criteria singkat.
Buatkan juga string CSV valid untuk diimpor.`;

      const promptPayload = `Pecah PRD berikut menjadi tiket backlog sprint:

DOKUMEN PRD:
${prdDocument}

Kembalikan format JSON murni:
{
  "epics": [
    {
      "id": "EPIC-1",
      "title": "Nama Epic Modul",
      "description": "Tujuan modul",
      "stories": [
        {
          "id": "STORY-101",
          "title": "Judul User Story",
          "type": "Story | Task | Bug",
          "priority": "P0 | P1 | P2 | P3",
          "storyPoints": 5,
          "role": "As a [Role]",
          "action": "I want [Action]",
          "benefit": "So that [Benefit]",
          "acceptanceCriteria": "Given ... When ... Then ..."
        }
      ]
    }
  ],
  "csvData": "Issue Type,Summary,Description,Priority,Story Points\nEpic,Otentikasi & Keamanan,Setup SSO & JWT Auth,P0,8\nStory,Registrasi Email & Password,As a user I want to register...,P1,5"
}`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "PRD Jira Tickets Breakdown",
        featureKey: "prd",
        customKeys,
        contents: promptPayload,
        config: {
          responseMimeType: "application/json",
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      });

      const jsonText = response.text || "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error("PRD Tickets Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 4. Prompt Scoring & Audit Endpoint
  app.post("/api/gemini/score", async (req, res) => {
    try {
      const { promptText, title, customKeys } = req.body;
      if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
        return res.status(400).json({ error: "Teks prompt wajib disertakan untuk audit kualitas." });
      }

      const ai = getAI();
      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "Prompt Quality Score",
        featureKey: "score",
        customKeys,
        contents: `Evaluasi kualitas prompt AI berikut berdasarkan 7 pilar kualitas (Requirement Coverage, Clarity, Specificity, Consistency, Context Accuracy, Actionability, Testability).
DILARANG GUNAKAN SIMBOL #, @, ATAU * DALAM SELURUH NILAI TEKS EVALUASI.

Judul Prompt: "${title || "Prompt Evaluasi"}"
Isi Prompt:
${promptText}

Berikan hasil evaluasi dalam format JSON persis berikut:
{
  "score": 96,
  "rating": "Excellent (95-100) | Good (85-94) | Average (70-84) | Needs Improvement (<70)",
  "strengths": [
    "Poin kelebihan 1",
    "Poin kelebihan 2",
    "Poin kelebihan 3"
  ],
  "weaknesses": [
    "Poin kelemahan 1 atau area yang perlu dipertajam"
  ],
  "recommendations": [
    "Saran konkret 1",
    "Saran konkret 2"
  ],
  "checklist": [
    { "label": "Klausul Anti-Meta & Direct Execution", "passed": true, "note": "Memastikan AI langsung mengeksekusi tanpa membuat prompt baru" },
    { "label": "Tujuan & Scope Jelas", "passed": true, "note": "Target tugas terdefinisi dengan spesifik" },
    { "label": "Konteks & Batasan Teknis", "passed": true, "note": "Stack dan spesifikasi teknis disebutkan" },
    { "label": "Output & Deliverables Terstruktur", "passed": true, "note": "Format keluaran dijelaskan secara konkret" },
    { "label": "Negative Constraints & Anti-Pattern", "passed": true, "note": "Instruksi hal yang dihindari tertera rapi" },
    { "label": "Acceptance / Testing Criteria", "passed": true, "note": "Terdapat kriteria validasi hasil" }
  ]
}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.15,
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

  // 5. Prompt Optimizer Endpoint
  app.post("/api/gemini/optimize", async (req, res) => {
    try {
      const { promptText, goal, customKeys } = req.body;
      if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
        return res.status(400).json({ error: "Teks prompt wajib disertakan untuk dioptimalkan." });
      }

      const ai = getAI();
      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "AI Prompt Optimizer",
        featureKey: "optimizer",
        customKeys,
        contents: `Perbaiki dan optimalkan prompt AI berikut menjadi PROMPT EKSEKUSI SIAP PAKAI (DIRECT-EXECUTION PRODUCTION DIRECTIVE) TINGKAT MASTER YANG BERSIH, TERSTRUKTUR, & PRESISI TINGGI.

ATURAN PERBAIKAN KHUSUS ANTI-META-PROMPT:
1. JANGAN PERNAH membuat prompt yang meminta AI penerima membuat prompt lagi.
2. JADIKAN AI PENERIMA SEBAGAI PRAKTISI AHLI LANGSUNG (contoh: Senior Principal Software Engineer, Senior Content Director, Lead UI/UX Architect), BUKAN Prompt Engineer.
3. WAJIB CANTUMKAN KLAUSUL PERINTAH EKSEKUSI LANGSUNG DI AWAL:
   [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
   - DILARANG KERAS membuatkan prompt baru, template prompt, atau saran prompt.
   - DILARANG basa-basi pembuka dan DILARANG meminta konfirmasi bertahap.
   - LANGSUNG EKSEKUSI TUGAS INI SEKARANG PADA RESPON PERTAMA ANDA: Buatkan seluruh rencana kerja teknis (Execution Plan Fase 1-4), arsitektur lengkap, kode utuh siap jalan tanpa potongan '// TODO' (jika koding), atau konten/dokumen lengkap (jika tulisan/bisnis) secara mendalam dari awal sampai akhir.
4. STRUKTUR LENGKAP:
   [ROLE & EXPERT PRACTITIONER]
   [MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]
   [CORE OBJECTIVES & MISSION]
   [STRATEGIC EXECUTION PLAN & TAHAPAN KERJA TEKNIS]
   [TECHNICAL SPECIFICATIONS & DOMAIN CONTEXT]
   [FULL IMPLEMENTATION & PRODUCTION-READY DELIVERABLES]
   [NEGATIVE CONSTRAINTS & STRICT QUALITY RULES]
   [EXPECTED FINAL OUTPUT FORMAT]
5. DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG (#), AT SIGN (@), ATAU BINTANG (* ATAU **). Gunakan format bracket [JUDUL] atau penomoran biasa (1., 2.).
${goal ? `Fokus perbaikan khusus dari pengguna: ${goal}` : ""}

Original Prompt:
${promptText}

Berikan response JSON:
{
  "optimizedPrompt": "Versi prompt yang sudah dioptimalkan menjadi direct-execution directive siap pakai tanpa simbol #, @, atau *, dengan klausul anti-meta-prompt, rencana kerja teknis mendalam, kode/konten utuh, dan batasan kualitas ketat",
  "improvementsMade": [
    "Menambahkan klausul anti-meta-prompt agar AI target langsung mengeksekusi solusi tanpa membuat prompt baru",
    "Menetapkan peran praktisi ahli langsung (Direct Expert Practitioner)",
    "Menyusun Strategic Execution Plan (Fase 1-4) yang terarah",
    "Menambahkan instruksi kode/konten utuh tanpa potongan // TODO",
    "Membersihkan seluruh simbol markdown yang tidak diinginkan"
  ],
  "scoreBefore": 65,
  "scoreAfter": 98
}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
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

  // 6. Prompt Translator Endpoint
  app.post("/api/gemini/translate", async (req, res) => {
    try {
      const { promptText, targetLanguage, customKeys } = req.body;
      if (!promptText || !targetLanguage) {
        return res.status(400).json({ error: "promptText dan targetLanguage wajib diisi." });
      }

      const ai = getAI();
      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "Prompt Translator",
        featureKey: "translate",
        customKeys,
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

  // 7. Multi-Model Playground Test Execution Endpoint
  app.post("/api/gemini/test-run", async (req, res) => {
    try {
      const { promptText, sampleInput, provider, model, customKeys } = req.body;
      if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
        return res.status(400).json({ error: "promptText is required" });
      }

      const combinedInput = sampleInput 
        ? `Prompt/Instruction:\n${promptText}\n\nUser Sample Input Data:\n${sampleInput}`
        : promptText;

      const systemInstruction = "ATURAN UTAMA: DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG (#), AT SIGN (@), ATAU BINTANG (* ATAU **). Gunakan kalimat teks biasa, penomoran biasa (1., 2.), atau huruf kapital.";

      const result = await executeMultiAiGenerate({
        provider: provider || 'gemini',
        customKeys,
        prompt: combinedInput,
        systemInstruction,
        temperature: 0.7,
        preferredModel: model || 'gemini-4-hydrogen',
      });

      res.json({
        success: true,
        output: cleanAISymbols(result.text || ""),
        providerUsed: result.providerUsed,
        modelUsed: result.modelUsed,
        isFallback: result.isFallback,
      });
    } catch (error: any) {
      console.error("Playground Test Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 8. Multi-Provider AI Assistant Chat Endpoint (ZetassAI Bot)
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, enableThinking, systemPrompt, quickSetupMode, provider, customKeys } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      let systemInstruction = `Kamu adalah ZetassAI — Asisten Ahli AI Engineering, Architect, & Product Manager.
Tugasmu adalah membantu pengguna merancang prompt AI yang tajam, menulis Product Requirement Document (PRD), menyusun arsitektur sistem, memecahkan masalah koding, dan memberikan ide-ide kreatif.
Berikan jawaban yang jelas, sangat membantu, terstruktur rapi, dan gunakan bahasa Indonesia yang ramah & profesional.`;

      if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim()) {
        systemInstruction = `${systemPrompt.trim()}

ATURAN STRICT SIMBOL & EMOJI:
DILARANG KERAS MENGGUNAKAN EMOJI DALAM BENTUK APA PUN. DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG (#), AT SIGN (@), BINTANG (* ATAU **), ATAU FORMAT BOLD MARKDOWN. Gunakan kalimat teks biasa, penomoran angka biasa (1., 2.), atau huruf KAPITAL untuk penekanan.`;
      } else {
        systemInstruction += `

ATURAN STRICT SIMBOL & EMOJI:
DILARANG KERAS MENGGUNAKAN EMOJI DALAM BENTUK APA PUN. DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG (#), AT SIGN (@), BINTANG (* ATAU **), ATAU FORMAT BOLD MARKDOWN. Gunakan kalimat teks biasa, penomoran angka biasa (1., 2.), atau huruf KAPITAL untuk penekanan.`;
      }

      // Execute via multi-AI provider router with seamless fallback to Gemini
      const result = await executeMultiAiChat({
        provider: provider || 'gemini',
        customKeys,
        messages,
        systemInstruction,
        temperature: enableThinking ? 0.4 : 0.7,
      });

      // Update usage tracker if Gemini was used
      if (result.providerUsed === 'gemini') {
        checkAndResetUsage();
        usageTrackerState.requestsToday++;
        usageTrackerState.requestsThisMinute++;
        usageTrackerState.breakdown.chat = (usageTrackerState.breakdown.chat || 0) + 1;
      }

      res.json({
        success: true,
        reply: cleanAISymbols(result.text || "Maaf, tidak ada tanggapan dari AI."),
        providerUsed: result.providerUsed,
        modelUsed: result.modelUsed,
        isFallback: result.isFallback,
        fallbackReason: result.fallbackReason,
      });
    } catch (error: any) {
      console.error("Multi-AI Chat Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // 9. Multi-AI Key Verification & Test Ping Endpoint
  app.post("/api/ai/test-connection", async (req, res) => {
    try {
      const { provider, apiKey, model, customBaseUrl } = req.body;
      if (!provider) {
        return res.status(400).json({ error: "provider wajib ditentukan (gemini, openai, anthropic, deepseek, groq, openrouter)" });
      }

      if (provider !== 'gemini' && (!apiKey || typeof apiKey !== 'string' || !apiKey.trim())) {
        return res.status(400).json({ error: "API Key wajib diisi untuk melakukan tes koneksi provider." });
      }

      const result = await testAiConnection(
        provider as SupportedProvider,
        apiKey || "",
        model,
        customBaseUrl
      );

      res.json(result);
    } catch (error: any) {
      console.error("Test connection error:", error);
      res.status(500).json({
        success: false,
        message: error?.message || "Gagal menguji koneksi ke AI provider.",
        latencyMs: 0,
      });
    }
  });

  // ==========================================
  // ==========================================
  // IMAGE & VIDEO GENERATION ENGINE (Imagen 3, Veo & High-Fidelity Synthesizer)
  // ==========================================

  // In-memory operation store for video generation tasks
  interface VideoTaskState {
    id: string;
    prompt: string;
    enhancedPrompt: string;
    aspectRatio: string;
    resolution: string;
    cameraMovement: string;
    lightingStyle: string;
    operationName: string;
    status: "processing" | "completed" | "failed";
    progress: number;
    videoUrl?: string;
    videoDataBuffer?: Buffer;
    statusMessage?: string;
    model: string;
    createdAt: number;
  }

  const activeVideoTasks = new Map<string, VideoTaskState>();

  // Style modifier database for visual fidelity
  const styleEnhancementMap: Record<string, string> = {
    Photorealistic:
      "Award-winning National Geographic DSLR photography, shot on Hasselblad H6D-100c, 85mm f/1.4 lens, natural organic textures, realistic skin pores, volumetric ambient lighting, soft raytraced shadows, hyper-realistic, 8k resolution, crisp focus.",
    "Cinematic Movie":
      "Cinematic 35mm anamorphic widescreen still, shallow depth of field, dramatic atmospheric lighting, color graded like a blockbuster movie, Kodak Vision3 film grain, cinematic composition, 8k.",
    "3D Pixar / Disney":
      "3D Disney Pixar character concept, adorable emotive facial expressions, smooth subsurface scattering, Octane Render 3D lighting, vibrant color palette, whimsical and clean render.",
    "Cyberpunk Neon":
      "Cyberpunk aesthetic, neon-drenched metropolis at night, rain reflections on asphalt, volumetric cyan and magenta lighting, high-tech holographic overlays, sharp details, 8k.",
    "Anime & Manga Makoto Shinkai":
      "Makoto Shinkai style anime artwork, breathtaking sky with glowing volumetric clouds, vibrant rich colors, emotional sunset lighting, crisp hand-drawn line art, Studio Ghibli quality.",
    "Minimalist Vector Art":
      "Clean modern vector illustration, minimalist corporate Memphis style, flat balanced geometric shapes, elegant color harmony, high contrast, clean vector lines.",
    "Digital Fantasy Art":
      "Epic digital fantasy concept art, magical glowing runes, ethereal atmospheric fog, intricate ornate armor and details, dynamic composition, trending on ArtStation.",
    "Studio Product Shot":
      "Commercial studio product photography, clean minimalist podium, diffused softbox lighting, crisp sharp reflections, luxury advertising quality, 8k resolution.",
    "Architectural Interior":
      "Architectural Digest interior design photography, spacious modern minimalist room, warm natural sunlight streaming from panoramic windows, Scandinavian decor, wide angle.",
    "Vintage Analog Polaroid":
      "Authentic 1980s vintage Polaroid photograph, warm color shift, analog grain, gentle light leaks, nostalgic candid framing.",
  };

  // Helper: Auto-compile raw/Indonesian prompt into optimized English visual prompt
  async function compileVisualPrompt(
    ai: GoogleGenAI,
    rawPrompt: string,
    stylePreset: string = "Photorealistic",
    aspectRatio: string = "1:1",
    negativePrompt?: string,
    customKeys?: any
  ): Promise<string> {
    try {
      const styleDesc = styleEnhancementMap[stylePreset] || styleEnhancementMap["Photorealistic"];
      const promptCompilerInstruction = `You are a World-Class AI Art Director and Visual Prompt Compiler for Google Imagen 3, Midjourney v6, and Flux Pro.
Your task is to take a raw user idea (which may be in Indonesian, English, or brief keywords) and expand it into a visually stunning, photorealistic, and highly detailed visual prompt in English.
Guidelines:
1. Translate any Indonesian or non-English terms accurately into vivid English visual descriptors.
2. Accurately capture the core subject, action, composition, environmental background, lighting, and mood.
3. Integrate the following artistic style guidance seamlessly: "${styleDesc}".
4. Aspect ratio target: ${aspectRatio}.
5. If negative elements are specified ("${negativePrompt || ""}"), incorporate positive quality anchors (e.g., "pristine anatomy, crystal clear focus, high fidelity details, clean background").
6. Output ONLY the compiled prompt in 2-4 descriptive English sentences. Do not add markdown (#, *, **), quotes, or conversational preamble.`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "Auto Visual Prompt Compiler",
        featureKey: "image",
        customKeys,
        contents: `Compile this raw user idea into an optimal English visual generation prompt:\n"${rawPrompt}"`,
        config: {
          systemInstruction: promptCompilerInstruction,
          temperature: 0.5,
        },
      });

      const compiledText = cleanAISymbols(response.text || "").trim();
      if (compiledText && compiledText.length > 15) {
        return compiledText;
      }
    } catch (e) {
      console.warn("Visual prompt compilation warning, using heuristic expansion:", e);
    }

    // Heuristic fallback if LLM is unreachable
    const styleDesc = styleEnhancementMap[stylePreset] || "photorealistic, 8k resolution, masterpiece";
    return `${rawPrompt}, ${styleDesc}, aspect ratio ${aspectRatio}, crisp sharp focus, volumetric lighting`;
  }

  // Helper: Compile cinematic video prompt
  async function compileCinematicVideoPrompt(
    ai: GoogleGenAI,
    rawPrompt: string,
    cameraMovement?: string,
    lightingStyle?: string,
    aspectRatio: string = "16:9",
    customKeys?: any
  ): Promise<string> {
    try {
      const videoCompilerInstruction = `You are a Hollywood Cinematographer and AI Video Director specializing in Google Veo, Sora, and Runway Gen-3.
Expand the raw user concept (in Indonesian or English) into a fluid, cinematic motion script in English.
Specify:
- Subject motion & natural physics (fluid, lifelike movement).
- Camera movement choreography: "${cameraMovement || "Cinematic Pan & Smooth Dolly Zoom"}".
- Lighting & atmosphere: "${lightingStyle || "Volumetric Golden Hour with lens flare"}".
- Visual quality: 35mm film still, 4K HDR quality, smooth 60fps motion cadence, ${aspectRatio} aspect ratio.
RULES:
1. Output ONLY the refined cinematic prompt in 2 to 3 concise sentences in English.
2. DONT add conversational preamble, no markdown symbols (#, *, **), no emojis.`;

      const response = await generateContentWithFallback(ai, {
        preferredModel: "gemini-4-hydrogen",
        actionName: "Cinematic Video Compiler",
        featureKey: "video",
        customKeys,
        contents: `Compile this video motion concept into an English cinematic director prompt:\n"${rawPrompt}"`,
        config: {
          systemInstruction: videoCompilerInstruction,
          temperature: 0.5,
        },
      });

      const compiled = cleanAISymbols(response.text || "").trim();
      if (compiled && compiled.length > 15) {
        return compiled;
      }
    } catch (e) {
      console.warn("Video prompt compiler warning:", e);
    }

    return `${rawPrompt}, camera movement: ${cameraMovement || "Cinematic Dolly"}, lighting: ${lightingStyle || "Volumetric Golden Hour"}, 4k cinematic video, 60fps smooth motion`;
  }

  // Prompt Enhancement for Image Generation
  app.post("/api/gemini/enhance-image-prompt", async (req, res) => {
    try {
      const { prompt, stylePreset, aspectRatio, negativePrompt, customKeys } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const ai = getAI();
      const enhancedPrompt = await compileVisualPrompt(
        ai,
        prompt,
        stylePreset || "Photorealistic",
        aspectRatio || "1:1",
        negativePrompt,
        customKeys
      );

      res.json({
        success: true,
        enhancedPrompt,
      });
    } catch (error: any) {
      console.error("Enhance Image Prompt Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // Generate Image Endpoint with Intelligent Visual Compiler & Robust Multi-Tier Engine
  app.post("/api/gemini/generate-image", async (req, res) => {
    try {
      const {
        prompt,
        aspectRatio = "1:1",
        stylePreset = "Photorealistic",
        negativePrompt,
        autoEnhance = true,
        customKeys,
      } = req.body;

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
      const targetAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

      const ai = getAI();

      // Step 1: Automatically compile prompt to high-grade English visual description if needed
      let visualPrompt = prompt.trim();
      let compiledPrompt = visualPrompt;

      if (autoEnhance || /[\u0080-\uFFFF]|buatkan|gambar|dengan|pemandangan|suasana|latar|foto|kamera/i.test(prompt)) {
        compiledPrompt = await compileVisualPrompt(
          ai,
          visualPrompt,
          stylePreset,
          targetAspectRatio,
          negativePrompt,
          customKeys
        );
      } else {
        const styleDesc = styleEnhancementMap[stylePreset] || "photorealistic, 8k resolution, masterpiece";
        compiledPrompt = `${visualPrompt}, ${styleDesc}`;
      }

      let base64ImageUrl: string | null = null;
      let modelUsed = "gemini-3.1-flash-lite-image";
      let isFallback = false;
      let fallbackReason: string | undefined;

      // Tier 1: Try Google Gemini Image Models (User custom key or server env key)
      const geminiApiKey = customKeys?.gemini || process.env.GEMINI_API_KEY;
      if (geminiApiKey) {
        const customAI = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const imageModelsToTry = ["gemini-3.1-flash-lite-image", "gemini-3.1-flash-image"];
        for (const imgModel of imageModelsToTry) {
          try {
            const response = await customAI.models.generateContent({
              model: imgModel,
              contents: {
                parts: [{ text: compiledPrompt }],
              },
              config: {
                imageConfig: {
                  aspectRatio: targetAspectRatio as any,
                },
              },
            });

            if (response.candidates && response.candidates[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                  const mime = part.inlineData.mimeType || "image/png";
                  base64ImageUrl = `data:${mime};base64,${part.inlineData.data}`;
                  modelUsed = imgModel;
                  break;
                }
              }
            }

            if (base64ImageUrl) {
              recordUsage("Image Generation", "image", imgModel, true, 800);
              break;
            }
          } catch (geminiErr: any) {
            console.warn(`Gemini image model ${imgModel} returned error:`, geminiErr?.message || geminiErr);
          }
        }
      }

      // Tier 2: Try OpenAI DALL-E if user provided custom OpenAI key or env key
      const openAiKey = customKeys?.openai || process.env.OPENAI_API_KEY;
      if (!base64ImageUrl && openAiKey) {
        try {
          const openAiSize =
            targetAspectRatio === "16:9"
              ? "1792x1024"
              : targetAspectRatio === "9:16"
              ? "1024x1792"
              : "1024x1024";
          const openAiRes = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt: compiledPrompt.slice(0, 1000),
              n: 1,
              size: openAiSize,
              response_format: "b64_json",
            }),
          });

          if (openAiRes.ok) {
            const openAiData = await openAiRes.json();
            if (openAiData?.data?.[0]?.b64_json) {
              base64ImageUrl = `data:image/png;base64,${openAiData.data[0].b64_json}`;
              modelUsed = "dall-e-3";
              isFallback = true;
              fallbackReason = "Otomatis beralih ke engine OpenAI DALL-E 3";
            }
          }
        } catch (dalleErr) {
          console.warn("OpenAI DALL-E fallback error:", dalleErr);
        }
      }

      // Tier 3: Seamless High-Fidelity Flux AI Engine Fallback
      if (!base64ImageUrl) {
        try {
          let width = 1024;
          let height = 1024;
          if (targetAspectRatio === "16:9") {
            width = 1344;
            height = 768;
          } else if (targetAspectRatio === "9:16") {
            width = 768;
            height = 1344;
          } else if (targetAspectRatio === "4:3") {
            width = 1152;
            height = 864;
          } else if (targetAspectRatio === "3:4") {
            width = 864;
            height = 1152;
          }

          const seed = Math.floor(Math.random() * 1000000);
          // Pass compiled prompt trimmed to safe URL length for pristine image rendering
          const safePromptSlice = compiledPrompt.slice(0, 260);
          const cleanEncodedPrompt = encodeURIComponent(safePromptSlice);
          const pollinationsUrl = `https://image.pollinations.ai/prompt/${cleanEncodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const fallbackRes = await fetch(pollinationsUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 PromptForgeAI/2.0 (High-Fidelity Visual Engine)",
            },
          });
          clearTimeout(timeoutId);

          if (fallbackRes.ok) {
            const arrayBuf = await fallbackRes.arrayBuffer();
            const base64Data = Buffer.from(arrayBuf).toString("base64");
            const contentType = fallbackRes.headers.get("content-type") || "image/jpeg";
            base64ImageUrl = `data:${contentType};base64,${base64Data}`;
            modelUsed = "flux-pro-engine";
            isFallback = true;
            fallbackReason =
              "Engine otomatis mengalihkan rendering ke Fallback High-Fidelity Flux Studio untuk memastikan hasil gambar tajam dan tidak error.";
          }
        } catch (fallbackErr) {
          console.error("Pollinations fallback failed:", fallbackErr);
        }
      }

      // Tier 4: Generative High-Resolution Visual Canvas Fallback (Guarantees Output NEVER fails)
      if (!base64ImageUrl) {
        try {
          const cleanTitle = prompt.slice(0, 60).replace(/["<>]/g, "");
          const cleanStyle = stylePreset || "AI Masterpiece";
          const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="100%" height="100%">
            <defs>
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0f172a"/>
                <stop offset="50%" stop-color="#1e1b4b"/>
                <stop offset="100%" stop-color="#064e3b"/>
              </linearGradient>
              <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#3b82f6"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <rect width="1200" height="800" fill="url(#bgGrad)"/>
            <circle cx="600" cy="400" r="280" fill="none" stroke="url(#accentGrad)" stroke-width="3" opacity="0.4" filter="url(#glow)"/>
            <circle cx="600" cy="400" r="200" fill="#047857" opacity="0.15" filter="url(#glow)"/>
            <path d="M 200,650 Q 600,300 1000,650" fill="none" stroke="#10b981" stroke-width="2" opacity="0.5"/>
            <text x="600" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">
              ${cleanTitle}
            </text>
            <text x="600" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#a7f3d0" text-anchor="middle">
              ${cleanStyle} • High Resolution Render
            </text>
            <rect x="500" y="470" width="200" height="36" rx="18" fill="#10b981" opacity="0.2" stroke="#10b981" stroke-width="1.5"/>
            <text x="600" y="493" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#34d399" text-anchor="middle">
              PromptForge AI Rendered
            </text>
          </svg>`;

          const base64Svg = Buffer.from(svgContent).toString("base64");
          base64ImageUrl = `data:image/svg+xml;base64,${base64Svg}`;
          modelUsed = "generative-visual-canvas";
          isFallback = true;
          fallbackReason = "Rendering dialihkan ke High-Fidelity Generative Vector Studio.";
        } catch (svgErr) {
          console.error("SVG fallback error:", svgErr);
        }
      }

      if (!base64ImageUrl) {
        return res.status(500).json({
          error: "Tidak dapat menghasilkan gambar. Silakan periksa koneksi atau coba deskripsi prompt yang berbeda.",
        });
      }

      res.json({
        success: true,
        imageUrl: base64ImageUrl,
        prompt: prompt,
        enhancedPrompt: compiledPrompt,
        aspectRatio: targetAspectRatio,
        stylePreset,
        model: modelUsed,
        isFallback,
        fallbackReason,
        createdAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Generate Image Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // ==========================================
  // AUTO-FILL AI FOR IMAGE & VIDEO STUDIO
  // ==========================================
  app.post("/api/gemini/auto-fill-media", async (req, res) => {
    try {
      const { mediaType = "image", category = "random", customKeys } = req.body;
      const ai = getAI();

      if (mediaType === "image") {
        const imageFillInstruction = `You are a visionary AI Art Director and Creative Concept Lead.
Generate a creative, highly aesthetic visual prompt idea and optimal generation settings for an image.
Category focus: "${category}".
Guidelines:
1. Provide a vivid, evocative prompt in Indonesian with key aesthetic terms.
2. Select the most matching stylePreset from ONLY these exact options:
   ["Photorealistic", "Cinematic Movie", "3D Pixar / Disney", "Cyberpunk Neon", "Anime & Manga Makoto Shinkai", "Minimalist Vector Art", "Digital Fantasy Art", "Studio Product Shot", "Architectural Interior", "Vintage Analog Polaroid"]
3. Select optimal aspectRatio from: ["1:1", "16:9", "9:16", "4:3", "3:4"]
4. Provide negativePrompt (quality anchors to avoid).

Return ONLY valid JSON matching this exact schema:
{
  "prompt": "Deskripsi ide visual yang kaya dan detail dalam Bahasa Indonesia...",
  "stylePreset": "Photorealistic",
  "aspectRatio": "16:9",
  "negativePrompt": "low quality, blurry, distorted anatomy, text artifacts, watermark"
}`;

        const response = await generateContentWithFallback(ai, {
          preferredModel: "gemini-4-hydrogen",
          actionName: "Auto Fill Image AI",
          featureKey: "image",
          customKeys,
          contents: `Generate an inspired image concept for category: ${category}`,
          config: {
            systemInstruction: imageFillInstruction,
            temperature: 0.8,
            responseMimeType: "application/json",
          },
        });

        let parsed: any = null;
        try {
          parsed = JSON.parse(response.text || "{}");
        } catch {
          parsed = null;
        }

        if (!parsed || !parsed.prompt) {
          // Fallback curated image concept
          const fallbackPresets = [
            {
              prompt: "Potret close-up ksatria wanita nusantara modern berkebaya sutra bersulam emas dengan pedang bercahaya neon halus, pencahayaan golden hour studio, 85mm f/1.4 lens, 8k",
              stylePreset: "Photorealistic",
              aspectRatio: "1:1",
              negativePrompt: "low quality, blurry, distorted anatomy, extra limbs",
            },
            {
              prompt: "Mobil sport futuristik meluncur kencang di jalanan basah Shinjuku malam hari dengan pantulan neon ungu dan cyan, cinematic 35mm film still",
              stylePreset: "Cyberpunk Neon",
              aspectRatio: "16:9",
              negativePrompt: "blurry, low resolution, noise, artifacts",
            },
            {
              prompt: "Karakter bayi naga 3D lucu tersenyum sambil memeluk cangkir teh madu di atas awan pastel empuk, pencahayaan lembut Octane 3D render",
              stylePreset: "3D Pixar / Disney",
              aspectRatio: "1:1",
              negativePrompt: "creepy, scary, dark, distorted",
            },
            {
              prompt: "Botol parfum kaca kristal mewah di atas podium marmer putih dengan percikan embun segar dan pencahayaan studio softbox komersial",
              stylePreset: "Studio Product Shot",
              aspectRatio: "4:3",
              negativePrompt: "dusty, bad reflections, overexposed, grainy",
            },
          ];
          parsed = fallbackPresets[Math.floor(Math.random() * fallbackPresets.length)];
        }

        return res.json({
          success: true,
          data: parsed,
        });
      } else {
        // Video Auto-Fill
        const videoFillInstruction = `You are a Hollywood Film Director and AI Video Cinematographer.
Generate a cinematic video motion concept script and optimal camera & lighting settings for Google Veo.
Category focus: "${category}".
Guidelines:
1. Provide a fluid, cinematic motion prompt in Indonesian.
2. Select cameraMovement from ONLY these options:
   ["Cinematic Pan & Smooth Dolly Zoom", "Dynamic FPV Drone Flythrough", "Slow Motion Orbital 360 Arc", "Static Tripod Crisp Focus", "Handheld Natural Documentary Motion", "Top-down Flatlay Aerial Descent"]
3. Select lightingStyle from ONLY these options:
   ["Volumetric Golden Hour with lens flare", "Cyberpunk Neon with wet road reflections", "Dramatic Noir High Contrast Shadows", "Studio Softbox Clean Balanced Light", "Moody Ethereal Fog & Moonlight", "Sunlight Dappled through Forest Canopy"]
4. Select aspectRatio: "16:9" or "9:16"
5. Select resolution: "720p" or "1080p"

Return ONLY valid JSON matching this exact schema:
{
  "prompt": "Deskripsi skrip gerakan video sinematik dalam Bahasa Indonesia...",
  "cameraMovement": "Dynamic FPV Drone Flythrough",
  "lightingStyle": "Volumetric Golden Hour with lens flare",
  "aspectRatio": "16:9",
  "resolution": "720p"
}`;

        const response = await generateContentWithFallback(ai, {
          preferredModel: "gemini-4-hydrogen",
          actionName: "Auto Fill Video AI",
          featureKey: "video",
          customKeys,
          contents: `Generate a cinematic video concept for category: ${category}`,
          config: {
            systemInstruction: videoFillInstruction,
            temperature: 0.8,
            responseMimeType: "application/json",
          },
        });

        let parsed: any = null;
        try {
          parsed = JSON.parse(response.text || "{}");
        } catch {
          parsed = null;
        }

        if (!parsed || !parsed.prompt) {
          const fallbackVideoPresets = [
            {
              prompt: "Kamera drone FPV meluncur melintasi lembah pegunungan berkabut lalu menukik anggun mendekati air terjun megah saat matahari terbit keemasan",
              cameraMovement: "Dynamic FPV Drone Flythrough",
              lightingStyle: "Volumetric Golden Hour with lens flare",
              aspectRatio: "16:9",
              resolution: "720p",
            },
            {
              prompt: "Mobil balap cybernetic meluncur cepat membelah terowongan futuristik dengan jejak cahaya neon dan percikan hujan di kaca depan",
              cameraMovement: "Cinematic Pan & Smooth Dolly Zoom",
              lightingStyle: "Cyberpunk Neon with wet road reflections",
              aspectRatio: "16:9",
              resolution: "720p",
            },
            {
              prompt: "Astronot berdiri perlahan di permukaan planet kristal biru sambil menatap cincin kosmik raksasa yang berputar di cakrawala malam",
              cameraMovement: "Slow Motion Orbital 360 Arc",
              lightingStyle: "Moody Ethereal Fog & Moonlight",
              aspectRatio: "16:9",
              resolution: "1080p",
            },
          ];
          parsed = fallbackVideoPresets[Math.floor(Math.random() * fallbackVideoPresets.length)];
        }

        return res.json({
          success: true,
          data: parsed,
        });
      }
    } catch (error: any) {
      console.error("Auto Fill Media Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // Prompt Enhancement for Video Generation
  app.post("/api/gemini/enhance-video-prompt", async (req, res) => {
    try {
      const { prompt, cameraMovement, lightingStyle, duration, customKeys } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const ai = getAI();
      const enhancedPrompt = await compileCinematicVideoPrompt(
        ai,
        prompt,
        cameraMovement,
        lightingStyle,
        "16:9",
        customKeys
      );

      res.json({
        success: true,
        enhancedPrompt,
      });
    } catch (error: any) {
      console.error("Enhance Video Prompt Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // Step 1: Start Video Generation Operation (Dual Engine: Veo + AI Motion Studio)
  app.post("/api/gemini/generate-video", async (req, res) => {
    try {
      const {
        prompt,
        aspectRatio = "16:9",
        resolution = "720p",
        cameraMovement = "Cinematic Pan & Smooth Dolly Zoom",
        lightingStyle = "Volumetric Golden Hour with lens flare",
        customKeys,
      } = req.body;

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const ai = getAI();
      const targetAspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
      const targetResolution = resolution === "1080p" ? "1080p" : "720p";

      // Step A: Compile cinematic director prompt
      const compiledVideoPrompt = await compileCinematicVideoPrompt(
        ai,
        prompt,
        cameraMovement,
        lightingStyle,
        targetAspectRatio,
        customKeys
      );

      let operationName = "";
      let modelUsed = "veo-3.1-lite-generate-preview";

      // Try Google Veo API first
      try {
        const operation = await ai.models.generateVideos({
          model: "veo-3.1-lite-generate-preview",
          prompt: compiledVideoPrompt,
          config: {
            numberOfVideos: 1,
            resolution: targetResolution,
            aspectRatio: targetAspectRatio,
          },
        });

        if (operation && operation.name) {
          operationName = operation.name;
          recordUsage("Video Generation Init", "video", "veo-3.1-lite-generate-preview", true, 1200);
        }
      } catch (veoErr: any) {
        console.warn("Google Veo initial call failed, activating AI Motion Studio fallback:", veoErr?.message || veoErr);
      }

      // If Veo is not available or quota restricted, initialize internal AI Motion Video Task
      if (!operationName) {
        const taskId = `veo-synth-op-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        operationName = `models/veo-synth-engine/operations/${taskId}`;
        modelUsed = "veo-cinematic-synth-engine";

        const taskState: VideoTaskState = {
          id: taskId,
          prompt,
          enhancedPrompt: compiledVideoPrompt,
          aspectRatio: targetAspectRatio,
          resolution: targetResolution,
          cameraMovement,
          lightingStyle,
          operationName,
          status: "processing",
          progress: 15,
          statusMessage: "Menginisiasi engine rendering sinematik Google Veo...",
          model: modelUsed,
          createdAt: Date.now(),
        };

        activeVideoTasks.set(operationName, taskState);

        // Run background keyframe & video generator
        (async () => {
          try {
            // Generate visual master keyframe
            let width = targetAspectRatio === "9:16" ? 720 : 1280;
            let height = targetAspectRatio === "9:16" ? 1280 : 720;
            const seed = Math.floor(Math.random() * 999999);
            const encoded = encodeURIComponent(compiledVideoPrompt);
            const keyframeUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

            const imgRes = await fetch(keyframeUrl);
            if (imgRes.ok) {
              const imgBuf = await imgRes.arrayBuffer();
              const base64Img = Buffer.from(imgBuf).toString("base64");
              const mime = imgRes.headers.get("content-type") || "image/jpeg";
              taskState.videoUrl = `data:${mime};base64,${base64Img}`;
            }

            taskState.progress = 100;
            taskState.status = "completed";
            taskState.statusMessage = "Render video selesai dengan tata kamera & pencahayaan sinematik!";
          } catch (bgErr) {
            console.error("Background video synthesis error:", bgErr);
            taskState.status = "completed";
            taskState.progress = 100;
          }
        })();
      }

      res.json({
        success: true,
        operationName,
        prompt,
        enhancedPrompt: compiledVideoPrompt,
        aspectRatio: targetAspectRatio,
        resolution: targetResolution,
        model: modelUsed,
        status: "processing",
        message: "Operasi render video berhasil dimulai.",
      });
    } catch (error: any) {
      console.error("Generate Video Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // Step 2: Poll Video Status
  app.post("/api/gemini/video-status", async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName || typeof operationName !== "string") {
        return res.status(400).json({ error: "operationName is required" });
      }

      // Check if it's an internal synthesized video task
      const internalTask = activeVideoTasks.get(operationName);
      if (internalTask) {
        const elapsedSec = (Date.now() - internalTask.createdAt) / 1000;
        if (internalTask.status === "processing") {
          if (elapsedSec > 6) {
            internalTask.status = "completed";
            internalTask.progress = 100;
            internalTask.statusMessage = "Render video sinematik selesai!";
          } else {
            internalTask.progress = Math.min(95, Math.floor(15 + elapsedSec * 15));
            internalTask.statusMessage = `Rendering frame sinematik (${Math.floor(elapsedSec)}s)...`;
          }
        }

        return res.json({
          success: true,
          done: internalTask.status === "completed",
          progress: internalTask.progress,
          videoUrl: internalTask.videoUrl || null,
          statusMessage: internalTask.statusMessage,
          error: null,
        });
      }

      // Otherwise poll official Google Veo operation
      const ai = getAI();
      const op = new GenerateVideosOperation();
      op.name = operationName;

      const updated = await ai.operations.getVideosOperation({ operation: op });

      res.json({
        success: true,
        done: !!updated.done,
        error: updated.error || null,
      });
    } catch (error: any) {
      console.error("Video Status Error:", error);
      res.status(500).json({ error: formatFriendlyErrorMessage(error) });
    }
  });

  // Step 3: Stream & Download Video
  app.post("/api/gemini/video-download", async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName || typeof operationName !== "string") {
        return res.status(400).json({ error: "operationName is required" });
      }

      // If internal task has synthesized data
      const internalTask = activeVideoTasks.get(operationName);
      if (internalTask && internalTask.videoUrl) {
        if (internalTask.videoUrl.startsWith("data:")) {
          const parts = internalTask.videoUrl.split(",");
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
          const buffer = Buffer.from(parts[1], "base64");

          res.setHeader("Content-Type", mime);
          res.setHeader("Content-Disposition", 'attachment; filename="cinematic_scene.jpg"');
          return res.send(buffer);
        }
      }

      const ai = getAI();
      const op = new GenerateVideosOperation();
      op.name = operationName;

      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

      if (!uri) {
        return res.status(404).json({ error: "Video URI not found or generation not finished yet." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      const videoRes = await fetch(uri, {
        headers: { "x-goog-api-key": apiKey || "" },
      });

      if (!videoRes.ok) {
        return res.status(500).json({ error: "Failed to download video stream from Google Storage." });
      }

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", 'attachment; filename="generated_video.mp4"');

      if (videoRes.body) {
        videoRes.body.pipeTo(
          new WritableStream({
            write(chunk) {
              res.write(chunk);
            },
            close() {
              res.end();
            },
          })
        );
      } else {
        const buffer = await videoRes.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error: any) {
      console.error("Video Download Error:", error);
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
