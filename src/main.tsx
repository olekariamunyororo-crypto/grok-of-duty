import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// vConsole — in-browser debug panel (logs, network, elements, storage)
// Active in Vite dev, or when URL has ?vconsole=1 (useful on mobile / production builds)
const enableVConsole =
  import.meta.env.DEV ||
  new URLSearchParams(window.location.search).get('vconsole') === '1';

if (enableVConsole) {
  void import('vconsole').then(({ default: VConsole }) => {
    // eslint-disable-next-line no-new
    new VConsole({
      theme: 'dark',
      defaultPlugins: ['system', 'network', 'element', 'storage'],
      maxLogNumber: 2000,
    });
    console.log('[GROK OF DUTY] vConsole ready');
  });
}

// NOTE: intentionally no <React.StrictMode> here — StrictMode double-invokes
// effects in development, which would create/destroy the PlayCanvas
// Application twice and break the game canvas.
createRoot(document.getElementById('root')!).render(<App />);
