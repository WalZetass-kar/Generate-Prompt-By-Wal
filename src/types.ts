export type ViewMode =
  | 'dashboard'
  | 'generate'
  | 'prd'
  | 'media-studio'
  | 'library'
  | 'collections'
  | 'playground'
  | 'history'
  | 'favorites'
  | 'analytics'
  | 'settings';

export interface PRDFormState {
  productTitle: string;
  tagline: string;
  category: string;
  targetAudience: string;
  problemStatement: string;
  keyFeatures: string;
  techStack: string;
  targetPlatform: string;
  integrations: string;
  releasePhase: string;
  nonFunctionalReqs: string;
  prdFormat: string;
  language: string;
}

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

export interface QualityControlMeta {
  overallScore: number;
  rating: string;
  requirementCoverage: number;
  clarityScore: number;
  specificityScore: number;
  consistencyScore: number;
  contextAccuracy: number;
  actionabilityScore: number;
  testabilityScore: number;
  completenessScore?: number;
  constraintsScore?: number;
  outputDefinitionScore?: number;
  ambiguityResolutionScore?: number;
  dimensions?: {
    clarity: number;
    completeness: number;
    specificity: number;
    consistency: number;
    context: number;
    constraints: number;
    outputDefinition: number;
    ambiguityResolution: number;
  };
  ambiguitiesResolved: string[];
  assumptions?: string[];
  clarificationsNeeded?: string[];
  qualityHighlights: string[];
  refinementsApplied?: string[];
  taskCategoryDetected: string;
  detectedDomain?: string;
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
  qualityControl?: QualityControlMeta | null;
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

export type AIProviderId = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'openrouter';

export interface CustomAIKeys {
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

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'Indonesian' | 'English';
  fontSize: number;
  autoSave: boolean;
  defaultModel: string;
  wordWrap: boolean;
  apiKey: string;
  activeProvider?: AIProviderId;
  botProvider?: AIProviderId;
  customKeys?: CustomAIKeys;
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

export interface GeminiUsageBreakdown {
  generator: number;
  chat: number;
  optimizer: number;
  wizard: number;
  prd: number;
  playground: number;
  translate: number;
  score: number;
  image: number;
  video: number;
}

export interface GeneratedImageItem {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  stylePreset: string;
  imageUrl: string;
  createdAt: string;
  model: string;
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface GeneratedVideoItem {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  cameraMovement?: string;
  lightingStyle?: string;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  videoUrl?: string;
  thumbnailUrl?: string;
  operationName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  statusMessage?: string;
  createdAt: string;
  model: string;
}

export interface GeminiRequestLog {
  id: string;
  action: string;
  model: string;
  timestamp: string;
  status: 'success' | 'quota_exceeded' | 'error';
  tokensEstimated?: number;
}

export interface GeminiUsageStats {
  requestsToday: number;
  dailyLimit: number;
  remainingRequests: number;
  percentUsed: number;
  requestsPerMinute: number;
  rpmLimit: number;
  lastResetDate: string;
  breakdown: GeminiUsageBreakdown;
  recentLogs: GeminiRequestLog[];
  quotaAlert80Percent: boolean;
}
