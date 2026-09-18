import * as pc from 'playcanvas';
import { rayAABB, type Level, type Target } from './Level';

const FIRE_INTERVAL = 60 / 600; // 600 RPM
const MAG_SIZE = 30;
const START_RESERVE = 90;
const RELOAD_TIME = 1.7;
const RANGE = 200;

interface Effect {
  ent: pc.Entity;
  life: number;
  maxLife: number;
  scale: pc.Vec3;
}

/**
 * Tiny procedural WebAudio SFX — zero asset files required.
 */
class Sfx {
  private ctx: AudioContext | null = null;

  resume() {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      }
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      /* audio unavailable — stay silent */
    }
  }

  private noiseBurst(duration: number, cutoff: number, volume: number, decay: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  private blip(fromHz: number, toHz: number, duration: number, volume: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(fromHz, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  shot() {
    this.noiseBurst(0.13, 2800, 0.3, 2.4);
    this.blip(150, 42, 0.1, 0.2);
  }

  reload() {
    this.blip(700, 500, 0.05, 0.1, 0.1);
    this.blip(500, 900, 0.06, 0.1, 0.9);
    this.blip(900, 600, 0.05, 0.12, 1.45);
  }

  targetHit() {
    this.blip(1300, 320, 0.18, 0.18);
  }
}

/**
 * First-person weapon: assembled from box primitives, mounted on a dedicated
 * viewmodel camera. Full-auto hitscan firing, recoil, muzzle flash (mesh +
 * point light), tracers, impact sparks and a dip-down reload animation.
 */
export class Weapon {
  ammo = MAG_SIZE;
  reserve = START_RESERVE;
  reloading = false;
  onFire?: (pitchKick: number, yawKick: number) => void;

  private app: pc.Application;
  private weaponLayerId: number;
  private aimCamera: pc.Entity;
  private level: Level;
  private onKill: () => void;
  private sfx = new Sfx();

  private root!: pc.Entity;
  private flash!: pc.Entity;
  private flashLight!: pc.Entity;
  private tracerMat!: pc.StandardMaterial;
  private sparkMat!: pc.StandardMaterial;
  private effects: Effect[] = [];

  private triggerDown = false;
  private cooldown = 0;
  private reloadT = 0;
  private recoil = 0;
  private flashTimer = 0;
  private swayX = 0;
  private swayY = 0;
  private bobPhase = 0;
  private rayDir = new pc.Vec3();
  private hitPoint = new pc.Vec3();
  private basePos = new pc.Vec3(0.155, -0.15, -0.3);

  constructor(
    app: pc.Application,
    weaponLayerId: number,
    aimCamera: pc.Entity,
    mount: pc.Entity,
    level: Level,
    onKill: () => void,
  ) {
    this.app = app;
    this.weaponLayerId = weaponLayerId;
    this.aimCamera = aimCamera;
    this.level = level;
    this.onKill = onKill;

    const gunmetal = this.mat('#33363c', 0.55);
    const polymer = this.mat('#26282c', 0.1);
    const olive = this.mat('#4c563c');
    const tan = this.mat('#7d7259');

    // assault rifle from box primitives — muzzle points down local -Z
    this.root = new pc.Entity('WeaponRoot');
    mount.addChild(this.root);
    this.part([0, 0, -0.02], [0.055, 0.078, 0.44], gunmetal);      // receiver / body
    this.part([0, 0.012, -0.34], [0.03, 0.03, 0.28], gunmetal);    // barrel
    this.part([0, 0.004, -0.24], [0.052, 0.058, 0.2], polymer);    // handguard
    this.part([0, -0.004, 0.24], [0.045, 0.072, 0.18], polymer);   // stock
    this.part([0, -0.085, 0.075], [0.04, 0.1, 0.05], polymer, 12); // grip
    this.part([0, -0.1, -0.06], [0.038, 0.14, 0.062], olive, 8);   // magazine
    this.part([0, 0.052, -0.1], [0.024, 0.02, 0.2], gunmetal);     // top rail
    this.part([0, 0.068, 0], [0.03, 0.036, 0.024], gunmetal);      // rear sight
    this.part([0, 0.068, -0.2], [0.012, 0.034, 0.012], tan);       // front sight post

    // muzzle flash mesh (additive emissive)
    const flashMat = new pc.StandardMaterial();
    flashMat.diffuse = new pc.Color(0, 0, 0);
    flashMat.emissive = pc.Color.fromString('#ffd27a');
    flashMat.emissiveIntensity = 3;
    flashMat.blendType = pc.BLEND_ADDITIVE;
    flashMat.update();

    this.flash = new pc.Entity('MuzzleFlash');
    this.flash.addComponent('render', {
      type: 'box',
      material: flashMat,
      castShadows: false,
      layers: [weaponLayerId],
    });
    this.flash.setLocalPosition(0, 0.012, -0.5);
    this.flash.enabled = false;
    this.root.addChild(this.flash);

    // muzzle flash point light — also lights the world
    this.flashLight = new pc.Entity('MuzzleLight');
    this.flashLight.addComponent('light', {
      type: 'point',
      color: pc.Color.fromString('#ffca7a'),
      intensity: 3.2,
      range: 9,
      layers: [pc.LAYERID_WORLD, weaponLayerId],
    });
    this.flashLight.setLocalPosition(0, 0.02, -0.5);
    this.flashLight.enabled = false;
    this.root.addChild(this.flashLight);

    // shared effect materials
    this.tracerMat = this.glowMat('#ffcf7f');
    this.sparkMat = this.glowMat('#ffe2a0');
  }

  // -------------------------------------------------------------- public API

  setTrigger(down: boolean) {
    this.triggerDown = down;
  }

  unlockAudio() {
    this.sfx.resume();
  }

  startReload() {
    if (this.reloading || this.reserve <= 0 || this.ammo >= MAG_SIZE) return;
    this.reloading = true;
    this.reloadT = 0;
    this.sfx.reload();
  }

  update(
    dt: number,
    ctx: { speedFactor: number; sprinting: boolean; lookDx: number; lookDy: number },
  ) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.triggerDown) this.tryFire();

    // reload dip animation
    let reloadDip = 0;
    let reloadRot = 0;
    if (this.reloading) {
      this.reloadT += dt;
      if (this.reloadT >= RELOAD_TIME) {
        this.reloading = false;
        const take = Math.min(MAG_SIZE - this.ammo, this.reserve);
        this.ammo += take;
        this.reserve -= take;
      } else {
        const s = Math.sin(Math.PI * (this.reloadT / RELOAD_TIME));
        reloadDip = -0.17 * s;
        reloadRot = -42 * s;
      }
    }

    // recoil recovery + flash timeout
    this.recoil = Math.max(0, this.recoil - dt * 7);
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flash.enabled = false;
        this.flashLight.enabled = false;
      }
    }

    // mouse sway + walk bob + sprint pose, composed into the final transform
    const swayK = Math.min(1, dt * 10);
    this.swayX += (-ctx.lookDx * 0.00045 - this.swayX) * swayK;
    this.swayY += (-ctx.lookDy * 0.00045 - this.swayY) * swayK;
    this.bobPhase += dt * (3 + ctx.speedFactor * 9);
    const bobX = Math.cos(this.bobPhase) * 0.006 * ctx.speedFactor;
    const bobY = Math.sin(this.bobPhase * 2) * 0.005 * ctx.speedFactor;
    const sprintDip = ctx.sprinting ? 0.05 : 0;
    const r = this.recoil;

    this.root.setLocalPosition(
      this.basePos.x + this.swayX + bobX,
      this.basePos.y + this.swayY + bobY + reloadDip - sprintDip,
      this.basePos.z + r * 0.05,
    );
    this.root.setLocalEulerAngles(reloadRot + r * 6, this.swayX * 80, this.swayX * -40);

    this.updateEffects(dt);
  }

  // ------------------------------------------------------------------ firing

  private tryFire() {
    if (this.reloading || this.cooldown > 0) return;
    if (this.ammo <= 0) {
      this.startReload(); // dry -> auto reload
      return;
    }

    this.cooldown = FIRE_INTERVAL;
    this.ammo -= 1;
    this.recoil = Math.min(1.4, this.recoil + 0.5);

    // muzzle flash
    this.flashTimer = 0.045;
    this.flash.enabled = true;
    this.flashLight.enabled = true;
    this.flash.setLocalEulerAngles(0, 0, Math.random() * 360);
    const fs = 0.8 + Math.random() * 0.6;
    this.flash.setLocalScale(0.1 * fs, 0.1 * fs, 0.16 * fs);

    // camera kick + punchy sfx
    this.onFire?.(0.004 + Math.random() * 0.002, (Math.random() - 0.5) * 0.0025);
    this.sfx.shot();

    // hitscan ray from the main camera through the crosshair, with slight spread
    this.rayDir.copy(this.aimCamera.forward).normalize();
    this.rayDir.x += (Math.random() - 0.5) * 0.004;
    this.rayDir.y += (Math.random() - 0.5) * 0.004;
    this.rayDir.normalize();

    const origin = this.aimCamera.getPosition();
    let bestT = RANGE;
    let hitTarget: Target | null = null;

    for (const box of this.level.colliders) {
      const t = rayAABB(origin, this.rayDir, box);
      if (t !== null && t < bestT) {
        bestT = t;
        hitTarget = null;
      }
    }
    for (const target of this.level.targets) {
      if (!target.alive) continue;
      const t = rayAABB(origin, this.rayDir, { min: target.hitMin, max: target.hitMax });
      if (t !== null && t < bestT) {
        bestT = t;
        hitTarget = target;
      }
    }

    this.hitPoint.copy(this.rayDir).scale(bestT).add(origin);
    this.spawnTracer(this.flash.getPosition(), this.hitPoint);

    if (hitTarget) {
      hitTarget.alive = false;
      hitTarget.respawnTimer = 3.2;
      this.onKill();
      this.sfx.targetHit();
    } else if (bestT < RANGE) {
      this.spawnSpark(this.hitPoint);
    }
  }

  // ----------------------------------------------------------------- effects

  private spawnTracer(from: pc.Vec3, to: pc.Vec3) {
    const len = Math.max(0.01, Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z));
    const e = new pc.Entity('Tracer');
    e.addComponent('render', { type: 'box', material: this.tracerMat, castShadows: false });
    e.setLocalScale(0.014, 0.014, len);
    e.setPosition(from);
    e.lookAt(to);
    this.app.root.addChild(e);
    this.effects.push({ ent: e, life: 0.06, maxLife: 0.06, scale: new pc.Vec3(0.014, 0.014, len) });
  }

  private spawnSpark(at: pc.Vec3) {
    const e = new pc.Entity('Spark');
    e.addComponent('render', { type: 'box', material: this.sparkMat, castShadows: false });
    e.setPosition(at);
    e.setLocalScale(0.09, 0.09, 0.09);
    this.app.root.addChild(e);
    this.effects.push({ ent: e, life: 0.12, maxLife: 0.12, scale: new pc.Vec3(0.09, 0.09, 0.09) });
  }

  private updateEffects(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      if (fx.life <= 0) {
        this.app.root.removeChild(fx.ent);
        fx.ent.destroy();
        this.effects.splice(i, 1);
      } else {
        const k = Math.max(0.001, fx.life / fx.maxLife);
        fx.ent.setLocalScale(fx.scale.x * k, fx.scale.y * k, fx.scale.z * k);
      }
    }
  }

  // ------------------------------------------------------------------- parts

  private part(pos: number[], scale: number[], mat: pc.StandardMaterial, rotX = 0) {
    const e = new pc.Entity('Part');
    e.addComponent('render', {
      type: 'box',
      material: mat,
      castShadows: false,
      layers: [this.weaponLayerId],
    });
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    e.setLocalScale(scale[0], scale[1], scale[2]);
    if (rotX !== 0) e.setLocalEulerAngles(rotX, 0, 0);
    this.root.addChild(e);
    return e;
  }

  private mat(hex: string, metalness = 0): pc.StandardMaterial {
    const m = new pc.StandardMaterial();
    m.diffuse = pc.Color.fromString(hex);
    if (metalness > 0) {
      m.useMetalness = true;
      m.metalness = metalness;
    }
    m.update();
    return m;
  }

  private glowMat(hex: string): pc.StandardMaterial {
    const m = new pc.StandardMaterial();
    m.diffuse = new pc.Color(0, 0, 0);
    m.emissive = pc.Color.fromString(hex);
    m.emissiveIntensity = 2.5;
    m.blendType = pc.BLEND_ADDITIVE;
    m.depthWrite = false;
    m.update();
    return m;
  }
}
