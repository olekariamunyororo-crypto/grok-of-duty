import { useEffect, useRef } from 'react'
import * as pc from 'playcanvas'
import type { PlayerStats, GameState } from '../App'
import { createPlayer } from '../game/Player'
import { createLevel } from '../game/Level'
import { createWeapon } from '../game/Weapon'
import './GameCanvas.css'

interface GameCanvasProps {
  gameState: GameState
  stats: PlayerStats
  setStats: React.Dispatch<React.SetStateAction<PlayerStats>>
  onReturnToMenu: () => void
}

export default function GameCanvas({
  gameState,
  stats,
  setStats,
  onReturnToMenu,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<pc.Application | null>(null)
  const statsRef = useRef(stats)
  const setStatsRef = useRef(setStats)
  const onReturnRef = useRef(onReturnToMenu)

  useEffect(() => {
    statsRef.current = stats
    setStatsRef.current = setStats
    onReturnRef.current = onReturnToMenu
  }, [stats, setStats, onReturnToMenu])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || appRef.current) return

    let destroyed = false

    try {
      const app = new pc.Application(canvas, {
        mouse: new pc.Mouse(canvas),
        keyboard: new pc.Keyboard(window),
        touch: new pc.TouchDevice(canvas),
        graphicsDeviceOptions: {
          alpha: false,
          antialias: true,
          preferWebGl2: true,
        },
      })

      if (destroyed) {
        app.destroy()
        return
      }

      appRef.current = app

      app.setCanvasFillMode(pc.FILLMODE_NONE)
      app.setCanvasResolution(pc.RESOLUTION_AUTO)

      const resize = () => {
        const parent = canvas.parentElement
        if (!parent) return
        const w = parent.clientWidth
        const h = parent.clientHeight
        if (w > 0 && h > 0) {
          app.resizeCanvas(w, h)
        }
      }
      resize()

      if (app.graphicsDevice) {
        app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      }

      // Key light
      const light = new pc.Entity('DirectionalLight')
      light.addComponent('light', {
        type: 'directional',
        color: new pc.Color(1, 0.95, 0.88),
        intensity: 1.4,
        castShadows: true,
        shadowBias: 0.05,
        shadowDistance: 80,
        shadowResolution: 1024,
      })
      light.setEulerAngles(50, 30, 0)
      app.root.addChild(light)

      // Fill light so scene is not pure black
      const fill = new pc.Entity('FillLight')
      fill.addComponent('light', {
        type: 'directional',
        color: new pc.Color(0.55, 0.65, 0.8),
        intensity: 0.45,
        castShadows: false,
      })
      fill.setEulerAngles(-20, -60, 0)
      app.root.addChild(fill)

      app.scene.ambientLight = new pc.Color(0.22, 0.25, 0.3)
      app.scene.fog = pc.FOG_LINEAR
      app.scene.fogColor = new pc.Color(0.5, 0.58, 0.68)
      app.scene.fogStart = 30
      app.scene.fogEnd = 100

      const { camera, playerEntity, controller } = createPlayer(app)
      createLevel(app)
      const weapon = createWeapon(app, camera)

      const input = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        jump: false,
        fire: false,
        reload: false,
      }

      let yaw = 0
      let pitch = 0
      const sensitivity = 0.12

      const requestPointerLock = () => {
        if (document.pointerLockElement !== canvas) {
          canvas.requestPointerLock?.()
        }
      }

      const onKeyDown = (e: KeyboardEvent) => {
        switch (e.code) {
          case 'KeyW': input.forward = true; break
          case 'KeyS': input.backward = true; break
          case 'KeyA': input.left = true; break
          case 'KeyD': input.right = true; break
          case 'ShiftLeft':
          case 'ShiftRight': input.sprint = true; break
          case 'Space':
            e.preventDefault()
            input.jump = true
            break
          case 'KeyR': input.reload = true; break
          case 'Escape':
            document.exitPointerLock?.()
            onReturnRef.current()
            break
        }
      }

      const onKeyUp = (e: KeyboardEvent) => {
        switch (e.code) {
          case 'KeyW': input.forward = false; break
          case 'KeyS': input.backward = false; break
          case 'KeyA': input.left = false; break
          case 'KeyD': input.right = false; break
          case 'ShiftLeft':
          case 'ShiftRight': input.sprint = false; break
          case 'Space': input.jump = false; break
          case 'KeyR': input.reload = false; break
        }
      }

      const onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement !== canvas) return
        yaw -= e.movementX * sensitivity
        pitch -= e.movementY * sensitivity
        pitch = Math.max(-89, Math.min(89, pitch))
      }

      const onMouseDown = (e: MouseEvent) => {
        if (e.button === 0) {
          requestPointerLock()
          input.fire = true
        }
      }

      const onMouseUp = (e: MouseEvent) => {
        if (e.button === 0) input.fire = false
      }

      canvas.addEventListener('click', requestPointerLock)
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mousedown', onMouseDown)
      document.addEventListener('mouseup', onMouseUp)
      window.addEventListener('resize', resize)

      let lastFireTime = 0
      const fireRate = 0.1

      app.on('update', (dt: number) => {
        if (!controller) return
        playerEntity.setEulerAngles(0, yaw, 0)
        camera.setLocalEulerAngles(pitch, 0, 0)
        controller.update(dt, input)
        weapon.update(dt, input, {
          canFire: () => {
            const now = performance.now() / 1000
            if (now - lastFireTime < fireRate) return false
            if (statsRef.current.ammo <= 0) return false
            return true
          },
          onFire: () => {
            lastFireTime = performance.now() / 1000
            setStatsRef.current((prev) => ({
              ...prev,
              ammo: Math.max(0, prev.ammo - 1),
            }))
          },
          onReload: () => {
            setStatsRef.current((prev) => {
              if (prev.ammo === prev.maxAmmo || prev.reserveAmmo <= 0) return prev
              const needed = prev.maxAmmo - prev.ammo
              const taken = Math.min(needed, prev.reserveAmmo)
              return {
                ...prev,
                ammo: prev.ammo + taken,
                reserveAmmo: prev.reserveAmmo - taken,
              }
            })
          },
        })
      })

      app.start()
      resize()
      console.log('[Grok of Duty] PlayCanvas started')

      return () => {
        destroyed = true
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mousedown', onMouseDown)
        document.removeEventListener('mouseup', onMouseUp)
        window.removeEventListener('resize', resize)
        canvas.removeEventListener('click', requestPointerLock)
        if (appRef.current) {
          try { appRef.current.destroy() } catch (_) {}
          appRef.current = null
        }
      }
    } catch (err) {
      console.error('[Grok of Duty] Failed to start PlayCanvas:', err)
    }
  }, [])

  return (
    <div className="game-canvas-wrapper">
      <canvas ref={canvasRef} id="game-canvas" tabIndex={0} />
      {gameState === 'playing' && (
        <div className="click-to-play" id="pointer-hint">
          Click to look around · WASD move · Left click fire
        </div>
      )}
    </div>
  )
}
