import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@styles/main.scss';
import { BackendProvider } from './providers';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BackendProvider>
      <App />
    </BackendProvider>
  </StrictMode>
);
