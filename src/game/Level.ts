import * as pc from 'playcanvas';

export interface AABB {
  min: pc.Vec3;
  max: pc.Vec3;
}

export interface Target {
  root: pc.Entity;
  hitMin: pc.Vec3;
  hitMax: pc.Vec3;
  alive: boolean;
  fallT: number;
  respawnTimer: number;
}

const v = (x: number, y: number, z: number) => new pc.Vec3(x, y, z);
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

function aabbFrom(center: pc.Vec3, size: pc.Vec3): AABB {
  return {
    min: v(center.x - size.x / 2, center.y - size.y / 2, center.z - size.z / 2),
    max: v(center.x + size.x / 2, center.y + size.y / 2, center.z + size.z / 2),
  };
}

/** Slab-method ray vs AABB. Returns hit distance or null. */
export function rayAABB(origin: pc.Vec3, dir: pc.Vec3, box: AABB): number | null {
  let tmin = 0;
  let tmax = Number.POSITIVE_INFINITY;
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const mn = [box.min.x, box.min.y, box.min.z];
  const mx = [box.max.x, box.max.y, box.max.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mn[i] || o[i] > mx[i]) return null;
    } else {
      const inv = 1 / d[i];
      let t1 = (mn[i] - o[i]) * inv;
      let t2 = (mx[i] - o[i]) * inv;
      if (t1 > t2) {
        const tt = t1;
        t1 = t2;
        t2 = tt;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

/**
 * Builds the whole test map out of box/cylinder primitives and registers a
 * static AABB collider for every solid piece (used by both the player
 * controller and the weapon hitscan).
 */
export class Level {
  colliders: AABB[] = [];
  targets: Target[] = [];

  constructor(private app: pc.Application) {
    this.build();
  }

  /** Animates pop-up targets falling over and respawning. */
  update(dt: number) {
    for (const t of this.targets) {
      if (t.alive) continue;
      if (t.fallT < 1) {
        t.fallT = Math.min(1, t.fallT + dt * 5);
      } else {
        t.respawnTimer -= dt;
        if (t.respawnTimer <= 0) t.fallT = Math.max(0, t.fallT - dt * 3);
        if (t.fallT <= 0) t.alive = true;
      }
      t.root.setLocalEulerAngles(-90 * easeOutQuad(t.fallT), 0, 0);
    }
  }

  // ------------------------------------------------------------------- build

  private build() {
    const app = this.app;
    const concrete = this.mat('#969992');
    const concreteDk = this.mat('#666a66');
    const wall = this.mat('#787b72');
    const steel = this.mat('#5b636c', 0.5);
    const red = this.mat('#a13c2f');
    const blue = this.mat('#33607c');
    const green = this.mat('#4f6040');
    const sand = this.mat('#b39c72');
    const wood = this.mat('#8a6a44');
    const woodDk = this.mat('#6b5232');
    const white = this.mat('#d8d8d0');
    const olive = this.mat('#5d6b46');
    const targetRed = this.mat('#c0392b');

    // ---------------------------- ground ----------------------------
    this.box(v(0, -0.25, 0), v(80, 0.5, 80), concrete);
    // cosmetic ground markings (no collision)
    this.box(v(0, 0.01, 28), v(8, 0.02, 0.35), white, false);
    this.box(v(0, 0.01, 24), v(8, 0.02, 0.35), white, false);
    this.box(v(0, 0.01, -20), v(14, 0.02, 0.35), white, false);

    // ------------------------- boundary walls ------------------------
    this.box(v(0, 3, -39.5), v(80, 6, 1), wall);
    this.box(v(0, 3, 39.5), v(80, 6, 1), wall);
    this.box(v(-39.5, 3, 0), v(1, 6, 78), wall);
    this.box(v(39.5, 3, 0), v(1, 6, 78), wall);

    // ------------------- central building ("kill house") -------------
    const bh = 3.4; // wall height
    const t = 0.3; // wall thickness
    const x0 = -16;
    const x1 = -6;
    const z0 = -6;
    const z1 = 2;
    this.box(v((x0 + x1) / 2, bh / 2, z0), v(x1 - x0 + t, bh, t), wall); // north
    // south wall with a 2.2m doorway at x = -11
    this.box(v(-14.05, bh / 2, z1), v(3.9, bh, t), wall);
    this.box(v(-7.95, bh / 2, z1), v(3.9, bh, t), wall);
    this.box(v(-11, (bh + 2.3) / 2, z1), v(2.2, bh - 2.3, t), wall); // lintel
    this.box(v(x0, bh / 2, (z0 + z1) / 2), v(t, bh, z1 - z0 + t), wall); // west
    this.box(v(x1, bh / 2, (z0 + z1) / 2), v(t, bh, z1 - z0 + t), wall); // east
    this.box(
      v((x0 + x1) / 2, bh + 0.15, (z0 + z1) / 2),
      v(x1 - x0 + 0.6, 0.3, z1 - z0 + 0.6),
      concreteDk,
    ); // roof

    // interior point light so the building is never a black box
    const lamp = new pc.Entity('BuildingLamp');
    lamp.addComponent('light', {
      type: 'point',
      color: pc.Color.fromString('#ffe2b0'),
      intensity: 0.9,
      range: 15,
    });
    lamp.setPosition(-11, 2.9, -2);
    app.root.addChild(lamp);

    // -------------------------- containers ---------------------------
    this.box(v(14, 1.3, 4), v(2.5, 2.6, 6.2), red);
    this.box(v(14, 3.9, 4), v(2.5, 2.6, 6.2), green); // stacked
    this.box(v(17.8, 1.3, -3), v(6.2, 2.6, 2.5), blue);
    this.box(v(23, 1.3, 10), v(6.2, 2.6, 2.5), red);

    // -------------------------- sandbag cover ------------------------
    this.sandbagWall(sand, 0, 18, 5, true);
    this.sandbagWall(sand, -8, 10, 4, true);
    this.sandbagWall(sand, 8, 8, 4, true);
    this.sandbagWall(sand, -20, 8, 5, true);
    this.sandbagWall(sand, 26, -6, 4, false);

    // ---------------------------- crates -----------------------------
    this.box(v(4, 0.5, -6), v(1, 1, 1), wood);
    this.box(v(5.15, 0.5, -6.35), v(1, 1, 1), woodDk);
    this.box(v(4.55, 1.5, -6.2), v(1, 1, 1), wood); // stacked
    this.box(v(3.1, 0.4, -4.7), v(0.8, 0.8, 0.8), woodDk);
    this.box(v(-3, 0.5, -12), v(1, 1, 1), wood);
    this.box(v(-2, 0.4, -12.4), v(0.8, 0.8, 0.8), wood);

    // -------------------------- oil drums ----------------------------
    this.drum(10.8, 6.4, steel);
    this.drum(11.4, 5.6, olive, 0.95);
    this.drum(6.6, -4.6, olive);
    this.drum(21.5, 7.6, steel, 1.05);

    // ----------------------- jersey barriers -------------------------
    this.box(v(-1.8, 0.55, 0), v(3.2, 1.1, 0.55), concreteDk);
    this.box(v(2.4, 0.55, -3), v(3.2, 1.1, 0.55), concreteDk);

    // ---------------------- elevated platform ------------------------
    const platTop = 2.625;
    this.box(v(16, platTop - 0.175, -16), v(8, 0.35, 8), concreteDk);
    this.box(v(12.7, 1.15, -12.7), v(0.5, 2.3, 0.5), steel);
    this.box(v(19.3, 1.15, -12.7), v(0.5, 2.3, 0.5), steel);
    this.box(v(12.7, 1.15, -19.3), v(0.5, 2.3, 0.5), steel);
    this.box(v(19.3, 1.15, -19.3), v(0.5, 2.3, 0.5), steel);

    // ramp: rotated slab for looks, invisible stacked steps for collision
    const run = 6.3;
    const rise = platTop;
    const angle = (Math.atan2(rise, run) * 180) / Math.PI;
    const rampLen = Math.hypot(run, rise) + 0.3;
    this.box(v(16, rise / 2, -9.15), v(3, 0.22, rampLen), steel, false, angle);
    const steps = 9;
    for (let i = 0; i < steps; i++) {
      const zMid = -6 - (i + 0.5) * (run / steps);
      const top = ((i + 1) / steps) * rise;
      this.colliders.push({
        min: v(14.5, 0, zMid - run / steps / 2),
        max: v(17.5, top, zMid + run / steps / 2),
      });
    }

    // -------------------------- watchtower ---------------------------
    const tx = -26;
    const tz = -26;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.box(v(tx + sx * 1.4, 2.5, tz + sz * 1.4), v(0.28, 5, 0.28), woodDk);
      }
    }
    this.box(v(tx, 5.05, tz), v(3.6, 0.25, 3.6), wood); // platform
    this.box(v(tx, 5.75, tz - 1.65), v(3.4, 0.1, 0.1), wood); // railings
    this.box(v(tx, 5.75, tz + 1.65), v(3.4, 0.1, 0.1), wood);
    this.box(v(tx - 1.65, 5.75, tz), v(0.1, 0.1, 3.4), wood);
    this.box(v(tx + 1.65, 5.75, tz), v(0.1, 0.1, 3.4), wood);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.box(v(tx + sx * 1.65, 5.55, tz + sz * 1.65), v(0.09, 0.7, 0.09), woodDk);
        this.box(v(tx + sx * 1.5, 6.4, tz + sz * 1.5), v(0.12, 1.5, 0.12), woodDk);
      }
    }
    this.box(v(tx, 7.2, tz), v(4.3, 0.2, 4.3), olive); // roof
    for (let i = 0; i < 9; i++) {
      this.box(v(tx, 0.55 + i * 0.55, tz + 1.55), v(0.7, 0.07, 0.07), wood, false); // ladder rungs
    }

    // ------------------------ pop-up targets -------------------------
    for (const x of [-12, -6, 0, 6, 12]) {
      this.addTarget(targetRed, white, woodDk, x, -32);
    }
    this.addTarget(targetRed, white, woodDk, 28, -18);
  }

  // ----------------------------------------------------------------- helpers

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

  private box(
    center: pc.Vec3,
    size: pc.Vec3,
    mat: pc.Material,
    collide = true,
    rotX = 0,
  ): pc.Entity {
    const e = new pc.Entity('Box');
    e.addComponent('render', { type: 'box', material: mat });
    e.setPosition(center);
    e.setLocalScale(size);
    if (rotX !== 0) e.setLocalEulerAngles(rotX, 0, 0);
    this.app.root.addChild(e);
    if (collide && rotX === 0) this.colliders.push(aabbFrom(center, size));
    return e;
  }

  private drum(x: number, z: number, mat: pc.Material, s = 1) {
    const e = new pc.Entity('Drum');
    e.addComponent('render', { type: 'cylinder', material: mat });
    e.setPosition(x, 0.45 * s, z);
    e.setLocalScale(0.62 * s, 0.9 * s, 0.62 * s);
    this.app.root.addChild(e);
    this.colliders.push(aabbFrom(v(x, 0.45 * s, z), v(0.64 * s, 0.9 * s, 0.64 * s)));
  }

  private sandbagWall(
    mat: pc.Material,
    x: number,
    z: number,
    length: number,
    alongX: boolean,
  ) {
    const bagW = 0.55;
    const bagH = 0.26;
    const bagD = 0.5;
    const rows = 3;
    const cols = Math.ceil(length / bagW);
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (bagW / 2);
      for (let c = 0; c <= cols; c++) {
        const along = -length / 2 + c * bagW + off;
        const px = alongX ? x + along : x;
        const pz = alongX ? z : z + along;
        this.box(
          v(px, bagH / 2 + r * bagH, pz),
          alongX ? v(bagW, bagH, bagD) : v(bagD, bagH, bagW),
          mat,
          false, // one merged collider below instead of per-bag
        );
      }
    }
    const size = alongX
      ? v(length + bagW, rows * bagH, bagD)
      : v(bagD, rows * bagH, length + bagW);
    this.colliders.push(aabbFrom(v(x, (rows * bagH) / 2, z), size));
  }

  private addTarget(
    red: pc.Material,
    white: pc.Material,
    post: pc.Material,
    x: number,
    z: number,
  ) {
    const root = new pc.Entity('Target');
    root.setPosition(x, 0, z);

    const pole = new pc.Entity('Pole');
    pole.addComponent('render', { type: 'box', material: post });
    pole.setLocalPosition(0, 0.6, 0);
    pole.setLocalScale(0.12, 1.2, 0.12);
    root.addChild(pole);

    const plate = new pc.Entity('Plate');
    plate.addComponent('render', { type: 'box', material: red });
    plate.setLocalPosition(0, 1.55, 0);
    plate.setLocalScale(0.7, 0.7, 0.1);
    root.addChild(plate);

    const ring = new pc.Entity('Ring');
    ring.addComponent('render', { type: 'box', material: white });
    ring.setLocalPosition(0, 1.55, 0.06);
    ring.setLocalScale(0.32, 0.32, 0.02);
    root.addChild(ring);

    this.app.root.addChild(root);
    this.targets.push({
      root: root,
      hitMin: v(x - 0.42, 1.12, z - 0.3),
      hitMax: v(x + 0.42, 1.98, z + 0.3),
      alive: true,
      fallT: 0,
      respawnTimer: 0,
    });
  }
}
