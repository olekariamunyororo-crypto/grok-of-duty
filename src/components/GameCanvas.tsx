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

  // Keep refs in sync
  useEffect(() => {
    statsRef.current = stats
    setStatsRef.current = setStats
  }, [stats, setStats])

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return

    const canvas = canvasRef.current

    // Create PlayCanvas application
    const app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      keyboard: new pc.Keyboard(window),
      touch: new pc.TouchDevice(canvas),
    })

    appRef.current = app

    // Graphics settings for a solid FPS look
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW)
    app.setCanvasResolution(pc.RESOLUTION_AUTO)
    app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 2)

    // Start the application
    app.start()

    // Create camera + player
    const { camera, playerEntity, controller } = createPlayer(app)

    // Create the test level
    createLevel(app)

    // Create weapon (attached to camera)
    const weapon = createWeapon(app, camera)

    // Lighting
    const light = new pc.Entity('DirectionalLight')
    light.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 0.96, 0.9),
      intensity: 1.15,
      castShadows: true,
      shadowBias: 0.05,
      shadowDistance: 80,
      shadowResolution: 2048,
    })
    light.setEulerAngles(45, 30, 0)
    app.root.addChild(light)

    // Ambient
    app.scene.ambientLight = new pc.Color(0.18, 0.2, 0.24)

    // Fog for atmosphere
    app.scene.fog = pc.FOG_LINEAR
    app.scene.fogColor = new pc.Color(0.55, 0.62, 0.7)
    app.scene.fogStart = 25
    app.scene.fogEnd = 90

    // Sky
    app.scene.skyboxIntensity = 0.85

    // Input state
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

    // Pointer lock
    const requestPointerLock = () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock()
      }
    }

    canvas.addEventListener('click', requestPointerLock)

    // Keyboard
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': input.forward = true; break
        case 'KeyS': input.backward = true; break
        case 'KeyA': input.left = true; break
        case 'KeyD': input.right = true; break
        case 'ShiftLeft':
        case 'ShiftRight': input.sprint = true; break
        case 'Space': input.jump = true; break
        case 'KeyR': input.reload = true; break
        case 'Escape':
          document.exitPointerLock()
          onReturnToMenu()
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

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Mouse look + fire
    let yaw = 0
    let pitch = 0
    const sensitivity = 0.12

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      yaw -= e.movementX * sensitivity
      pitch -= e.movementY * sensitivity
      pitch = Math.max(-89, Math.min(89, pitch))
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) input.fire = true
    }

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) input.fire = false
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)

    // Update loop
    let lastFireTime = 0
    const fireRate = 0.1 // seconds between shots (600 RPM)

    app.on('update', (dt: number) => {
      if (!controller) return

      // Apply mouse look
      playerEntity.setEulerAngles(0, yaw, 0)
      camera.setLocalEulerAngles(pitch, 0, 0)

      // Movement
      controller.update(dt, input)

      // Weapon
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

    // Resize handler
    const onResize = () => {
      app.resizeCanvas()
    }
    window.addEventListener('resize', onResize)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('click', requestPointerLock)

      if (appRef.current) {
        appRef.current.destroy()
        appRef.current = null
      }
    }
  }, [onReturnToMenu])

  return (
    <div className="game-canvas-wrapper">
      <canvas ref={canvasRef} id="game-canvas" />
      {gameState === 'playing' && (
        <div className="click-to-play" id="pointer-hint">
          Click to capture mouse
        </div>
      )}
    </div>
  )
}
