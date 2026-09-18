import './MainMenu.css'

interface MainMenuProps {
  onStart: () => void
}

export default function MainMenu({ onStart }: MainMenuProps) {
  return (
    <div className="main-menu">
      <div className="menu-content">
        <div className="logo">
          <h1>GROK OF DUTY</h1>
          <p className="subtitle">MODERN WARFARE // SINGLE PLAYER</p>
        </div>

        <div className="menu-buttons">
          <button className="menu-btn primary" onClick={onStart}>
            DEPLOY
          </button>
          <button className="menu-btn" disabled>
            LOADOUT (Coming Soon)
          </button>
          <button className="menu-btn" disabled>
            SETTINGS
          </button>
        </div>

        <div className="footer">
          <p>WASD — Move · Mouse — Look · Left Click — Fire · R — Reload · Shift — Sprint</p>
          <p className="version">v0.1.0 — Built with React + PlayCanvas</p>
        </div>
      </div>

      <div className="scanlines"></div>
    </div>
  )
}
