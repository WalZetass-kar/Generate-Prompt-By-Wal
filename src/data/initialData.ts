import { Collection, PromptItem, HistoryLog, UserSettings } from '../types';

/**
 * Workspace starts completely empty (zero pre-filled sample items).
 * Built-in prompt & PRD templates remain available in their dedicated template libraries.
 */
export const INITIAL_COLLECTIONS: Collection[] = [];

export const INITIAL_PROMPTS: PromptItem[] = [];

export const INITIAL_HISTORY: HistoryLog[] = [];

/**
 * Legacy auto-seeded sample IDs from earlier versions, used once to clean
 * old pre-populated demo items out of existing Firebase user workspaces.
 */
export const LEGACY_SEEDED_IDS = {
  prompts: ['prompt-1', 'prompt-2', 'prompt-3'],
  collections: ['col-laravel', 'col-flutter', 'col-nextjs', 'col-cybersec', 'col-portfolio'],
  history: ['hist-1', 'hist-2', 'hist-3'],
} as const;

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  language: 'Indonesian',
  fontSize: 14,
  autoSave: true,
  defaultModel: 'gemini-4-hydrogen',
  wordWrap: true,
  apiKey: '',
  activeProvider: 'gemini',
  botProvider: 'gemini',
  customKeys: {
    openai: '',
    anthropic: '',
    deepseek: '',
    groq: '',
    openrouter: '',
    customGemini: '',
    openaiModel: 'gpt-4o',
    anthropicModel: 'claude-3-5-sonnet-20241022',
    deepseekModel: 'deepseek-chat',
    groqModel: 'llama-3.3-70b-versatile',
    openrouterModel: 'meta-llama/llama-3.3-70b-instruct',
    customBaseUrl: '',
  },
};
