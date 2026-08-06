import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Prevención de cuelgues globales por rechazos de promesas de bases de datos no capturadas
window.addEventListener('unhandledrejection', (event) => {
  console.warn('[Global] Promesa no capturada ignorada para prevenir pantalla blanca:', event.reason);
  event.preventDefault();
});

// Register Service Worker for Android & iOS PWA installation support
if ('serviceWorker' in navigator && (process.env.NODE_ENV === 'production' || (import.meta as any).env?.PROD)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('PWA Service Worker registrado con éxito:', reg.scope);
      })
      .catch((err) => {
        console.warn('Fallo al registrar PWA Service Worker:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

