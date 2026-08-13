import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { RealtimeProvider } from './context/RealtimeContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RealtimeProvider>
      <App />
    </RealtimeProvider>
  </StrictMode>,
);
