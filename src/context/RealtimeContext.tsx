import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

interface RealtimeNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'update';
  timestamp: string;
}

interface RealtimeContextType {
  isConnected: boolean;
  onlineUsers: number;
  latencyMs: number;
  notification: RealtimeNotification | null;
  dismissNotification: () => void;
  sendRealtimeSync: (type: string, payload: any) => void;
  onRealtimeMessage: (handler: (data: any) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  onlineUsers: 1,
  latencyMs: 0,
  notification: null,
  dismissNotification: () => {},
  sendRealtimeSync: () => {},
  onRealtimeMessage: () => () => {},
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [latencyMs, setLatencyMs] = useState(0);
  const [notification, setNotification] = useState<RealtimeNotification | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<(data: any) => void>>(new Set());
  const pingTimerRef = useRef<any>(null);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'update' = 'info') => {
    const notif: RealtimeNotification = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setNotification(notif);

    setTimeout(() => {
      setNotification((current) => (current?.id === notif.id ? null : current));
    }, 4500);
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);

      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Measure initial latency
        const pingTime = Date.now();
        ws.send(JSON.stringify({ type: 'PING', timestamp: pingTime }));

        // Periodic ping every 10s
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
          }
        }, 10000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'PONG') {
            const rtt = Date.now() - (data.clientTimestamp || Date.now());
            setLatencyMs(rtt);
            return;
          }

          if (data.type === 'INIT_PRESENCE' || data.type === 'PRESENCE_CHANGE') {
            if (data.onlineUsers !== undefined) {
              setOnlineUsers(data.onlineUsers);
            }
            return;
          }

          // Handle real-time user notification toasts
          if (data.type === 'PROMPT_CREATED') {
            showToast(`Live Sync: Prompt baru "${data.title || 'Untitled'}" dibuat di tab/sesi lain!`, 'success');
          } else if (data.type === 'PROMPT_UPDATED') {
            showToast(`Live Sync: Prompt "${data.title || 'Untitled'}" diperbarui!`, 'update');
          } else if (data.type === 'PROMPT_DELETED') {
            showToast(`Live Sync: Prompt dihapus dari workspace!`, 'info');
          } else if (data.type === 'COLLECTION_CREATED') {
            showToast(`Live Sync: Collection baru "${data.name || ''}" ditambahkan!`, 'success');
          }

          // Dispatch to subscribers
          listenersRef.current.forEach((listener) => listener(data));
        } catch (err) {
          console.error('Realtime context message parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearInterval(pingTimerRef.current);
        // Auto reconnect after 3 seconds
        setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.warn('Realtime WebSocket warning:', err);
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      setIsConnected(false);
    }
  }, [showToast]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      clearInterval(pingTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const sendRealtimeSync = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload, timestamp: Date.now() }));
    }
  }, []);

  const onRealtimeMessage = useCallback((handler: (data: any) => void) => {
    listenersRef.current.add(handler);
    return () => {
      listenersRef.current.delete(handler);
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        onlineUsers,
        latencyMs,
        notification,
        dismissNotification,
        sendRealtimeSync,
        onRealtimeMessage,
      }}
    >
      {children}

      {/* Floating Realtime Toast Banner */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-300 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight truncate">
                {notification.message}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                {notification.timestamp}
              </p>
            </div>
          </div>
          <button
            onClick={dismissNotification}
            className="text-slate-400 hover:text-white dark:hover:text-slate-900 text-xs font-bold shrink-0 px-1"
          >
            X
          </button>
        </div>
      )}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
