import * as pc from 'playcanvas'

/**
 * Creates a simple but solid-looking military test map.
 * Concrete floors, containers, cover, and some structures.
 */
export function createLevel(app: pc.Application) {
  // Materials
  const concrete = createMaterial(app, new pc.Color(0.45, 0.47, 0.5))
  const darkConcrete = createMaterial(app, new pc.Color(0.28, 0.3, 0.33))
  const metal = createMaterial(app, new pc.Color(0.35, 0.38, 0.42))
  const rusty = createMaterial(app, new pc.Color(0.42, 0.28, 0.18))
  const sand = createMaterial(app, new pc.Color(0.55, 0.5, 0.4))
  const green = createMaterial(app, new pc.Color(0.22, 0.32, 0.2))

  // Ground
  const ground = createBox(app, 'Ground', 50, 0.4, 50, concrete)
  ground.setPosition(0, -0.2, 0)

  // Outer walls / boundaries
  createBox(app, 'WallN', 52, 4, 1, darkConcrete).setPosition(0, 2, -25.5)
  createBox(app, 'WallS', 52, 4, 1, darkConcrete).setPosition(0, 2, 25.5)
  createBox(app, 'WallE', 1, 4, 52, darkConcrete).setPosition(25.5, 2, 0)
  createBox(app, 'WallW', 1, 4, 52, darkConcrete).setPosition(-25.5, 2, 0)

  // Central compound
  createBox(app, 'BuildingA', 8, 5, 6, darkConcrete).setPosition(-8, 2.5, -6)
  createBox(app, 'BuildingB', 6, 4, 8, darkConcrete).setPosition(10, 2, 4)

  // Cover - shipping containers
  createBox(app, 'Container1', 6, 2.6, 2.5, metal).setPosition(-4, 1.3, 8)
  createBox(app, 'Container2', 6, 2.6, 2.5, rusty).setPosition(2, 1.3, 10)
  createBox(app, 'Container3', 2.5, 2.6, 6, metal).setPosition(12, 1.3, -8)

  // Low walls / sandbags style cover
  createBox(app, 'Cover1', 4, 1.1, 0.6, sand).setPosition(0, 0.55, 0)
  createBox(app, 'Cover2', 0.6, 1.1, 3.5, sand).setPosition(-6, 0.55, 3)
  createBox(app, 'Cover3', 3.5, 1.1, 0.6, sand).setPosition(5, 0.55, -4)

  // Crates
  createBox(app, 'Crate1', 1.2, 1.2, 1.2, rusty).setPosition(-2, 0.6, 4)
  createBox(app, 'Crate2', 1.2, 1.2, 1.2, metal).setPosition(-0.8, 0.6, 4.5)
  createBox(app, 'Crate3', 1.2, 1.2, 1.2, rusty).setPosition(-1.5, 1.8, 4.2)

  // Watchtower-ish structure
  createBox(app, 'TowerBase', 2.5, 6, 2.5, darkConcrete).setPosition(-14, 3, 12)
  createBox(app, 'TowerTop', 3.5, 0.4, 3.5, metal).setPosition(-14, 6.2, 12)

  // Some greenery blocks for visual interest
  createBox(app, 'Bush1', 2, 1.5, 2, green).setPosition(15, 0.75, 15)
  createBox(app, 'Bush2', 1.8, 1.3, 1.8, green).setPosition(-16, 0.65, -10)

  // Ramp / elevated platform
  const ramp = createBox(app, 'Ramp', 4, 0.3, 6, concrete)
  ramp.setPosition(6, 1.2, -12)
  ramp.setLocalEulerAngles(-18, 0, 0)

  createBox(app, 'Platform', 5, 0.4, 4, concrete).setPosition(6, 2.4, -16)
}

function createMaterial(app: pc.Application, color: pc.Color) {
  const mat = new pc.StandardMaterial()
  mat.diffuse = color
  mat.specular = new pc.Color(0.08, 0.08, 0.08)
  mat.shininess = 20
  mat.update()
  return mat
}

function createBox(
  app: pc.Application,
  name: string,
  w: number,
  h: number,
  d: number,
  material: pc.StandardMaterial
) {
  const entity = new pc.Entity(name)
  entity.addComponent('render', {
    type: 'box',
    material,
  })
  entity.setLocalScale(w, h, d)
  app.root.addChild(entity)
  return entity
}
