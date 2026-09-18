import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Note: StrictMode intentionally disabled — it double-mounts effects and
// destroys the PlayCanvas Application before it can render.
createRoot(document.getElementById('root')!).render(<App />)
