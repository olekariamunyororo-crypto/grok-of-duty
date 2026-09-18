import type { PlayerStats, GameState } from '../App'
import './HUD.css'

interface HUDProps {
  stats: PlayerStats
  gameState: GameState
}

export default function HUD({ stats, gameState }: HUDProps) {
  if (gameState !== 'playing') return null

  const healthPercent = (stats.health / stats.maxHealth) * 100

  return (
    <div className="hud">
      {/* Crosshair */}
      <div className="crosshair">
        <div className="ch-h" />
        <div className="ch-v" />
        <div className="ch-dot" />
      </div>

      {/* Bottom left - Health */}
      <div className="hud-bottom-left">
        <div className="health-container">
          <div className="health-label">HEALTH</div>
          <div className="health-bar">
            <div
              className="health-fill"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
          <div className="health-value">{Math.ceil(stats.health)}</div>
        </div>
      </div>

      {/* Bottom right - Ammo */}
      <div className="hud-bottom-right">
        <div className="ammo-container">
          <div className="ammo-current">{stats.ammo}</div>
          <div className="ammo-divider">/</div>
          <div className="ammo-reserve">{stats.reserveAmmo}</div>
          <div className="ammo-label">5.56mm</div>
        </div>
      </div>

      {/* Top right - Kills */}
      <div className="hud-top-right">
        <div className="kills">
          <span className="kills-label">KILLS</span>
          <span className="kills-value">{stats.kills}</span>
        </div>
      </div>
    </div>
  )
}
