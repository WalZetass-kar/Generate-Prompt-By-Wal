import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2, X, AlertCircle, Volume2 } from 'lucide-react';
import { getCustomApiKeys } from '../lib/storage';

interface VoiceAutoFillButtonProps {
  onTranscribed: (transcript: string, shouldAutoFill: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  defaultAutoFill?: boolean;
  accentColor?: 'indigo' | 'emerald';
  placeholderHint?: string;
}

function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const VoiceAutoFillButton: React.FC<VoiceAutoFillButtonProps> = ({
  onTranscribed,
  disabled = false,
  compact = false,
  defaultAutoFill = true,
  accentColor = 'indigo',
  placeholderHint = 'Bicara langsung untuk mengisi ide tanpa mengetik',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [autoFillOnDone, setAutoFillOnDone] = useState(defaultAutoFill);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const cleanupMedia = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = () => reject(new Error('Gagal membaca rekaman audio.'));
      reader.readAsDataURL(blob);
    });

  const handleStartRecording = async () => {
    setErrorMsg(null);
    cancelledRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Browser Anda tidak mendukung akses mikrofon (MediaRecorder API).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const wasCancelled = cancelledRef.current;
        const activeMime = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
        const recordedChunks = [...chunksRef.current];
        chunksRef.current = [];
        cleanupMedia();
        setIsRecording(false);

        if (wasCancelled) {
          return;
        }

        if (recordedChunks.length === 0) {
          setErrorMsg('Tidak ada suara yang terekam. Coba bicara lebih dekat ke mikrofon.');
          return;
        }

        const audioBlob = new Blob(recordedChunks, { type: activeMime });
        if (audioBlob.size < 400) {
          setErrorMsg('Rekaman terlalu singkat. Coba ucapkan ide Anda dengan jelas.');
          return;
        }

        setIsTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(audioBlob);
          const res = await fetch('/api/gemini/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              mimeType: activeMime,
              customKeys: getCustomApiKeys(),
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Gagal mentranskrip suara Anda.');
          }

          const transcript = String(data.transcript || '').trim();
          if (!transcript) {
            setErrorMsg('Suara tidak terbaca jelas. Silakan rekam ulang.');
            return;
          }

          onTranscribed(transcript, autoFillOnDone);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Gagal menghubungi layanan transkripsi suara.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setElapsedSec(0);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => {
          if (prev >= 119) {
            // Auto-stop at 2 minutes to keep payload lean
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      cleanupMedia();
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMsg('Izin mikrofon ditolak. Aktifkan izin mikrofon di browser Anda lalu coba lagi.');
      } else if (err?.name === 'NotFoundError') {
        setErrorMsg('Mikrofon tidak ditemukan pada perangkat ini.');
      } else {
        setErrorMsg(err?.message || 'Gagal mengakses mikrofon.');
      }
    }
  };

  const handleStopAndTranscribe = () => {
    cancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelRecording = () => {
    cancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupMedia();
      setIsRecording(false);
    }
  };

  const accentBtnClasses =
    accentColor === 'emerald'
      ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center flex-wrap gap-2">
        {!isRecording && !isTranscribing && (
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={disabled}
            title={placeholderHint}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer ${accentBtnClasses}`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{compact ? 'Suara' : 'Bicara / Voice Input'}</span>
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-[11px] font-bold text-red-700 dark:text-red-300 font-mono tabular-nums">
              Merekam {formatDuration(elapsedSec)}
            </span>
            <button
              type="button"
              onClick={handleStopAndTranscribe}
              className="ml-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Selesai &amp; Isi</span>
            </button>
            <button
              type="button"
              onClick={handleCancelRecording}
              className="p-1 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
              title="Batalkan rekaman"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isTranscribing && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Mentranskrip suara via Gemini 3.5 Transcribe...</span>
          </div>
        )}

        {!compact && (
          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoFillOnDone}
              onChange={(e) => setAutoFillOnDone(e.target.checked)}
              disabled={isRecording || isTranscribing}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <Volume2 className="w-3 h-3 text-slate-400" />
            <span>Auto-Fill otomatis setelah bicara</span>
          </label>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-start justify-between gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-[11px] text-red-700 dark:text-red-300">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
