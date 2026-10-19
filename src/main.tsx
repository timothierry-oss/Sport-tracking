import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './theme/theme.css';

registerSW({ immediate: true });

// Demande au navigateur de ne jamais effacer les données locales pour libérer de la place.
navigator.storage?.persist?.().catch(() => {});

// En local, on part d'un jeu de données de démo pour voir le rendu global.
if (import.meta.env.DEV) import('./db/demo').then((m) => m.seedDemoOnce());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
