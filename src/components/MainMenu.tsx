interface MainMenuProps {
  onDeploy: () => void;
}

export default function MainMenu({ onDeploy }: MainMenuProps) {
  return (
    <div className="menu scanlines">
      <div className="menu-grid" />
      <div className="menu-inner">
        <div className="menu-kicker">// TRAINING OP: NIGHTJAR — CLEARANCE GRANTED //</div>
        <h1 className="menu-title">
          GROK<span className="title-accent"> OF </span>DUTY
        </h1>
        <div className="menu-sub">MODERN WARFARE&nbsp;&nbsp;//&nbsp;&nbsp;SINGLE PLAYER</div>
        <div className="menu-divider" />
        <div className="menu-buttons">
          <button className="btn btn-deploy" onClick={onDeploy}>
            &#9654; DEPLOY
          </button>
          <button className="btn" disabled>
            LOADOUT
          </button>
          <button className="btn" disabled>
            SETTINGS
          </button>
        </div>
        <div className="menu-controls">
          <span>WASD — MOVE</span>
          <span>SHIFT — SPRINT</span>
          <span>SPACE — JUMP</span>
          <span>MOUSE — AIM</span>
          <span>LMB — FIRE</span>
          <span>R — RELOAD</span>
          <span>ESC — MENU</span>
        </div>
      </div>
      <div className="menu-footer">GROK OF DUTY &middot; BUILD 1.0.0 &middot; LOCAL SIMULATION — NO NETWORK REQUIRED</div>
    </div>
  );
}
