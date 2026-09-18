import type { Stats } from '../App';

export default function HUD({ stats }: { stats: Stats }) {
  const hp = Math.max(0, Math.min(100, stats.health));
  const hpColor = hp > 60 ? '#d8c26a' : hp > 30 ? '#e8a33d' : '#c0392b';

  return (
    <div className="hud scanlines">
      {/* crosshair */}
      <div className="crosshair">
        <span className="ch ch-dot" />
        <span className="ch ch-up" />
        <span className="ch ch-down" />
        <span className="ch ch-left" />
        <span className="ch ch-right" />
      </div>

      {/* objective */}
      <div className="hud-topleft">
        <div className="hud-tag">GROK OF DUTY // RANGE LIVE</div>
        <div className="hud-objective">NEUTRALIZE ALL POP-UP TARGETS</div>
      </div>

      {/* kills */}
      <div className="hud-topright">
        <div className="hud-label">KILLS</div>
        <div className="hud-kills">{stats.kills}</div>
      </div>

      {/* health */}
      <div className="hud-bottomleft">
        <div className="hud-row">
          <span className="hud-label">HEALTH</span>
          <span className="hp-num">{Math.round(hp)}</span>
        </div>
        <div className="hp-bar">
          <div className="hp-fill" style={{ width: hp + '%', background: hpColor }} />
        </div>
      </div>

      {/* ammo */}
      <div className="hud-bottomright">
        <div className="ammo-row">
          <span className="ammo-cur">{stats.ammo}</span>
          <span className="ammo-res">/ {stats.reserve}</span>
        </div>
        <div className="hud-label ammo-cal">
          {stats.reloading ? 'RELOADING...' : '5.56 x 45 MM'}
        </div>
        <div className="hud-weapon">MK-18 CQB // AUTO</div>
      </div>
    </div>
  );
}
