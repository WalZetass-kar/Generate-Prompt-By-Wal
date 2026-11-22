import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { RealtimeProvider } from './context/RealtimeContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RealtimeProvider>
          <App />
        </RealtimeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);

