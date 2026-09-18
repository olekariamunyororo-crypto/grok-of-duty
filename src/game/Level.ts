import * as pc from 'playcanvas'

export function createLevel(app: pc.Application) {
  const concrete = makeMat(0.48, 0.5, 0.53)
  const darkConcrete = makeMat(0.28, 0.3, 0.33)
  const metal = makeMat(0.38, 0.4, 0.44)
  const rusty = makeMat(0.48, 0.32, 0.2)
  const sand = makeMat(0.58, 0.52, 0.4)
  const green = makeMat(0.25, 0.35, 0.22)

  const ground = box(app, 'Ground', 50, 0.4, 50, concrete)
  ground.setPosition(0, -0.2, 0)

  box(app, 'WallN', 52, 4, 1, darkConcrete).setPosition(0, 2, -25.5)
  box(app, 'WallS', 52, 4, 1, darkConcrete).setPosition(0, 2, 25.5)
  box(app, 'WallE', 1, 4, 52, darkConcrete).setPosition(25.5, 2, 0)
  box(app, 'WallW', 1, 4, 52, darkConcrete).setPosition(-25.5, 2, 0)

  box(app, 'BuildingA', 8, 5, 6, darkConcrete).setPosition(-8, 2.5, -6)
  box(app, 'BuildingB', 6, 4, 8, darkConcrete).setPosition(10, 2, 4)

  box(app, 'Container1', 6, 2.6, 2.5, metal).setPosition(-4, 1.3, 8)
  box(app, 'Container2', 6, 2.6, 2.5, rusty).setPosition(2, 1.3, 10)
  box(app, 'Container3', 2.5, 2.6, 6, metal).setPosition(12, 1.3, -8)

  box(app, 'Cover1', 4, 1.1, 0.6, sand).setPosition(0, 0.55, 0)
  box(app, 'Cover2', 0.6, 1.1, 3.5, sand).setPosition(-6, 0.55, 3)
  box(app, 'Cover3', 3.5, 1.1, 0.6, sand).setPosition(5, 0.55, -4)

  box(app, 'Crate1', 1.2, 1.2, 1.2, rusty).setPosition(-2, 0.6, 4)
  box(app, 'Crate2', 1.2, 1.2, 1.2, metal).setPosition(-0.8, 0.6, 4.5)
  box(app, 'Crate3', 1.2, 1.2, 1.2, rusty).setPosition(-1.5, 1.8, 4.2)

  box(app, 'TowerBase', 2.5, 6, 2.5, darkConcrete).setPosition(-14, 3, 12)
  box(app, 'TowerTop', 3.5, 0.4, 3.5, metal).setPosition(-14, 6.2, 12)

  box(app, 'Bush1', 2, 1.5, 2, green).setPosition(15, 0.75, 15)
  box(app, 'Bush2', 1.8, 1.3, 1.8, green).setPosition(-16, 0.65, -10)

  const ramp = box(app, 'Ramp', 4, 0.3, 6, concrete)
  ramp.setPosition(6, 1.2, -12)
  ramp.setLocalEulerAngles(-18, 0, 0)
  box(app, 'Platform', 5, 0.4, 4, concrete).setPosition(6, 2.4, -16)
}

function makeMat(r: number, g: number, b: number) {
  const mat = new pc.StandardMaterial()
  mat.diffuse = new pc.Color(r, g, b)
  mat.ambient = new pc.Color(r * 0.6, g * 0.6, b * 0.6)
  mat.specular = new pc.Color(0.1, 0.1, 0.1)
  mat.shininess = 25
  mat.useLighting = true
  mat.update()
  return mat
}

function box(
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
