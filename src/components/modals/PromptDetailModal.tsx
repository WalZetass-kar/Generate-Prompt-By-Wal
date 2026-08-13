import React, { useState } from 'react';
import { X, Copy, Check, Star, Zap, Globe, ShieldCheck, Download, Save } from 'lucide-react';
import { PromptItem } from '../../types';

interface PromptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: PromptItem | null;
  onUpdatePrompt: (updatedPrompt: PromptItem) => void;
  onOpenScoreModal: (promptText: string, title: string) => void;
  onOpenOptimizerModal: (promptText: string) => void;
  onOpenTranslatorModal: (promptText: string) => void;
}

export const PromptDetailModal: React.FC<PromptDetailModalProps> = ({
  isOpen,
  onClose,
  prompt,
  onUpdatePrompt,
  onOpenScoreModal,
  onOpenOptimizerModal,
  onOpenTranslatorModal,
}) => {
  if (!isOpen || !prompt) return null;

  const [content, setContent] = useState(prompt.content);
  const [title, setTitle] = useState(prompt.title);
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdatePrompt({
      ...prompt,
      title,
      content,
      updatedAt: new Date().toISOString(),
    });
    setSaveMsg('Perubahan tersimpan!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleExportMarkdown = () => {
    const mdContent = `# ${title}

- **Category:** ${prompt.category}
- **AI Model:** ${prompt.aiModel}
- **Framework:** ${prompt.framework || 'Standard'}
- **Score:** ${prompt.score || 95}/100
- **Tags:** ${prompt.tags?.join(', ') || 'None'}

---

## Content

${content}
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeFilename = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'prompt';
    link.href = url;
    link.setAttribute('download', `${safeFilename}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
              {prompt.category}
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm font-bold text-slate-900 dark:text-slate-100 bg-transparent border-none focus:outline-none truncate min-w-0"
            />
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
              {prompt.aiModel}
            </span>
            {prompt.framework && (
              <span className="font-mono text-[10px] bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 px-1.5 py-0.5 rounded">
                {prompt.framework}
              </span>
            )}
            {prompt.designTheme && (
              <span className="font-mono text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-200/50 dark:border-purple-800/40 truncate max-w-[150px]">
                {prompt.designTheme}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenScoreModal(content, title)}
              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-100 transition-colors"
              title="Score Audit"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Score {prompt.score || 95}</span>
            </button>

            <button
              onClick={() => onOpenOptimizerModal(content)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Optimize"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </button>

            <button
              onClick={() => onOpenTranslatorModal(content)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Translate"
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
            </button>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleExportMarkdown}
              id="export-markdown-btn"
              className="px-2 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-[11px] font-medium transition-colors border border-slate-200 dark:border-slate-700/80"
              title="Export to Markdown (.md)"
            >
              <Download className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="hidden sm:inline">Export MD</span>
            </button>

            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Editan</span>
            </button>
          </div>
        </div>

        {saveMsg && (
          <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{saveMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1">
          <textarea
            rows={15}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 rounded-xl vscode-editor-bg text-xs font-mono leading-relaxed focus:outline-none border border-slate-800"
          />
        </div>
      </div>
    </div>
  );
};
