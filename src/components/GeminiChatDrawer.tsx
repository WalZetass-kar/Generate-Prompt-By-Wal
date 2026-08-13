import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  BrainCircuit,
  Copy,
  Check,
  RotateCcw,
  Maximize2,
  Minimize2,
  Lightbulb,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isThinking?: boolean;
}

interface GeminiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPromptToGenerator?: (prompt: string) => void;
}

export const GeminiChatDrawer: React.FC<GeminiChatDrawerProps> = ({
  isOpen,
  onClose,
  onApplyPromptToGenerator,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'Halo! Saya ZetassAI powered by Gemini. Ada yang bisa saya bantu untuk merancang Master Prompt, menyusun PRD, atau mengoptimalkan arsitektur sistem Anda hari ini?',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enableThinking, setEnableThinking] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      // Map for server endpoint
      const payload = {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        enableThinking,
      };

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          isThinking: enableThinking,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Response invalid');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Maaf, terjadi kesalahan saat menghubungi Gemini AI: ${err.message || 'Error'}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'Sesi chat telah dibersihkan. Silakan ajukan pertanyaan atau instruksi baru untuk ZetassAI.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop Overlay - click outside to close */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity cursor-pointer"
        onClick={onClose}
        aria-label="Tutup Chat"
      />

      {/* Floating Chat Box Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed z-50 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-all duration-300
          inset-x-2 bottom-2 top-14 sm:top-auto sm:inset-x-auto sm:bottom-4 sm:right-4
          ${
            isExpanded
              ? 'sm:w-[680px] sm:h-[82vh] sm:max-h-[780px]'
              : 'sm:w-[440px] sm:h-[580px]'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md rounded-t-2xl shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-heading font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                <span className="truncate">ZetassAI</span>
                <span className="hidden xs:inline-block px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-semibold rounded-full border border-emerald-500/20 shrink-0">
                  Online
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Gemini 3.6 Flash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Thinking Mode Toggle */}
            <button
              type="button"
              onClick={() => setEnableThinking(!enableThinking)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                enableThinking
                  ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
              title="Sertakan Deep Reasoning & Thinking Mode Gemini"
            >
              <BrainCircuit className={`w-3 h-3 ${enableThinking ? 'text-purple-600 dark:text-purple-400 animate-pulse' : ''}`} />
              <span className="hidden xs:inline">Thinking</span>
            </button>

            {/* Expand Toggle (Desktop Only) */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:flex p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title={isExpanded ? 'Kecilkan Window' : 'Perbesar Window'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Bersihkan Percakapan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 sm:p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
              title="Tutup Chat (Esc)"
              aria-label="Tutup Chat"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3 space-y-1.5 shadow-2xs ${
                m.role === 'user'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-tr-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/40 dark:border-slate-700/40 pb-1 text-[10px] opacity-70">
                <span className="font-semibold flex items-center gap-1">
                  {m.role === 'user' ? 'Anda' : 'Gemini AI'}
                  {m.isThinking && (
                    <span className="text-purple-500 font-bold flex items-center gap-0.5">
                      <BrainCircuit className="w-2.5 h-2.5" /> Deep Thinking
                    </span>
                  )}
                </span>
                <span>{m.timestamp}</span>
              </div>

              <div className="whitespace-pre-wrap leading-relaxed font-normal text-[11px] sm:text-xs">
                {m.content}
              </div>

              {m.role === 'assistant' && (
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(m.id, m.content)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="Copy response"
                  >
                    {copiedId === m.id ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  {onApplyPromptToGenerator && (
                    <button
                      type="button"
                      onClick={() => onApplyPromptToGenerator(m.content)}
                      className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 text-[10px] font-semibold flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
                      title="Gunakan sebagai prompt di Generator"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                      <span>Gunakan Prompt</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-slate-400 dark:text-slate-500 text-xs italic">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center animate-bounce">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>
              {enableThinking ? 'Gemini sedang berpikir mendalam...' : 'Mengetik jawaban...'}
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-amber-500" /> Ide:
        </span>
        <button
          type="button"
          onClick={() => handleSendMessage('Buatkan saya PRD lengkap untuk sistem B2B SaaS Multi-Tenant')}
          className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 shrink-0 transition-all"
        >
          PRD SaaS B2B
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage('Bagaimana cara membuat Master Prompt AI yang tahan halusinasi?')}
          className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 shrink-0 transition-all"
        >
          Cegah Halusinasi AI
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage('Buatkan prompt koding Clean Architecture Laravel 11')}
          className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 shrink-0 transition-all"
        >
          Prompt Clean Architecture
        </button>
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-b-2xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanyakan sesuatu pada Gemini Co-Pilot..."
          className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
    </>
  );
};
