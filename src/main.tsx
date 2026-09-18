import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// NOTE: intentionally no <React.StrictMode> here — StrictMode double-invokes
// effects in development, which would create/destroy the PlayCanvas
// Application twice and break the game canvas.
createRoot(document.getElementById('root')!).render(<App />);
