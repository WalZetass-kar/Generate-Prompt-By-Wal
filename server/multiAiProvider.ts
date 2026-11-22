import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { cleanAISymbols } from "./promptPipeline";

export interface CustomKeyConfig {
  openai?: string;
  anthropic?: string;
  deepseek?: string;
  groq?: string;
  openrouter?: string;
  customGemini?: string;
  openaiModel?: string;
  anthropicModel?: string;
  deepseekModel?: string;
  groqModel?: string;
  openrouterModel?: string;
  customBaseUrl?: string;
}

export type SupportedProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'openrouter';

export interface MultiAiChatParams {
  provider?: SupportedProvider | string;
  customKeys?: CustomKeyConfig;
  messages: Array<{ role: string; content: string }>;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  preferredModel?: string;
}

export interface MultiAiGenerateParams {
  provider?: SupportedProvider | string;
  customKeys?: CustomKeyConfig;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  preferredModel?: string;
  responseMimeType?: string;
}

export interface MultiAiResult {
  text: string;
  providerUsed: SupportedProvider;
  modelUsed: string;
  isFallback: boolean;
  fallbackReason?: string;
}

// Native fetch timeout helper
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 45000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 1. OpenAI Chat Completion Call
async function callOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
  temperature = 0.7,
  customBaseUrl?: string
): Promise<string> {
  const baseUrl = (customBaseUrl?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const formattedMessages = [];
  if (systemInstruction) {
    formattedMessages.push({ role: 'system', content: systemInstruction });
  }
  formattedMessages.push(...messages);

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: formattedMessages,
      temperature,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 2. Anthropic Claude Call
async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
  temperature = 0.7
): Promise<string> {
  const url = 'https://api.anthropic.com/v1/messages';

  // Format messages: Anthropic accepts only 'user' and 'assistant' roles
  const anthropicMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  if (anthropicMessages.length === 0) {
    anthropicMessages.push({ role: 'user', content: 'Halo' });
  }

  const body: any = {
    model: model || 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: anthropicMessages,
    temperature,
  };

  if (systemInstruction) {
    body.system = systemInstruction;
  }

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Anthropic Claude API error (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const textParts = data.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n') || '';
  return textParts;
}

// 3. DeepSeek Call (OpenAI-compatible)
async function callDeepSeek(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
  temperature = 0.7
): Promise<string> {
  const url = 'https://api.deepseek.com/v1/chat/completions';

  const formattedMessages = [];
  if (systemInstruction) {
    formattedMessages.push({ role: 'system', content: systemInstruction });
  }
  formattedMessages.push(...messages);

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages: formattedMessages,
      temperature,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`DeepSeek API error (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 4. Groq Call (OpenAI-compatible)
async function callGroq(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
  temperature = 0.7
): Promise<string> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const formattedMessages = [];
  if (systemInstruction) {
    formattedMessages.push({ role: 'system', content: systemInstruction });
  }
  formattedMessages.push(...messages);

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'llama-3.3-70b-versatile',
      messages: formattedMessages,
      temperature,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 5. OpenRouter Call (OpenAI-compatible)
async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
  temperature = 0.7
): Promise<string> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const formattedMessages = [];
  if (systemInstruction) {
    formattedMessages.push({ role: 'system', content: systemInstruction });
  }
  formattedMessages.push(...messages);

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://promptforge.ai',
      'X-Title': 'PromptForge AI Studio',
    },
    body: JSON.stringify({
      model: model || 'meta-llama/llama-3.3-70b-instruct',
      messages: formattedMessages,
      temperature,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 6. Gemini Core Caller (Fallback & Default)
async function callGemini(
  customGeminiKey: string | undefined,
  contents: any,
  systemInstruction?: string,
  temperature = 0.7,
  preferredModel = 'gemini-4-hydrogen',
  responseMimeType?: string
): Promise<string> {
  const keyToUse = customGeminiKey?.trim() || process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey: keyToUse,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const normalizedPrimary =
    !preferredModel || preferredModel === 'gemini-3.7-flash' || preferredModel === 'gemini-flash-latest'
      ? 'gemini-4-hydrogen'
      : preferredModel;

  const rawModels = [normalizedPrimary, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  const modelsToTry = Array.from(new Set(rawModels.filter(Boolean)));

  for (let i = 0; i < modelsToTry.length; i++) {
    const mod = modelsToTry[i];
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config: any = {};
        if (mod.startsWith('gemini-4-')) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        } else {
          config.temperature = temperature;
        }
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseMimeType) config.responseMimeType = responseMimeType;

        const response = await ai.models.generateContent({
          model: mod,
          contents,
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        if (response.text) {
          return response.text;
        }
      } catch (e: any) {
        const errStr = String(e?.message || e);
        const is503HighDemand = errStr.includes('503') || errStr.includes('high demand') || errStr.includes('UNAVAILABLE') || errStr.includes('temporary');
        const is429Quota = errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED');

        console.warn(`Gemini model ${mod} (attempt ${attempt}/${maxRetries}) failed (${e?.status || 'ERR'}):`, e?.message);

        if (attempt < maxRetries && (is503HighDemand || is429Quota)) {
          const delay = attempt * 500 + Math.floor(Math.random() * 200);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (i < modelsToTry.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, is503HighDemand ? 400 : 200));
          break;
        }
      }
    }
  }

  throw new Error('All Gemini model fallbacks exhausted.');
}

/**
 * Universal Multi-AI Chat Executor:
 * Executes chat using the requested provider (OpenAI, Claude, DeepSeek, Groq, OpenRouter)
 * if an API key is provided; otherwise seamlessly executes via built-in Gemini.
 */
export async function executeMultiAiChat(params: MultiAiChatParams): Promise<MultiAiResult> {
  const provider = (params.provider || 'gemini') as SupportedProvider;
  const keys = params.customKeys || {};
  const sysPrompt = params.systemInstruction;
  const temp = params.temperature ?? 0.7;

  // Check if requested non-gemini provider has a key
  if (provider === 'openai' && keys.openai?.trim()) {
    try {
      const text = await callOpenAI(
        keys.openai.trim(),
        keys.openaiModel || 'gpt-4o',
        params.messages,
        sysPrompt,
        temp,
        keys.customBaseUrl
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'openai',
        modelUsed: keys.openaiModel || 'gpt-4o',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI] OpenAI failed (${err.message}). Falling back to Gemini...`);
      // Fallback to Gemini
      const geminiText = await executeGeminiChatFallback(params, keys.customGemini);
      return {
        text: cleanAISymbols(geminiText),
        providerUsed: 'gemini',
        modelUsed: 'gemini-4-hydrogen',
        isFallback: true,
        fallbackReason: `OpenAI key/endpoint error: ${err.message}. Otomatis beralih ke Gemini.`,
      };
    }
  }

  if (provider === 'anthropic' && keys.anthropic?.trim()) {
    try {
      const text = await callAnthropic(
        keys.anthropic.trim(),
        keys.anthropicModel || 'claude-3-5-sonnet-20241022',
        params.messages,
        sysPrompt,
        temp
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'anthropic',
        modelUsed: keys.anthropicModel || 'claude-3-5-sonnet-20241022',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI] Anthropic failed (${err.message}). Falling back to Gemini...`);
      const geminiText = await executeGeminiChatFallback(params, keys.customGemini);
      return {
        text: cleanAISymbols(geminiText),
        providerUsed: 'gemini',
        modelUsed: 'gemini-4-hydrogen',
        isFallback: true,
        fallbackReason: `Claude key/endpoint error: ${err.message}. Otomatis beralih ke Gemini.`,
      };
    }
  }

  if (provider === 'deepseek' && keys.deepseek?.trim()) {
    try {
      const text = await callDeepSeek(
        keys.deepseek.trim(),
        keys.deepseekModel || 'deepseek-chat',
        params.messages,
        sysPrompt,
        temp
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'deepseek',
        modelUsed: keys.deepseekModel || 'deepseek-chat',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI] DeepSeek failed (${err.message}). Falling back to Gemini...`);
      const geminiText = await executeGeminiChatFallback(params, keys.customGemini);
      return {
        text: cleanAISymbols(geminiText),
        providerUsed: 'gemini',
        modelUsed: 'gemini-4-hydrogen',
        isFallback: true,
        fallbackReason: `DeepSeek key/endpoint error: ${err.message}. Otomatis beralih ke Gemini.`,
      };
    }
  }

  if (provider === 'groq' && keys.groq?.trim()) {
    try {
      const text = await callGroq(
        keys.groq.trim(),
        keys.groqModel || 'llama-3.3-70b-versatile',
        params.messages,
        sysPrompt,
        temp
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'groq',
        modelUsed: keys.groqModel || 'llama-3.3-70b-versatile',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI] Groq failed (${err.message}). Falling back to Gemini...`);
      const geminiText = await executeGeminiChatFallback(params, keys.customGemini);
      return {
        text: cleanAISymbols(geminiText),
        providerUsed: 'gemini',
        modelUsed: 'gemini-4-hydrogen',
        isFallback: true,
        fallbackReason: `Groq key/endpoint error: ${err.message}. Otomatis beralih ke Gemini.`,
      };
    }
  }

  if (provider === 'openrouter' && keys.openrouter?.trim()) {
    try {
      const text = await callOpenRouter(
        keys.openrouter.trim(),
        keys.openrouterModel || 'meta-llama/llama-3.3-70b-instruct',
        params.messages,
        sysPrompt,
        temp
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'openrouter',
        modelUsed: keys.openrouterModel || 'meta-llama/llama-3.3-70b-instruct',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI] OpenRouter failed (${err.message}). Falling back to Gemini...`);
      const geminiText = await executeGeminiChatFallback(params, keys.customGemini);
      return {
        text: cleanAISymbols(geminiText),
        providerUsed: 'gemini',
        modelUsed: 'gemini-4-hydrogen',
        isFallback: true,
        fallbackReason: `OpenRouter key/endpoint error: ${err.message}. Otomatis beralih ke Gemini.`,
      };
    }
  }

  // Default: Gemini (Injected / Custom Key)
  const geminiText = await executeGeminiChatFallback(params, keys.customGemini);
  return {
    text: cleanAISymbols(geminiText),
    providerUsed: 'gemini',
    modelUsed: 'gemini-4-hydrogen',
    isFallback: false,
  };
}

async function executeGeminiChatFallback(params: MultiAiChatParams, customGeminiKey?: string): Promise<string> {
  const formattedContents = params.messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  return callGemini(
    customGeminiKey,
    formattedContents,
    params.systemInstruction,
    params.temperature ?? 0.7,
    params.preferredModel || 'gemini-4-hydrogen'
  );
}

/**
 * Universal Multi-AI Generation Executor (for Prompt Generation, Optimization, Wizard, etc.)
 */
export async function executeMultiAiGenerate(params: MultiAiGenerateParams): Promise<MultiAiResult> {
  const provider = (params.provider || 'gemini') as SupportedProvider;
  const keys = params.customKeys || {};
  const messages = [{ role: 'user', content: params.prompt }];
  const sysPrompt = params.systemInstruction;
  const temp = params.temperature ?? 0.2;

  if (provider === 'openai' && keys.openai?.trim()) {
    try {
      const text = await callOpenAI(
        keys.openai.trim(),
        keys.openaiModel || 'gpt-4o',
        messages,
        sysPrompt,
        temp,
        keys.customBaseUrl
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'openai',
        modelUsed: keys.openaiModel || 'gpt-4o',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI Generate] OpenAI failed (${err.message}). Falling back to Gemini...`);
    }
  }

  if (provider === 'anthropic' && keys.anthropic?.trim()) {
    try {
      const text = await callAnthropic(
        keys.anthropic.trim(),
        keys.anthropicModel || 'claude-3-5-sonnet-20241022',
        messages,
        sysPrompt,
        temp
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'anthropic',
        modelUsed: keys.anthropicModel || 'claude-3-5-sonnet-20241022',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI Generate] Anthropic failed (${err.message}). Falling back to Gemini...`);
    }
  }

  if (provider === 'deepseek' && keys.deepseek?.trim()) {
    try {
      const text = await callDeepSeek(
        keys.deepseek.trim(),
        keys.deepseekModel || 'deepseek-chat',
        messages,
        sysPrompt,
        temp
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'deepseek',
        modelUsed: keys.deepseekModel || 'deepseek-chat',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI Generate] DeepSeek failed (${err.message}). Falling back to Gemini...`);
    }
  }

  if (provider === 'groq' && keys.groq?.trim()) {
    try {
      const text = await callGroq(
        keys.groq.trim(),
        keys.groqModel || 'llama-3.3-70b-versatile',
        messages,
        sysPrompt,
        temp
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'groq',
        modelUsed: keys.groqModel || 'llama-3.3-70b-versatile',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI Generate] Groq failed (${err.message}). Falling back to Gemini...`);
    }
  }

  if (provider === 'openrouter' && keys.openrouter?.trim()) {
    try {
      const text = await callOpenRouter(
        keys.openrouter.trim(),
        keys.openrouterModel || 'meta-llama/llama-3.3-70b-instruct',
        messages,
        sysPrompt,
        temp
      );
      return {
        text: cleanAISymbols(text),
        providerUsed: 'openrouter',
        modelUsed: keys.openrouterModel || 'meta-llama/llama-3.3-70b-instruct',
        isFallback: false,
      };
    } catch (err: any) {
      console.warn(`[MultiAI Generate] OpenRouter failed (${err.message}). Falling back to Gemini...`);
    }
  }

  // Default Gemini
  const text = await callGemini(
    keys.customGemini,
    params.prompt,
    params.systemInstruction,
    temp,
    params.preferredModel || 'gemini-4-hydrogen',
    params.responseMimeType
  );

  return {
    text: cleanAISymbols(text),
    providerUsed: 'gemini',
    modelUsed: params.preferredModel || 'gemini-4-hydrogen',
    isFallback: false,
  };
}

/**
 * Test Connection Endpoint Helper:
 * Validates whether an API Key for any provider is valid by performing a lightweight ping.
 */
export async function testAiConnection(
  provider: SupportedProvider,
  apiKey: string,
  model?: string,
  customBaseUrl?: string
): Promise<{ success: boolean; message: string; latencyMs: number; modelUsed: string }> {
  const startTime = performance.now();

  try {
    if (provider === 'gemini') {
      const text = await callGemini(apiKey, 'Respond with "PONG" only.', undefined, 0.1, 'gemini-3.1-flash-lite');
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: true,
        message: `Koneksi Gemini AI Berhasil! (Response: ${text.trim().slice(0, 20)})`,
        latencyMs,
        modelUsed: 'gemini-3.1-flash-lite',
      };
    }

    if (provider === 'openai') {
      const targetModel = model || 'gpt-4o-mini';
      const text = await callOpenAI(apiKey, targetModel, [{ role: 'user', content: 'Ping' }], undefined, 0.1, customBaseUrl);
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: true,
        message: `Koneksi OpenAI Berhasil! (${targetModel})`,
        latencyMs,
        modelUsed: targetModel,
      };
    }

    if (provider === 'anthropic') {
      const targetModel = model || 'claude-3-5-haiku-20241022';
      const text = await callAnthropic(apiKey, targetModel, [{ role: 'user', content: 'Ping' }], undefined, 0.1);
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: true,
        message: `Koneksi Anthropic Claude Berhasil! (${targetModel})`,
        latencyMs,
        modelUsed: targetModel,
      };
    }

    if (provider === 'deepseek') {
      const targetModel = model || 'deepseek-chat';
      const text = await callDeepSeek(apiKey, targetModel, [{ role: 'user', content: 'Ping' }], undefined, 0.1);
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: true,
        message: `Koneksi DeepSeek AI Berhasil! (${targetModel})`,
        latencyMs,
        modelUsed: targetModel,
      };
    }

    if (provider === 'groq') {
      const targetModel = model || 'llama-3.3-70b-versatile';
      const text = await callGroq(apiKey, targetModel, [{ role: 'user', content: 'Ping' }], undefined, 0.1);
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: true,
        message: `Koneksi Groq High-Speed Berhasil! (${targetModel})`,
        latencyMs,
        modelUsed: targetModel,
      };
    }

    if (provider === 'openrouter') {
      const targetModel = model || 'meta-llama/llama-3.3-70b-instruct';
      const text = await callOpenRouter(apiKey, targetModel, [{ role: 'user', content: 'Ping' }], undefined, 0.1);
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: true,
        message: `Koneksi OpenRouter Berhasil! (${targetModel})`,
        latencyMs,
        modelUsed: targetModel,
      };
    }

    return {
      success: false,
      message: `Provider '${provider}' tidak dikenali.`,
      latencyMs: 0,
      modelUsed: 'unknown',
    };
  } catch (error: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      message: error?.message || 'Gagal terhubung ke provider AI.',
      latencyMs,
      modelUsed: model || provider,
    };
  }
}
