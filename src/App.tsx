import { useCallback, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MainMenu from './components/MainMenu';

export type Phase = 'menu' | 'playing';

export interface Stats {
  health: number;
  ammo: number;
  reserve: number;
  kills: number;
  reloading: boolean;
}

const INITIAL_STATS: Stats = {
  health: 100,
  ammo: 30,
  reserve: 90,
  kills: 0,
  reloading: false,
};

export default function App() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [locked, setLocked] = useState(false);
  // runId forces a brand-new GameCanvas (fresh PlayCanvas app) on every deploy
  const [runId, setRunId] = useState(0);

  const handleDeploy = useCallback(() => {
    setStats(INITIAL_STATS);
    setLocked(false);
    setRunId((id) => id + 1);
    setPhase('playing');
  }, []);

  const handleExit = useCallback(() => setPhase('menu'), []);
  const handleLockChange = useCallback((l: boolean) => setLocked(l), []);
  const handleStats = useCallback((s: Stats) => setStats(s), []);

  return (
    <div className="app-root">
      {phase === 'playing' ? (
        <div className="game-root">
          <GameCanvas
            key={runId}
            onStats={handleStats}
            onExit={handleExit}
            onLockChange={handleLockChange}
          />
          <HUD stats={stats} />
          {!locked && (
            <div className="engage-overlay">
              <div className="engage-box">
                <div className="engage-title">CLICK TO ENGAGE</div>
                <div className="engage-keys">
                  WASD MOVE &nbsp;&middot;&nbsp; SHIFT SPRINT &nbsp;&middot;&nbsp; SPACE JUMP
                  &nbsp;&middot;&nbsp; LMB FIRE &nbsp;&middot;&nbsp; R RELOAD
                  &nbsp;&middot;&nbsp; ESC MENU
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <MainMenu onDeploy={handleDeploy} />
      )}
    </div>
  );
}
