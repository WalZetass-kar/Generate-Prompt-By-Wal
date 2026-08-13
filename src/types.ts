export type ViewMode =
  | 'dashboard'
  | 'generate'
  | 'library'
  | 'collections'
  | 'playground'
  | 'history'
  | 'favorites'
  | 'analytics'
  | 'settings';

export interface PromptVersion {
  id: string;
  versionNumber: number;
  content: string;
  note: string;
  createdAt: string;
}

export interface ScoreChecklistItem {
  label: string;
  passed: boolean;
  note: string;
}

export interface PromptScoreDetail {
  score: number;
  rating: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  checklist: ScoreChecklistItem[];
}

export interface PromptItem {
  id: string;
  title: string;
  category: string;
  subCategory: string;
  aiModel: string;
  language: string;
  programmingLanguage: string;
  framework: string;
  database: string;
  platform: string;
  stylePrompt: string;
  tone: string;
  outputLanguage: string;
  creativity: string;
  length: string;
  targetAudience: string;
  description: string;
  additionalReqs: string;
  negativePrompt: string;
  expectedOutput: string;
  reference: string;
  content: string;
  isFavorite: boolean;
  isPinned: boolean;
  collectionId: string | null;
  designTheme?: string;
  tags: string[];
  score: number | null;
  scoreDetail: PromptScoreDetail | null;
  versions: PromptVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  iconName: string;
  createdAt: string;
}

export interface PlaygroundItem {
  id: string;
  title: string;
  model: string;
  promptText: string;
  sampleInput: string;
  output: string;
  loading: boolean;
  executionTimeMs: number | null;
  tokens: number | null;
  isWinner: boolean;
}

export interface HistoryLog {
  id: string;
  promptId?: string;
  promptTitle: string;
  action: 'create' | 'update' | 'optimize' | 'translate' | 'restore';
  timestamp: string;
  details: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'Indonesian' | 'English';
  fontSize: number;
  autoSave: boolean;
  defaultModel: string;
  wordWrap: boolean;
  apiKey: string;
}

export interface FormState {
  title: string;
  category: string;
  subCategory: string;
  aiModel: string;
  language: string;
  programmingLanguage: string;
  framework: string;
  database: string;
  platform: string;
  stylePrompt: string;
  designTheme?: string;
  tone: string;
  outputLanguage: string;
  creativity: string;
  length: string;
  targetAudience: string;
  description: string;
  additionalReqs: string;
  negativePrompt: string;
  expectedOutput: string;
  reference: string;
}
