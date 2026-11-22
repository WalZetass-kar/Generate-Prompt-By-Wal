import React, { useState, useMemo } from 'react';
import {
  Key,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Radio,
  Trash2,
  Cpu,
  Plus,
  Sliders,
  CheckCircle2,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import { UserSettings, CustomAIKeys, AIProviderId } from '../types';

interface MultiAiKeySettingsProps {
  settings: UserSettings;
  onChange: (updated: UserSettings) => void;
}

interface DetectedKeyInfo {
  provider: AIProviderId | 'customGemini';
  providerName: string;
  key: string;
  confidence: 'high' | 'medium' | 'manual';
  note: string;
}

interface ProviderMeta {
  id: AIProviderId | 'customGemini';
  name: string;
  keyField: keyof CustomAIKeys;
  modelField?: keyof CustomAIKeys;
  defaultModel: string;
  modelOptions: { value: string; label: string }[];
  docUrl: string;
  prefixHints: string[];
}

const PROVIDERS_CONFIG: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    keyField: 'customGemini',
    defaultModel: 'gemini-4-hydrogen',
    modelOptions: [
      { value: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (Flagship Fast & Smart)' },
      { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Ultra Fast Fallback)' },
    ],
    docUrl: 'https://aistudio.google.com/app/apikey',
    prefixHints: ['AIzaSy'],
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT / GPT-4o)',
    keyField: 'openai',
    modelField: 'openaiModel',
    defaultModel: 'gpt-4o',
    modelOptions: [
      { value: 'gpt-4o', label: 'GPT-4o (Flagship Omni)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost Effective)' },
      { value: 'o3-mini', label: 'o3-mini (High Reasoning)' },
      { value: 'o1-mini', label: 'o1-mini (Reasoning Specialist)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
    docUrl: 'https://platform.openai.com/api-keys',
    prefixHints: ['sk-proj-', 'sk-admin-', 'sk-'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    keyField: 'anthropic',
    modelField: 'anthropicModel',
    defaultModel: 'claude-3-5-sonnet-20241022',
    modelOptions: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Coding Specialist)' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast)' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Deep Analysis)' },
    ],
    docUrl: 'https://console.anthropic.com/settings/keys',
    prefixHints: ['sk-ant-api', 'sk-ant-'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    keyField: 'deepseek',
    modelField: 'deepseekModel',
    defaultModel: 'deepseek-chat',
    modelOptions: [
      { value: 'deepseek-chat', label: 'DeepSeek V3 (Chat & Coding)' },
      { value: 'deepseek-reasoner', label: 'DeepSeek R1 (Deep Reasoning)' },
    ],
    docUrl: 'https://platform.deepseek.com/api_keys',
    prefixHints: ['sk-'],
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    keyField: 'groq',
    modelField: 'groqModel',
    defaultModel: 'llama-3.3-70b-versatile',
    modelOptions: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    ],
    docUrl: 'https://console.groq.com/keys',
    prefixHints: ['gsk_'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Gateway',
    keyField: 'openrouter',
    modelField: 'openrouterModel',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    modelOptions: [
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
      { value: 'mistralai/mistral-large-2407', label: 'Mistral Large' },
      { value: 'perplexity/sonar-reasoning', label: 'Perplexity Sonar' },
    ],
    docUrl: 'https://openrouter.ai/keys',
    prefixHints: ['sk-or-v1-', 'sk-or-'],
  },
];

/**
 * Intelligent detector function to determine provider and extract keys
 */
export function detectKeysFromInput(rawInput: string, manualProviderOverride?: string): DetectedKeyInfo[] {
  const text = rawInput.trim();
  if (!text) return [];

  const results: DetectedKeyInfo[] = [];

  // Check if input is JSON
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.trim().length > 10) {
          const det = detectSingleKey(v.trim(), k);
          if (det) results.push(det);
        }
      }
      if (results.length > 0) return results;
    } catch {
      // Not JSON, continue to line-by-line parsing
    }
  }

  // Split by newlines, commas, or semicolons
  const lines = text.split(/[\r\n;,]+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    let keyStr = line;
    let labelHint = '';

    // Check KEY=VALUE or KEY: VALUE format
    if (line.includes('=') || line.includes(':')) {
      const parts = line.split(/[=:]/);
      if (parts.length >= 2) {
        labelHint = parts[0].trim();
        keyStr = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      }
    }

    if (keyStr.length >= 8) {
      const detected = detectSingleKey(keyStr, labelHint, manualProviderOverride);
      if (detected) {
        results.push(detected);
      }
    }
  }

  return results;
}

function detectSingleKey(key: string, labelHint = '', manualOverride?: string): DetectedKeyInfo | null {
  const cleanKey = key.trim();
  if (!cleanKey) return null;

  const hintLower = labelHint.toLowerCase();

  // If user explicitly selected a manual override provider
  if (manualOverride && manualOverride !== 'auto') {
    const prov = PROVIDERS_CONFIG.find((p) => p.id === manualOverride || p.keyField === manualOverride);
    if (prov) {
      return {
        provider: prov.id,
        providerName: prov.name,
        key: cleanKey,
        confidence: 'manual',
        note: `Ditentukan manual sebagai ${prov.name}`,
      };
    }
  }

  // 1. Google Gemini pattern: starts with AIzaSy
  if (cleanKey.startsWith('AIzaSy') || hintLower.includes('gemini') || hintLower.includes('google')) {
    return {
      provider: 'gemini',
      providerName: 'Google Gemini',
      key: cleanKey,
      confidence: 'high',
      note: 'Format terdeteksi: Google AI Studio Key (Prefix AIzaSy)',
    };
  }

  // 2. Anthropic Claude pattern: starts with sk-ant-
  if (cleanKey.startsWith('sk-ant-') || hintLower.includes('anthropic') || hintLower.includes('claude')) {
    return {
      provider: 'anthropic',
      providerName: 'Anthropic Claude',
      key: cleanKey,
      confidence: 'high',
      note: 'Format terdeteksi: Anthropic Claude Key (Prefix sk-ant-)',
    };
  }

  // 3. Groq pattern: starts with gsk_
  if (cleanKey.startsWith('gsk_') || hintLower.includes('groq')) {
    return {
      provider: 'groq',
      providerName: 'Groq Cloud',
      key: cleanKey,
      confidence: 'high',
      note: 'Format terdeteksi: Groq Cloud LPU Key (Prefix gsk_)',
    };
  }

  // 4. OpenRouter pattern: starts with sk-or-
  if (cleanKey.startsWith('sk-or-') || hintLower.includes('openrouter')) {
    return {
      provider: 'openrouter',
      providerName: 'OpenRouter Gateway',
      key: cleanKey,
      confidence: 'high',
      note: 'Format terdeteksi: OpenRouter Unified Key (Prefix sk-or-)',
    };
  }

  // 5. DeepSeek pattern: label hints or 32-hex format
  if (hintLower.includes('deepseek') || (cleanKey.startsWith('sk-') && /^[a-f0-9]{32}$/i.test(cleanKey.slice(3)))) {
    return {
      provider: 'deepseek',
      providerName: 'DeepSeek AI',
      key: cleanKey,
      confidence: hintLower.includes('deepseek') ? 'high' : 'medium',
      note: 'Format terdeteksi: DeepSeek API Key',
    };
  }

  // 6. OpenAI pattern: starts with sk-proj- or standard sk-
  if (cleanKey.startsWith('sk-proj-') || cleanKey.startsWith('sk-admin-') || cleanKey.startsWith('sk-') || hintLower.includes('openai') || hintLower.includes('chatgpt')) {
    return {
      provider: 'openai',
      providerName: 'OpenAI (ChatGPT / GPT-4o)',
      key: cleanKey,
      confidence: 'high',
      note: 'Format terdeteksi: OpenAI API Key (Prefix sk-)',
    };
  }

  // Fallback if key is non-empty string
  return {
    provider: 'openai',
    providerName: 'OpenAI / Generic Key',
    key: cleanKey,
    confidence: 'medium',
    note: 'Format umum: Disimpan sebagai default provider',
  };
}

export const MultiAiKeySettings: React.FC<MultiAiKeySettingsProps> = ({
  settings,
  onChange,
}) => {
  const [inputKeyText, setInputKeyText] = useState('');
  const [manualProvider, setManualProvider] = useState('auto');
  const [showMasked, setShowMasked] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string; latencyMs?: number }>
  >({});
  const [saveFeedback, setSaveFeedback] = useState<string>('');

  const customKeys: CustomAIKeys = settings.customKeys || {};
  const activeProvider: AIProviderId = settings.activeProvider || 'gemini';
  const botProvider: AIProviderId = settings.botProvider || 'gemini';

  // Live detection as user types or pastes in the single form
  const detectedList = useMemo(() => {
    return detectKeysFromInput(inputKeyText, manualProvider);
  }, [inputKeyText, manualProvider]);

  // Inventory of keys currently carried / active in settings
  const carriedKeysInventory = useMemo(() => {
    const list: {
      providerId: AIProviderId | 'customGemini';
      name: string;
      keyField: keyof CustomAIKeys;
      modelField?: keyof CustomAIKeys;
      keyValue: string;
      isCustom: boolean;
      defaultModel: string;
      selectedModel: string;
      docUrl: string;
    }[] = [];

    // 1. Google Gemini (System default is always available)
    const geminiCustom = customKeys.customGemini || '';
    list.push({
      providerId: 'gemini',
      name: 'Google Gemini',
      keyField: 'customGemini',
      keyValue: geminiCustom || 'SYSTEM_DEFAULT_INJECTED',
      isCustom: Boolean(geminiCustom),
      defaultModel: 'gemini-4-hydrogen',
      selectedModel: 'gemini-4-hydrogen',
      docUrl: 'https://aistudio.google.com/app/apikey',
    });

    // 2. Other providers
    const otherProviders = PROVIDERS_CONFIG.filter((p) => p.id !== 'gemini');
    for (const p of otherProviders) {
      const val = (customKeys[p.keyField] as string) || '';
      if (val.trim()) {
        const modelVal = p.modelField ? (customKeys[p.modelField] as string) || p.defaultModel : p.defaultModel;
        list.push({
          providerId: p.id,
          name: p.name,
          keyField: p.keyField,
          modelField: p.modelField,
          keyValue: val,
          isCustom: true,
          defaultModel: p.defaultModel,
          selectedModel: modelVal,
          docUrl: p.docUrl,
        });
      }
    }

    return list;
  }, [customKeys]);

  const handleApplyDetectedKeys = () => {
    if (detectedList.length === 0) return;

    const updatedKeys: CustomAIKeys = { ...customKeys };
    const savedNames: string[] = [];

    for (const item of detectedList) {
      const conf = PROVIDERS_CONFIG.find((p) => p.id === item.provider);
      if (conf) {
        (updatedKeys[conf.keyField] as string) = item.key;
        savedNames.push(conf.name);
      }
    }

    onChange({
      ...settings,
      customKeys: updatedKeys,
    });

    setInputKeyText('');
    setSaveFeedback(`Berhasil menyimpan ${detectedList.length} API Key: ${savedNames.join(', ')}`);
    setTimeout(() => setSaveFeedback(''), 4000);
  };

  const handleRemoveKey = (keyField: keyof CustomAIKeys) => {
    const updatedKeys: CustomAIKeys = { ...customKeys, [keyField]: '' };
    onChange({
      ...settings,
      customKeys: updatedKeys,
    });
    setSaveFeedback('Kunci berhasil dihapus');
    setTimeout(() => setSaveFeedback(''), 2500);
  };

  const handleModelChange = (modelField: keyof CustomAIKeys, value: string) => {
    onChange({
      ...settings,
      customKeys: {
        ...customKeys,
        [modelField]: value,
      },
    });
  };

  const handleSetPrimaryEngine = (providerId: AIProviderId) => {
    onChange({
      ...settings,
      activeProvider: providerId,
      botProvider: providerId,
    });
    setSaveFeedback(`Engine utama diubah ke ${providerId.toUpperCase()}`);
    setTimeout(() => setSaveFeedback(''), 2500);
  };

  const handleTestConnection = async (providerId: string, apiKey: string, model: string) => {
    setTestingProvider(providerId);
    setTestResults((prev) => ({ ...prev, [providerId]: undefined as any }));

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId === 'gemini' ? 'gemini' : providerId,
          apiKey: apiKey === 'SYSTEM_DEFAULT_INJECTED' ? '' : apiKey,
          model,
          customBaseUrl: customKeys.customBaseUrl,
        }),
      });

      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: data.success,
          message: data.message || (data.success ? 'Koneksi Berhasil' : 'Gagal terhubung'),
          latencyMs: data.latencyMs,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          message: err.message || 'Kesalahan jaringan',
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const maskKey = (raw: string) => {
    if (raw === 'SYSTEM_DEFAULT_INJECTED') return 'Bawaan Google AI Studio (Aktif)';
    if (raw.length <= 12) return '••••••••••••';
    return `${raw.slice(0, 7)}...${raw.slice(-4)}`;
  };

  return (
    <div className="space-y-4">
      {/* Header Info Banner - Solid & Clean */}
      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-emerald-400 shrink-0 border border-slate-700">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Integrasi API Key Terpusat (Smart Auto-Detection)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cukup masukkan atau tempel kunci API di satu form ini. Sistem akan langsung mendeteksi jenis provider dan mendaftarkan kuncinya secara otomatis.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-[11px] font-bold shrink-0">
            {carriedKeysInventory.length} Provider Aktif
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Kunci disimpan aman di profil Firebase Cloud akun Google Anda. Jika API Key pihak ketiga kosong atau limit, sistem otomatis beralih menggunakan Google Gemini 4.
          </span>
        </div>
      </div>

      {saveFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* SINGLE UNIFIED KEY INPUT FORM */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Form Input &amp; Deteksi Kunci API
          </label>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Provider Override:</span>
            <select
              value={manualProvider}
              onChange={(e) => setManualProvider(e.target.value)}
              className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none"
            >
              <option value="auto">Deteksi Otomatis (Auto-Detect)</option>
              <option value="openai">OpenAI (sk-...)</option>
              <option value="anthropic">Anthropic Claude (sk-ant-...)</option>
              <option value="gemini">Google Gemini (AIzaSy...)</option>
              <option value="deepseek">DeepSeek AI</option>
              <option value="groq">Groq Cloud (gsk_...)</option>
              <option value="openrouter">OpenRouter (sk-or-...)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            value={inputKeyText}
            onChange={(e) => setInputKeyText(e.target.value)}
            rows={2}
            placeholder="Tempel satu atau beberapa API Key di sini (misal: sk-proj-..., sk-ant-..., AIzaSy..., gsk_..., atau OPENAI_API_KEY=sk-...)..."
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
          />

          {/* Real-time Detection Preview Bar */}
          {detectedList.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Hasil Deteksi Kunci ({detectedList.length} Ditemukan):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">Format Terverifikasi</span>
              </div>
              <div className="space-y-1.5">
                {detectedList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-xs"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
                        {item.providerName}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] truncate">
                        {maskKey(item.key)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 hidden sm:inline">
                      {item.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-500">
              Format yang didukung: Raw Key, KEY=VALUE, atau daftar baris baru.
            </span>
            <button
              type="button"
              onClick={handleApplyDetectedKeys}
              disabled={detectedList.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simpan &amp; Aktifkan Kunci</span>
            </button>
          </div>
        </div>
      </div>

      {/* INVENTORY: APA AJA KEY YG DI BAWA (ACTIVE LOADED KEYS LIST) */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-500" />
              <span>Daftar Kunci yang Sedang Dibawa ({carriedKeysInventory.length})</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Rincian seluruh provider aktif, model default, dan status pengujian koneksi.
            </p>
          </div>

          {/* Quick Engine Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px] hidden sm:inline">
              Engine Utama:
            </span>
            <select
              value={activeProvider}
              onChange={(e) => handleSetPrimaryEngine(e.target.value as AIProviderId)}
              className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
            >
              <option value="gemini">Google Gemini (Default)</option>
              <option value="openai" disabled={!customKeys.openai?.trim()}>OpenAI (GPT-4o)</option>
              <option value="anthropic" disabled={!customKeys.anthropic?.trim()}>Anthropic Claude</option>
              <option value="deepseek" disabled={!customKeys.deepseek?.trim()}>DeepSeek AI</option>
              <option value="groq" disabled={!customKeys.groq?.trim()}>Groq Cloud</option>
              <option value="openrouter" disabled={!customKeys.openrouter?.trim()}>OpenRouter</option>
            </select>
          </div>
        </div>

        {/* Carried Keys Table/Cards */}
        <div className="space-y-2 pt-1">
          {carriedKeysInventory.map((item) => {
            const isShown = showMasked[item.providerId] || false;
            const isTesting = testingProvider === item.providerId;
            const testResult = testResults[item.providerId];
            const isPrimary = activeProvider === item.providerId;

            const providerMeta = PROVIDERS_CONFIG.find((p) => p.id === item.providerId);

            return (
              <div
                key={item.providerId}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isPrimary
                    ? 'bg-slate-50/80 dark:bg-slate-850 border-emerald-500/50'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left info */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {item.name}
                      </span>
                      {isPrimary && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                          Engine Utama
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.isCustom ? 'Custom API Key' : 'Injected Default'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                        {isShown ? item.keyValue : maskKey(item.keyValue)}
                      </span>
                      {item.isCustom && (
                        <button
                          type="button"
                          onClick={() => setShowMasked((prev) => ({ ...prev, [item.providerId]: !prev[item.providerId] }))}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                          title="Tampilkan / Sembunyikan"
                        >
                          {isShown ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Middle: Model selector if configurable */}
                  {providerMeta?.modelField && (
                    <div className="shrink-0 text-xs">
                      <select
                        value={item.selectedModel}
                        onChange={(e) =>
                          providerMeta.modelField && handleModelChange(providerMeta.modelField, e.target.value)
                        }
                        className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs"
                      >
                        {providerMeta.modelOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Right actions: Test connection, Set primary, Delete */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleTestConnection(item.providerId, item.keyValue, item.selectedModel)}
                      disabled={isTesting}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Menguji...' : 'Tes'}</span>
                    </button>

                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryEngine(item.providerId as AIProviderId)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Jadikan Utama
                      </button>
                    )}

                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey(item.keyField)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Hapus Kunci"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Test Connection result message */}
                {testResult && (
                  <div
                    className={`mt-2 p-2 rounded-lg text-[11px] flex items-center justify-between gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {testResult.success ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.latencyMs !== undefined && testResult.latencyMs > 0 && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/70">
                        {testResult.latencyMs} ms
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
