import * as pc from 'playcanvas';
import type { AABB } from './Level';

const GRAVITY = -26;
const JUMP_SPEED = 8;
const WALK_SPEED = 6;
const SPRINT_SPEED = 9.2;
const GROUND_ACCEL = 12;
const AIR_ACCEL = 2.5;
const PLAYER_HEIGHT = 1.8;
const HALF_XZ = 0.35;
const EYE_HEIGHT = 1.62;
const STEP_HEIGHT = 0.55;
const MOUSE_SENS = 0.0023;
const RAD_TO_DEG = 180 / Math.PI;
const FALL_DAMAGE_SPEED = 13;

export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
}

/**
 * Custom FPS controller: velocity smoothing, gravity, jump, sprint and
 * axis-separated AABB collision (with automatic step-up) against the static
 * colliders registered by the Level. Drives the main camera each frame.
 */
export class Player {
  health = 100;

  private camera: pc.Entity;
  private colliders: AABB[];
  private pos = new pc.Vec3(0, 0.05, 28);
  private vel = new pc.Vec3(0, 0, 0);
  private wish = new pc.Vec3();
  private yaw = 0;
  private pitch = 0;
  private grounded = false;
  private wasGrounded = false;
  private sprinting = false;
  private bobPhase = 0;
  private landImpact = 0;
  private time = 0;
  private lastDamageAt = -99;

  constructor(camera: pc.Entity, colliders: AABB[]) {
    this.camera = camera;
    this.colliders = colliders;
    this.syncCamera(0);
  }

  get horizontalSpeed(): number {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  get isSprinting(): boolean {
    return this.sprinting;
  }

  /** Recoil kick from the weapon (radians). */
  kick(pitch: number, yaw: number) {
    this.pitch += pitch;
    this.yaw += yaw;
    this.clampPitch();
  }

  /** Consume accumulated mouse deltas (pixels). */
  applyLook(dx: number, dy: number) {
    if (dx === 0 && dy === 0) return;
    this.yaw -= dx * MOUSE_SENS;
    this.pitch -= dy * MOUSE_SENS;
    this.clampPitch();
  }

  update(dt: number, input: InputState) {
    this.time += dt;
    this.wasGrounded = this.grounded;

    // ---- desired move direction in world space
    const f = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const s = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.sprinting = input.sprint && f > 0;
    const speed = this.sprinting ? SPRINT_SPEED : WALK_SPEED;

    this.wish.set(0, 0, 0);
    if (f !== 0 || s !== 0) {
      const sinY = Math.sin(this.yaw);
      const cosY = Math.cos(this.yaw);
      this.wish.x = -sinY * f + cosY * s;
      this.wish.z = -cosY * f - sinY * s;
      this.wish.normalize();
      this.wish.scale(speed);
    }

    // ---- accelerate toward the wish velocity (snappy on ground, floaty in air)
    const k = 1 - Math.exp(-(this.wasGrounded ? GROUND_ACCEL : AIR_ACCEL) * dt);
    this.vel.x += (this.wish.x - this.vel.x) * k;
    this.vel.z += (this.wish.z - this.vel.z) * k;

    // ---- jump + gravity
    if (input.jump && this.wasGrounded) {
      this.vel.y = JUMP_SPEED;
      this.grounded = false;
    }
    this.vel.y = Math.max(-55, this.vel.y + GRAVITY * dt);

    // ---- integrate + collide, axis by axis
    this.grounded = false;
    this.moveAxis('x', this.vel.x * dt);
    this.moveAxis('z', this.vel.z * dt);
    this.moveVertical(dt);

    // ---- fall damage on hard landings
    if (this.grounded && this.landImpact > FALL_DAMAGE_SPEED) {
      this.takeDamage(Math.round((this.landImpact - FALL_DAMAGE_SPEED) * 5));
    }
    this.landImpact = 0;

    // ---- slow regen after 4s without damage
    if (this.health > 0 && this.health < 100 && this.time - this.lastDamageAt > 4) {
      this.health = Math.min(100, this.health + 10 * dt);
    }

    // ---- view bob + camera sync
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (this.grounded && hSpeed > 0.4) this.bobPhase += dt * (4 + hSpeed * 1.1);
    this.syncCamera(hSpeed);
  }

  takeDamage(amount: number) {
    if (amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.lastDamageAt = this.time;
  }

  // --------------------------------------------------------------- internals

  private clampPitch() {
    const lim = Math.PI / 2 - 0.02;
    if (this.pitch > lim) this.pitch = lim;
    if (this.pitch < -lim) this.pitch = -lim;
  }

  private syncCamera(hSpeed: number) {
    const bobAmt = this.grounded ? Math.min(1, hSpeed / WALK_SPEED) * 0.035 : 0;
    const bobY = Math.sin(this.bobPhase * 2) * bobAmt;
    this.camera.setPosition(this.pos.x, this.pos.y + EYE_HEIGHT + bobY, this.pos.z);
    this.camera.setEulerAngles(this.pitch * RAD_TO_DEG, this.yaw * RAD_TO_DEG, 0);
  }

  private moveAxis(axis: 'x' | 'z', delta: number) {
    this.pos[axis] += delta;
    for (const box of this.colliders) {
      if (!this.overlapsAt(this.pos.x, this.pos.y, this.pos.z, box)) continue;

      // auto step-up for stairs / ramps / small ledges
      const rise = box.max.y - this.pos.y;
      if (
        this.wasGrounded &&
        rise > 0 &&
        rise <= STEP_HEIGHT &&
        this.freeAt(this.pos.x, box.max.y + 0.002, this.pos.z)
      ) {
        this.pos.y = box.max.y + 0.002;
        this.grounded = true;
        continue;
      }

      // blocked — push back out along the moved axis
      if (delta > 0) this.pos[axis] = box.min[axis] - HALF_XZ - 0.002;
      else if (delta < 0) this.pos[axis] = box.max[axis] + HALF_XZ + 0.002;
      this.vel[axis] = 0;
    }
  }

  private moveVertical(dt: number) {
    const prevY = this.pos.y;
    this.pos.y += this.vel.y * dt;
    for (const box of this.colliders) {
      if (!this.overlapsAt(this.pos.x, this.pos.y, this.pos.z, box)) continue;
      if (this.vel.y <= 0 && prevY >= box.max.y - 0.01) {
        // landed on top of something
        this.landImpact = -this.vel.y;
        this.pos.y = box.max.y;
        this.vel.y = 0;
        this.grounded = true;
      } else if (this.vel.y > 0 && prevY + PLAYER_HEIGHT <= box.min.y + 0.01) {
        // bumped a ceiling
        this.pos.y = box.min.y - PLAYER_HEIGHT - 0.002;
        this.vel.y = 0;
      }
    }
  }

  private overlapsAt(px: number, feetY: number, pz: number, box: AABB): boolean {
    return (
      px + HALF_XZ > box.min.x && px - HALF_XZ < box.max.x &&
      feetY + PLAYER_HEIGHT > box.min.y && feetY < box.max.y &&
      pz + HALF_XZ > box.min.z && pz - HALF_XZ < box.max.z
    );
  }

  private freeAt(px: number, feetY: number, pz: number): boolean {
    for (const box of this.colliders) {
      if (this.overlapsAt(px, feetY, pz, box)) return false;
    }
    return true;
  }
}
