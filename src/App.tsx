import { useState, useCallback } from 'react'
import GameCanvas from './components/GameCanvas'
import HUD from './components/HUD'
import MainMenu from './components/MainMenu'
import './App.css'

export type GameState = 'menu' | 'playing' | 'paused'

export interface PlayerStats {
  health: number
  maxHealth: number
  ammo: number
  maxAmmo: number
  reserveAmmo: number
  kills: number
}

function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    reserveAmmo: 90,
    kills: 0,
  })

  const startGame = useCallback(() => {
    setGameState('playing')
    setStats({
      health: 100,
      maxHealth: 100,
      ammo: 30,
      maxAmmo: 30,
      reserveAmmo: 90,
      kills: 0,
    })
  }, [])

  const returnToMenu = useCallback(() => {
    setGameState('menu')
  }, [])

  return (
    <div className="app">
      {gameState === 'menu' && <MainMenu onStart={startGame} />}
      
      {(gameState === 'playing' || gameState === 'paused') && (
        <>
          <GameCanvas
            gameState={gameState}
            stats={stats}
            setStats={setStats}
            onReturnToMenu={returnToMenu}
          />
          <HUD stats={stats} gameState={gameState} />
        </>
      )}
    </div>
  )
}

export default App
