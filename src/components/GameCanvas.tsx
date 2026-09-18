import { useEffect, useRef } from 'react';
import * as pc from 'playcanvas';
import { Level } from '../game/Level';
import { Player, type InputState } from '../game/Player';
import { Weapon } from '../game/Weapon';
import type { Stats } from '../App';

interface GameCanvasProps {
  onStats: (stats: Stats) => void;
  onExit: () => void;
  onLockChange: (locked: boolean) => void;
}

interface GameCallbacks {
  onStats: (stats: Stats) => void;
  onExit: () => void;
  onLockChange: (locked: boolean) => void;
}

/**
 * Owns the PlayCanvas application, all input state and the frame loop
 * for a single run. Fully torn down on unmount.
 */
class Game {
  private app: pc.Application;
  private canvas: HTMLCanvasElement;
  private callbacks: GameCallbacks;

  private level!: Level;
  private player!: Player;
  private weapon!: Weapon;
  private camComponent!: pc.CameraComponent;

  private keys: Record<string, boolean> = {};
  private lookDx = 0;
  private lookDy = 0;
  private kills = 0;
  private fov = 74;
  private lastStatsKey = '';

  constructor(app: pc.Application, canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.app = app;
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.setupScene();
    this.bindInput();
    this.app.on('update', this.update, this);
  }

  // ------------------------------------------------------------------ scene

  private setupScene() {
    const scene = this.app.scene;

    // atmosphere: light linear fog + gentle ambient so nothing is pitch black
    const fogColor = pc.Color.fromString('#aeb8bf');
    scene.fog = pc.FOG_LINEAR;
    scene.fogColor = fogColor;
    scene.fogStart = 55;
    scene.fogEnd = 200;
    scene.ambientLight = pc.Color.fromString('#565e66');
    scene.toneMapping = pc.TONEMAP_LINEAR;
    scene.exposure = 1;

    // main camera — light blue-grey clear color, never black
    const camera = new pc.Entity('Camera');
    camera.addComponent('camera', {
      fov: 74,
      nearClip: 0.08,
      farClip: 320,
      clearColor: fogColor.clone(),
    });
    this.app.root.addChild(camera);
    this.camComponent = camera.camera!;

    // dedicated layer + camera for the weapon viewmodel: renders after the
    // world with a depth-only clear, so the rifle never clips through walls
    const weaponLayer = new pc.Layer({ name: 'WeaponLayer' });
    scene.layers.push(weaponLayer);
    const worldId = pc.LAYERID_WORLD;

    // key light (sun) with shadows
    const sun = new pc.Entity('Sun');
    sun.addComponent('light', {
      type: 'directional',
      color: pc.Color.fromString('#fff1d6'),
      intensity: 1.4,
      castShadows: true,
      shadowDistance: 100,
      shadowResolution: 2048,
    });
    sun.setEulerAngles(-52, 38, 0);
    this.app.root.addChild(sun);

    // soft cool fill light from the opposite side
    const fill = new pc.Entity('FillLight');
    fill.addComponent('light', {
      type: 'directional',
      color: pc.Color.fromString('#8fa7c4'),
      intensity: 0.4,
    });
    fill.setEulerAngles(-35, -135, 0);
    this.app.root.addChild(fill);

    // both lights must also reach the weapon layer so the viewmodel is lit
    sun.light!.layers = [worldId, weaponLayer.id];
    fill.light!.layers = [worldId, weaponLayer.id];

    // viewmodel camera (child of the main camera, higher render priority)
    const weaponCam = new pc.Entity('WeaponCamera');
    weaponCam.addComponent('camera', {
      priority: 10,
      fov: 60,
      nearClip: 0.01,
      farClip: 5,
      clearColorBuffer: false,
      clearDepthBuffer: true,
      layers: [weaponLayer.id],
    });
    camera.addChild(weaponCam);

    // world
    this.level = new Level(this.app);

    // player controller (drives the main camera)
    this.player = new Player(camera, this.level.colliders);

    // weapon viewmodel
    this.weapon = new Weapon(this.app, weaponLayer.id, camera, weaponCam, this.level, () => {
      this.kills += 1;
    });
    this.weapon.onFire = (pitchKick, yawKick) => this.player.kick(pitchKick, yawKick);
  }

  // ------------------------------------------------------------------ input

  private bindInput() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('click', this.onCanvasClick);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') e.preventDefault();
    this.keys[e.code] = true;
    if (e.code === 'KeyR') this.weapon.startReload();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement === this.canvas) {
      this.lookDx += e.movementX;
      this.lookDy += e.movementY;
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (document.pointerLockElement === this.canvas && e.button === 0) {
      this.weapon.setTrigger(true);
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.weapon.setTrigger(false);
  };

  private onContextMenu = (e: MouseEvent) => e.preventDefault();

  private onCanvasClick = () => {
    this.weapon.unlockAudio();
    if (document.pointerLockElement !== this.canvas) {
      try {
        const req = this.canvas.requestPointerLock() as unknown;
        if (req instanceof Promise) req.catch(() => undefined);
      } catch {
        /* pointer lock unavailable — ignore */
      }
    }
  };

  private onPointerLockChange = () => {
    const locked = document.pointerLockElement === this.canvas;
    this.callbacks.onLockChange(locked);
    this.weapon.setTrigger(false);
    if (!locked) this.callbacks.onExit(); // Esc (or lost focus) -> back to menu
  };

  // -------------------------------------------------------------------- loop

  private update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);

    const input: InputState = {
      forward: !!this.keys['KeyW'],
      back: !!this.keys['KeyS'],
      left: !!this.keys['KeyA'],
      right: !!this.keys['KeyD'],
      sprint: !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']),
      jump: !!this.keys['Space'],
    };

    this.player.applyLook(this.lookDx, this.lookDy);
    this.player.update(dt, input);
    const lookDx = this.lookDx;
    const lookDy = this.lookDy;
    this.lookDx = 0;
    this.lookDy = 0;

    this.level.update(dt);

    this.weapon.update(dt, {
      speedFactor: Math.min(1, this.player.horizontalSpeed / 6),
      sprinting: this.player.isSprinting,
      lookDx: lookDx,
      lookDy: lookDy,
    });

    // subtle FOV punch while sprinting
    const targetFov = this.player.isSprinting ? 80 : 74;
    this.fov += (targetFov - this.fov) * Math.min(1, dt * 8);
    this.camComponent.fov = this.fov;

    // push stats to React only when something actually changed
    const stats: Stats = {
      health: Math.round(this.player.health),
      ammo: this.weapon.ammo,
      reserve: this.weapon.reserve,
      kills: this.kills,
      reloading: this.weapon.reloading,
    };
    const key = [stats.health, stats.ammo, stats.reserve, stats.kills, stats.reloading].join('|');
    if (key !== this.lastStatsKey) {
      this.lastStatsKey = key;
      this.callbacks.onStats(stats);
    }
  }

  // ---------------------------------------------------------------- teardown

  destroy() {
    this.app.off('update', this.update, this);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('click', this.onCanvasClick);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}

export default function GameCanvas({ onStats, onExit, onLockChange }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // PlayCanvas application bound directly to the raw canvas element
    const app = new pc.Application(canvas, {
      graphicsDeviceOptions: { antialias: true, powerPreference: 'high-performance' },
    });
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    (app.graphicsDevice as unknown as { maxPixelRatio: number }).maxPixelRatio = Math.min(
      window.devicePixelRatio || 1,
      2,
    );

    const game = new Game(app, canvas, { onStats, onExit, onLockChange });

    // manual sizing: the canvas always exactly fills its parent container
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) app.resizeCanvas(parent.clientWidth, parent.clientHeight);
    };
    resize();
    window.addEventListener('resize', resize);

    app.start();

    return () => {
      window.removeEventListener('resize', resize);
      game.destroy();
      app.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
